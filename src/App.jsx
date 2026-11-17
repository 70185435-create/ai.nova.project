import React, { useEffect, useState } from "react";
import { Routes, Route, NavLink, useNavigate, useParams } from "react-router-dom";
import { api } from "./api";

const DEMO_TRANSCRIPT = `Meeting: NovaWorks Client Delivery Planning
Date: 7 October 2026. Use final decisions in the recap.

UrbanCart Website, client UrbanCart Clothing, manager Ayesha Khan (PM01), deadline 20 October 2026.
Ali Raza (DEV01): Product catalog UI, 12 hours, due 12 October.
Ali Raza (DEV01): Demo cart UI, 8 hours, due 15 October.
Hamza Shah (DEV02): Product and cart APIs, 14 hours, due 14 October.
Ali Raza (DEV01): Website integration and testing, 6 hours, due 19 October.
Scope: responsive product listing/detail and demo cart only. No payment gateway or inventory integration.

QuickServe Mobile App, client QuickServe Services, manager Bilal Ahmed (PM02), deadline 24 October 2026.
Sara Noor (DEV03): Login and profile screens, 8 hours, due 12 October.
Sara Noor (DEV03): Service booking screens, 12 hours, due 17 October.
Hamza Shah (DEV02): Booking and account APIs, 16 hours, due 16 October.
Usman Tariq (DEV04): Mobile integration and testing, 10 hours, due 22 October.
Scope: Flutter customer login, service booking and booking status. No maps, driver tracking or payments.

HelpDeskPro AI Assistant, client HelpDeskPro Solutions, manager Hina Malik (PM03), deadline 22 October 2026.
Maryam Asif (DEV06): FAQ document processing, 10 hours, due 13 October.
Zain Abbas (DEV05): Assistant answer generation, 14 hours, due 17 October.
Zain Abbas (DEV05): Human escalation flow, 6 hours, due 18 October.
Maryam Asif (DEV06): Assistant evaluation and testing, 8 hours, due 21 October.
Scope: answer from supplied FAQ and save unresolved questions for human review. No external email or ticketing integration. Kamran is not a NovaWorks employee.`;

