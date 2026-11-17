const bcrypt = require("bcryptjs");
const db = require("./db");

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Please log in." });
  const user = db.prepare("SELECT id,name,email,role,specialization,skills FROM users WHERE id=?")
    .get(req.session.userId);
  if (!user) return res.status(401).json({ error: "Session is no longer valid." });
  req.user = { ...user, skills: user.skills.split(",").map(s => s.trim()).filter(Boolean) };
  next();
}
function requireAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN") return res.status(403).json({ error: "Admin access required." });
  next();
}
function verifyLogin(email, password) {
  const user = db.prepare("SELECT * FROM users WHERE lower(email)=lower(?)").get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return null;
  return user;
}
module.exports = { requireAuth, requireAdmin, verifyLogin };
