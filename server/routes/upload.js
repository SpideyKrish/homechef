import formidable from "formidable";
import fs from "fs/promises";
import { extractMenuAsJson } from "../../services/aiClient";
import db from "../../db";

export const config = {
  api: {
    bodyParser: false, 
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({ maxFileSize: 2 * 1024 * 1024 }); 

  try {
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0]; 

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const text = await fs.readFile(file.filepath, "utf8");
    const extracted = await extractMenuAsJson(text);

    const insertSql = `
      INSERT INTO menus (raw_text, extracted)
      VALUES ($1, $2)
      RETURNING id, extracted, created_at
    `;
    const result = await db.query(insertSql, [text, extracted]);

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}