function initials(name="") { return name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase(); }
function Layout({ user, onLogout, children }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">N</div><div><b>NovaWorks</b><small>PROJECT STUDIO</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>
        <NavLink to="/" end>▦ <span>Overview</span></NavLink>
        <NavLink to="/projects">▤ <span>Projects</span></NavLink>
        <NavLink to="/tasks">☷ <span>{user.role==="AGENT" ? "My Tasks" : "Tasks"}</span></NavLink>
        <NavLink to="/team">♙ <span>Team directory</span></NavLink>
        {user.role==="ADMIN" && <NavLink to="/create">✧ <span>AI Transcript</span></NavLink>}
      </nav>
      <div className="sidebar-bottom"><div className="help-card"><span className="help-icon">✦</span><b>Need a hand?</b><p>Your project workspace, all in one place.</p></div>
        <div className="profile-mini"><div className="avatar">{initials(user.name)}</div><div className="profile-text"><b>{user.name}</b><small>{user.role}</small></div><button className="icon-button" onClick={onLogout} title="Log out">↪</button></div>
      </div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="crumb">NovaWorks <span>/</span> Workspace</div><div className="top-right"><span className="online-dot"></span> Workspace active <div className="avatar small">{initials(user.name)}</div></div></header>{children}</main>
  </div>;
}
function PageHeader({ eyebrow, title, subtitle, action }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}
function Stat({ label, value, note, icon }) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>; }
function ProjectCard({ project }) {
  return <NavLink className="project-card" to={`/projects/${project.id}`}>
    <div className="project-card-top"><span className="project-symbol">{project.name.toLowerCase().includes("ai") ? "✧" : project.name.toLowerCase().includes("mobile") ? "▣" : "◈"}</span><span className="arrow">↗</span></div>
    <h3>{project.name}</h3><p className="client-name">{project.client_name}</p>
    <div className="project-meta"><span>◷ {project.deadline}</span><span>☷ {project.task_count} tasks</span></div>
    <div className="manager-line"><div className="avatar tiny">{initials(project.manager_name)}</div><span>{project.manager_name}</span><span className="manager-tag">PROJECT MANAGER</span></div>
  </NavLink>;
}
function Dashboard({ user, projects, tasks }) {
  const hours = tasks.reduce((n,t)=>n+Number(t.estimated_hours),0);
  return <div className="content"><PageHeader eyebrow="YOUR WORKSPACE" title={`Good morning, ${user.name.split(" ")[0]}`} subtitle="Here’s what’s happening across your projects today." action={user.role==="ADMIN" ? <NavLink className="primary-button" to="/create">✧ Create from transcript</NavLink> : null}/>
    <div className="stats-grid"><Stat label="VISIBLE PROJECTS" value={projects.length} note="Projects you can access" icon="◈"/><Stat label="VISIBLE TASKS" value={tasks.length} note="Assigned work items" icon="☷"/><Stat label="ESTIMATED EFFORT" value={`${hours}h`} note="Across visible tasks" icon="◷"/></div>
    <div className="section-heading"><div><h2>{user.role==="AGENT" ? "Related projects" : "Your projects"}</h2><p>Project details and delivery timelines</p></div><NavLink to="/projects" className="text-link">View all projects →</NavLink></div>
    {projects.length ? <div className="projects-grid">{projects.map(p=><ProjectCard key={p.id} project={p}/>)}</div> : <Empty title="No projects yet" text="Projects assigned to you will appear here."/>}
    <div className="section-heading task-heading"><div><h2>{user.role==="AGENT" ? "My tasks" : "Upcoming tasks"}</h2><p>Work items ordered by deadline</p></div><NavLink to="/tasks" className="text-link">View all tasks →</NavLink></div>
    <TaskTable tasks={tasks.slice(0,5)}/>
  </div>;
}
function Empty({ title, text }) { return <div className="empty"><div>◌</div><b>{title}</b><p>{text}</p></div>; }
function TaskTable({ tasks }) {
  if (!tasks.length) return <Empty title="No tasks found" text="There are no visible tasks right now."/>;
  return <div className="table-wrap"><table><thead><tr><th>TASK</th><th>PROJECT</th><th>ASSIGNEE</th><th>DEADLINE</th><th>ESTIMATE</th></tr></thead><tbody>{tasks.map(t=><tr key={t.id}><td><b>{t.title}</b><small className="cell-sub">{t.description}</small></td><td>{t.project_name}</td><td><span className="person-cell"><span className="avatar tiny">{initials(t.assignee_name)}</span>{t.assignee_name}</span></td><td>{t.deadline}</td><td><span className="hours-pill">{t.estimated_hours}h</span></td></tr>)}</tbody></table></div>;
}
function Projects({ projects }) {
  return <div className="content"><PageHeader eyebrow="DELIVERY" title="Projects" subtitle="Explore projects and their delivery plans."/><div className="projects-grid">{projects.map(p=><ProjectCard key={p.id} project={p}/>)}</div>{!projects.length&&<Empty title="No projects available" text="Your assigned projects will appear here."/>}</div>;
}
function ProjectDetail() {
  const { id } = useParams(); const [project,setProject]=useState(null); const [error,setError]=useState("");
  useEffect(()=>{api(`/projects/${id}`).then(setProject).catch(e=>setError(e.message));},[id]);
  if(error) return <div className="content"><div className="alert error">{error}</div></div>;
  if(!project) return <div className="content">Loading project…</div>;
  return <div className="content"><PageHeader eyebrow="PROJECT DETAIL" title={project.name} subtitle={project.description}/><div className="detail-grid"><div className="detail-card"><span>CLIENT</span><b>{project.client_name}</b></div><div className="detail-card"><span>PROJECT MANAGER</span><b>{project.manager_name}</b></div><div className="detail-card"><span>DEADLINE</span><b>{project.deadline}</b></div><div className="detail-card"><span>TASKS VISIBLE</span><b>{project.tasks.length}</b></div></div><div className="section-heading"><div><h2>Project tasks</h2><p>Assigned owners, deadlines and effort estimates</p></div></div><TaskTable tasks={project.tasks.map(t=>({...t,project_name:project.name}))}/></div>;
}
function Tasks({ tasks }) { return <div className="content"><PageHeader eyebrow="EXECUTION" title="Tasks" subtitle="Track assigned work, owners and delivery dates."/><TaskTable tasks={tasks}/></div>; }
function Team({ team }) { return <div className="content"><PageHeader eyebrow="PEOPLE" title="Team directory" subtitle="The NovaWorks project team and their specializations."/><div className="team-grid">{team.map(u=><div className="team-card" key={u.id}><div className="team-top"><div className="avatar large">{initials(u.name)}</div><span className={`role-pill ${u.role.toLowerCase()}`}>{u.role}</span></div><h3>{u.name}</h3><p>{u.specialization}</p><div className="skill-list">{u.skills.map(s=><span key={s}>{s}</span>)}</div></div>)}</div></div>; }
function CreateTranscript() {
  const [transcript,setTranscript]=useState(""); const [busy,setBusy]=useState(false); const [result,setResult]=useState(null); const [error,setError]=useState("");
  async function submit(e) { e.preventDefault(); setBusy(true);setError("");setResult(null);try{setResult(await api("/transcript",{method:"POST",body:JSON.stringify({transcript})}));}catch(err){setError([err.message,...(err.details||[])].join("\n"));}finally{setBusy(false);} }
  return <div className="content"><PageHeader eyebrow="AI AUTOMATION" title="Meeting to execution" subtitle="Paste a meeting transcript. AI will extract projects, owners, deadlines and estimated hours."/>
    <div className="create-layout"><form className="transcript-card" onSubmit={submit}><div className="card-heading"><div><h2>Meeting transcript</h2><p>Use the full meeting notes so final decisions and corrections are included.</p></div><button type="button" className="secondary-button" onClick={()=>setTranscript(DEMO_TRANSCRIPT)}>Load demo transcript</button></div><textarea value={transcript} onChange={e=>setTranscript(e.target.value)} placeholder="Paste the NovaWorks meeting transcript here…" required/><div className="form-footer"><span>{transcript.length.toLocaleString()} characters · Admin only</span><button className="primary-button" disabled={busy||!transcript.trim()}>{busy ? <><span className="spinner"></span> Processing…</> : "✧ Create projects & tasks"}</button></div>
    {error&&<div className="alert error">{error}</div>}{result&&<div className="alert success"><b>{result.message}</b><p>{result.projects.length} projects and {result.totalTasks} tasks saved.</p>{result.projects.map(p=><div key={p.id}>{p.name} · {p.taskCount} tasks</div>)}</div>}</form>
    <aside className="process-card"><div className="ai-orb">✧</div><h3>From conversation to clarity</h3><p>The AI uses the existing NovaWorks team directory to match people and extract agreed work.</p><ol><li><b>Read the transcript</b><span>Identify final decisions and corrections.</span></li><li><b>Structure the work</b><span>Separate projects, tasks, owners and dates.</span></li><li><b>Validate & save</b><span>Check team IDs and dates before saving records.</span></li></ol><div className="scope-note"><b>Challenge scope</b><span>3 projects · 12 tasks · No cost or progress tracking</span></div></aside></div>
  </div>;
}
function Login({ onLogin }) {
  const [email,setEmail]=useState("admin@novaworks.example"); const [password,setPassword]=useState("Demo123!"); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(e){e.preventDefault();setBusy(true);setError("");try{await onLogin(email,password);}catch(err){setError(err.message);}finally{setBusy(false);}}
  return <div className="login-page"><div className="login-art"><div className="brand light"><div className="brand-mark">N</div><div><b>NovaWorks</b><small>PROJECT STUDIO</small></div></div><div className="art-copy"><div className="eyebrow">WORK BETTER, TOGETHER</div><h1>Turn great ideas<br/>into <em>real progress.</em></h1><p>A clear view of every project, every task, and every team member.</p><div className="art-dots">✦　◈　✧　◉</div></div><div className="art-footer">NOVAWORKS TECHNOLOGIES · LAHORE</div></div><div className="login-panel"><form className="login-form" onSubmit={submit}><div className="eyebrow">WELCOME BACK</div><h2>Sign in to your workspace</h2><p>Use one of the supplied demo accounts.</p><label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<div className="alert error">{error}</div>}<button className="primary-button full" disabled={busy}>{busy?"Signing in…":"Sign in →"}</button><div className="demo-credentials"><b>Demo access</b><span>All accounts use password <code>Demo123!</code></span><small>Admin: admin@novaworks.example</small><small>Manager: ayesha@novaworks.example</small><small>Agent: ali@novaworks.example</small></div></form></div></div>;
}
export default function App() {
  const [user,setUser]=useState(null); const [projects,setProjects]=useState([]); const [tasks,setTasks]=useState([]); const [team,setTeam]=useState([]); const [loading,setLoading]=useState(true); const navigate=useNavigate();
  async function refresh(){const [p,t,tm]=await Promise.all([api("/projects"),api("/tasks"),api("/team")]);setProjects(p);setTasks(t);setTeam(tm);}
  useEffect(()=>{api("/me").then(async d=>{setUser(d.user);await refresh();}).catch(()=>{}).finally(()=>setLoading(false));},[]);
  async function login(email,password){const d=await api("/login",{method:"POST",body:JSON.stringify({email,password})});setUser(d.user);await refresh();navigate("/");}
  async function logout(){await api("/logout",{method:"POST"});setUser(null);setProjects([]);setTasks([]);navigate("/");}
  if(loading)return <div className="loading-screen">Loading NovaWorks…</div>;
  if(!user)return <Login onLogin={login}/>;
  return <Layout user={user} onLogout={logout}><Routes><Route path="/" element={<Dashboard user={user} projects={projects} tasks={tasks}/>}/><Route path="/projects" element={<Projects projects={projects}/>}/><Route path="/projects/:id" element={<ProjectDetail/>}/><Route path="/tasks" element={<Tasks tasks={tasks}/>}/><Route path="/team" element={<Team team={team}/>}/><Route path="/create" element={user.role==="ADMIN"?<CreateTranscript/>:<Dashboard user={user} projects={projects} tasks={tasks}/>}/><Route path="*" element={<Dashboard user={user} projects={projects} tasks={tasks}/>}/></Routes></Layout>;
}
