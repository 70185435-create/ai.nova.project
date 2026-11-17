require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const crypto = require("crypto");
const db = require("./db");
const { requireAuth, requireAdmin, verifyLogin } = require("./auth");
const { convertTranscript, validateDraft } = require("./ai");

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(session({
  name: "novaworks.sid",
  secret: process.env.SESSION_SECRET || "dev-only-change-this-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 8 * 60 * 60 * 1000 }
}));

app.post("/api/login", (req,res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
  const user = verifyLogin(email, password);
  if (!user) return res.status(401).json({ error: "Incorrect email or password." });
  req.session.userId = user.id;
  res.json({ user: { id:user.id, name:user.name, email:user.email, role:user.role, specialization:user.specialization } });
});
app.post("/api/logout", (req,res) => req.session.destroy(() => res.json({ ok:true })));
app.get("/api/me", requireAuth, (req,res) => res.json({ user:req.user }));

app.get("/api/team", requireAuth, (req,res) => {
  const rows = db.prepare("SELECT id,name,email,role,specialization,skills FROM users ORDER BY role,id").all();
  res.json(rows.map(u => ({...u, skills:u.skills.split(",").map(s=>s.trim())})));
});

function visibleProjectWhere(user) {
  if (user.role === "ADMIN") return { sql: "1=1", args: [] };
  if (user.role === "MANAGER") return { sql: "p.manager_id=?", args: [user.id] };
  return { sql: "EXISTS (SELECT 1 FROM tasks tx WHERE tx.project_id=p.id AND tx.assignee_id=?)", args: [user.id] };
}
function getProjectsFor(user) {
  const filter = visibleProjectWhere(user);
  const rows = db.prepare(`
    SELECT p.*, u.name AS manager_name,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.id ${user.role==="AGENT" ? "AND t.assignee_id=?" : ""}) AS task_count
    FROM projects p JOIN users u ON u.id=p.manager_id
    WHERE ${filter.sql} ORDER BY p.deadline ASC
  `).all(...filter.args, ...(user.role==="AGENT" ? [user.id] : []));
  return rows;
}
app.get("/api/projects", requireAuth, (req,res) => res.json(getProjectsFor(req.user)));

app.get("/api/projects/:id", requireAuth, (req,res) => {
  const filter = visibleProjectWhere(req.user);
  const project = db.prepare(`
    SELECT p.*, u.name AS manager_name, u.id AS manager_id
    FROM projects p JOIN users u ON u.id=p.manager_id
    WHERE p.id=? AND (${filter.sql})
  `).get(req.params.id, ...filter.args);
  if (!project) return res.status(404).json({ error:"Project not found or access denied." });
  const tasks = db.prepare(`
    SELECT t.*, u.name AS assignee_name, u.id AS assignee_id
    FROM tasks t JOIN users u ON u.id=t.assignee_id
    WHERE t.project_id=? ${req.user.role==="AGENT" ? "AND t.assignee_id=?" : ""}
    ORDER BY t.deadline ASC
  `).all(req.params.id, ...(req.user.role==="AGENT" ? [req.user.id] : []));
  res.json({ ...project, tasks });
});

app.get("/api/tasks", requireAuth, (req,res) => {
  let sql = `SELECT t.*, p.name AS project_name, p.client_name, p.manager_id,
    m.name AS manager_name, u.name AS assignee_name
    FROM tasks t JOIN projects p ON p.id=t.project_id
    JOIN users m ON m.id=p.manager_id JOIN users u ON u.id=t.assignee_id`;
  const args = [];
  if (req.user.role === "MANAGER") { sql += " WHERE p.manager_id=?"; args.push(req.user.id); }
  if (req.user.role === "AGENT") { sql += " WHERE t.assignee_id=?"; args.push(req.user.id); }
  sql += " ORDER BY t.deadline ASC";
  res.json(db.prepare(sql).all(...args));
});

app.post("/api/transcript", requireAuth, requireAdmin, async (req,res) => {
  const transcript = String(req.body?.transcript || "").trim();
  if (!transcript) return res.status(400).json({ error:"Paste a meeting transcript first." });
  try {
    const draft = await convertTranscript(transcript);
    const errors = validateDraft(draft);
    if (errors.length) return res.status(422).json({ error:"The AI draft needs correction. Nothing was saved.", details:errors });
    const create = db.transaction(() => {
      const created = [];
      for (const p of draft.projects) {
        const projectId = crypto.randomUUID();
        db.prepare("INSERT INTO projects(id,name,client_name,description,manager_id,deadline) VALUES(?,?,?,?,?,?)")
          .run(projectId,p.name,p.clientName,p.description || "",p.managerId,p.deadline);
        for (const t of p.tasks) {
          db.prepare("INSERT INTO tasks(id,project_id,title,description,assignee_id,deadline,estimated_hours) VALUES(?,?,?,?,?,?,?)")
            .run(crypto.randomUUID(),projectId,t.title,t.description || "",t.assigneeId,t.deadline,Number(t.estimatedHours));
        }
        created.push({ id:projectId, name:p.name, taskCount:p.tasks.length });
      }
      return created;
    });
    const created = create();
    res.json({ message:"Projects and tasks saved successfully.", projects:created, totalTasks:created.reduce((n,p)=>n+p.taskCount,0) });
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).json({ error:error.message || "Transcript processing failed." });
  }
});

if (process.env.NODE_ENV === "production") {
  const dist = path.join(__dirname,"..","dist");
  app.use(express.static(dist));
  app.get("*",(req,res)=>res.sendFile(path.join(dist,"index.html")));
}
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`NovaWorks API running on http://localhost:${port}`));
