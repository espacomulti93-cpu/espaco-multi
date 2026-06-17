import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const oldUrl = "https://xjlmsgwqjjpuqpbrlvwr.supabase.co";
const oldKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqbG1zZ3dxampwdXFwYnJsdndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzg4MTQsImV4cCI6MjA5NTY1NDgxNH0.0kwln23c78z-fYx-plG3yI1wCTAyASLP6ov6PT6WcqM";

const supabase = createClient(oldUrl, oldKey);

const tables = [
  "profissionais",
  "pacientes",
  "servicos",
  "salas",
  "agendamentos",
  "despesas",
  "paciente_profissional"
];

async function backup() {
  const backupData = {};
  
  for (const table of tables) {
    console.log(`Fetching data from table: ${table}...`);
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.error(`Error fetching table ${table}:`, error.message);
    } else {
      console.log(`Successfully fetched ${data.length} records from ${table}.`);
      backupData[table] = data;
    }
  }
  
  fs.writeFileSync("backup_data.json", JSON.stringify(backupData, null, 2));
  console.log("Backup saved to backup_data.json!");
}

backup();
