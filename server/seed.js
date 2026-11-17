require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./db");

const users = [
  ["ADMIN","Admin","admin@novaworks.example","ADMIN","Administrator","Company overview, transcript creation"],
  ["PM01","Ayesha Khan","ayesha@novaworks.example","MANAGER","Web PM","Web projects, client coordination"],
  ["PM02","Bilal Ahmed","bilal@novaworks.example","MANAGER","Mobile PM","Mobile projects, delivery planning"],
  ["PM03","Hina Malik","hina@novaworks.example","MANAGER","AI PM","AI projects, requirement review"],
  ["DEV01","Ali Raza","ali@novaworks.example","AGENT","Full-Stack","React, frontend integration"],
  ["DEV02","Hamza Shah","hamza@novaworks.example","AGENT","Full-Stack","Node.js, databases, APIs"],
  ["DEV03","Sara Noor","sara@novaworks.example","AGENT","App Developer","Flutter, mobile UI"],
  ["DEV04","Usman Tariq","usman@novaworks.example","AGENT","App Developer","Flutter, integration, testing"],
  ["DEV05","Zain Abbas","zain@novaworks.example","AGENT","AI Developer","LLMs, extraction, prompts"],
  ["DEV06","Maryam Asif","maryam@novaworks.example","AGENT","AI Developer","Retrieval, document processing"]
];

const insert = db.prepare(`
INSERT INTO users (id,name,email,password_hash,role,specialization,skills)
VALUES (?,?,?,?,?,?,?)
ON CONFLICT(email) DO UPDATE SET
 name=excluded.name, role=excluded.role, specialization=excluded.specialization,
 skills=excluded.skills, password_hash=excluded.password_hash
`);
const hash = bcrypt.hashSync("Demo123!", 10);
const tx = db.transaction(() => {
  for (const [id,name,email,role,specialization,skills] of users) {
    insert.run(id,name,email,hash,role,specialization,skills);
  }
});
tx();
console.log(`Seeded ${users.length} NovaWorks demo accounts. Password: Demo123!`);
