const OpenAI = require("openai");
const db = require("./db");

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["projects"],
  properties: {
    projects: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name","clientName","description","managerId","deadline","tasks"],
        properties: {
          name: { type: "string" },
          clientName: { type: "string" },
          description: { type: "string" },
          managerId: { type: "string" },
          deadline: { type: "string" },
          tasks: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title","description","assigneeId","deadline","estimatedHours"],
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                assigneeId: { type: "string" },
                deadline: { type: "string" },
                estimatedHours: { type: "number" }
              }
            }
          }
        }
      }
    }
  }
};

async function convertTranscript(transcript) {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY is missing. Add it to your .env file to enable transcript conversion.");
    error.status = 503;
    throw error;
  }
  const directory = db.prepare("SELECT id,name,role,specialization,skills FROM users ORDER BY id").all();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    response_format: {
      type: "json_schema",
      json_schema: { name: "project_plan", strict: true, schema }
    },
    messages: [
      {
        role: "system",
        content: `Convert meeting transcripts into project/task records. Use ONLY the supplied directory IDs.
Create separate projects when requested. Respect final corrections and final recap over earlier tentative statements.
Do not create rejected/future features or non-employees. Managers must be MANAGER IDs; task owners must be AGENT IDs.
Dates must be YYYY-MM-DD. Estimated hours are positive developer effort hours, not calendar duration.
Every task deadline must be on or before its project deadline. Return only the required JSON structure.`
      },
      {
        role: "user",
        content: `TEAM DIRECTORY (IDs, roles and skills):\n${JSON.stringify(directory)}\n\nMEETING TRANSCRIPT:\n${transcript}`
      }
    ],
    temperature: 0
  });
  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("The AI returned an empty response.");
  return JSON.parse(content);
}

function validateDraft(draft) {
  const errors = [];
  const managers = new Set(db.prepare("SELECT id FROM users WHERE role='MANAGER'").all().map(x => x.id));
  const agents = new Set(db.prepare("SELECT id FROM users WHERE role='AGENT'").all().map(x => x.id));
  if (!draft || !Array.isArray(draft.projects) || !draft.projects.length) return ["AI did not return any projects."];
  for (const [pi,p] of draft.projects.entries()) {
    const label = `Project ${pi + 1}`;
    if (!p.name?.trim()) errors.push(`${label}: name is required.`);
    if (!p.clientName?.trim()) errors.push(`${label}: client name is required.`);
    if (!managers.has(p.managerId)) errors.push(`${label}: manager "${p.managerId}" is not a seeded manager.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.deadline || "") || Number.isNaN(Date.parse(p.deadline))) errors.push(`${label}: invalid deadline.`);
    if (!Array.isArray(p.tasks)) errors.push(`${label}: tasks must be an array.`);
    for (const [ti,t] of (p.tasks || []).entries()) {
      const taskLabel = `${label}, task ${ti + 1}`;
      if (!t.title?.trim()) errors.push(`${taskLabel}: title is required.`);
      if (!agents.has(t.assigneeId)) errors.push(`${taskLabel}: assignee "${t.assigneeId}" is not a seeded agent.`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t.deadline || "") || Number.isNaN(Date.parse(t.deadline))) errors.push(`${taskLabel}: invalid deadline.`);
      if (Date.parse(t.deadline) > Date.parse(p.deadline)) errors.push(`${taskLabel}: task deadline is after the project deadline.`);
      if (!(Number(t.estimatedHours) > 0)) errors.push(`${taskLabel}: estimated hours must be greater than zero.`);
    }
  }
  return errors;
}
module.exports = { convertTranscript, validateDraft };
