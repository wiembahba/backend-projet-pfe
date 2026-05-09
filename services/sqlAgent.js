const { askLLM } = require("../chatbot/llm");

function cleanSQL(sql) {
  return sql.replace(/```sql|```/g, "").replace(/;/g, "").trim();
}

async function generateSQL(question, analysis, schema) {
 const prompt = `
You are a MySQL expert.

DATABASE:
${schema}

ANALYSIS:
${JSON.stringify(analysis)}

RULES:
- Use ONLY needed tables
- Use correct JOINs
- Use SELECT *
- Use correct relations

QUESTION:
${question}

SQL:
`;

  return cleanSQL(await askLLM(prompt));
}

async function fixSQL(sql, error, question, schema) {
  const prompt = `
Fix this SQL.

ERROR:
${error}

SQL:
${sql}

SCHEMA:
${schema}

RULES:
- Use only valid columns
- Remove invalid fields
- If needed → SELECT *
- ONLY SQL

FIXED SQL:
`;

  return cleanSQL(await askLLM(prompt));
}

module.exports = { generateSQL, fixSQL };