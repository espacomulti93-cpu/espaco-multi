import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Simple manual parser for the .env file
function loadEnv() {
  if (!fs.existsSync(".env")) {
    console.error(".env file not found!");
    process.exit(1);
  }
  const envContent = fs.readFileSync(".env", "utf8");
  const env = {};
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const parts = trimmed.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join("=").trim();
      // Remove surrounding quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  });
  return env;
}

async function restore() {
  const env = loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl) {
    console.error("VITE_SUPABASE_URL or SUPABASE_URL not found in .env!");
    return;
  }
  
  if (!serviceRoleKey) {
    console.error("\n[ERROR] SUPABASE_SERVICE_ROLE_KEY not found in .env!");
    console.log("Please do the following:");
    console.log("1. Go to your new Supabase Dashboard (project: peafjcreckbtjuzfcrld)");
    console.log("2. Navigate to Settings -> API");
    console.log("3. Copy the 'service_role' key (it is a secret key, different from 'anon public')");
    console.log("4. Add it to your local .env file as: SUPABASE_SERVICE_ROLE_KEY=\"your_copied_key\"");
    console.log("5. Run: node restore-new-db.js again.\n");
    return;
  }
  
  console.log("Reading backup_data.json...");
  if (!fs.existsSync("backup_data.json")) {
    console.error("backup_data.json not found! Run backup first.");
    return;
  }
  const backupData = JSON.parse(fs.readFileSync("backup_data.json", "utf8"));
  
  console.log("Connecting to new Supabase database with service_role key...");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  
  // Logical order of tables to insert to satisfy foreign key constraints
  const orderedTables = [
    "salas",
    "servicos",
    "profissionais",
    "pacientes",
    "paciente_profissional",
    "agendamentos"
  ];
  
  for (const table of orderedTables) {
    const records = backupData[table];
    if (!records || records.length === 0) {
      console.log(`No records to restore for table: ${table}.`);
      continue;
    }
    
    console.log(`Restoring ${records.length} records to table: ${table}...`);
    
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from(table)
        .upsert(batch, { onConflict: "id" });
        
      if (error) {
        console.error(`Error upserting batch to ${table}:`, error.message);
      } else {
        console.log(`Uploaded batch ${i / batchSize + 1} (${batch.length} rows) to ${table}.`);
      }
    }
  }
  
  console.log("\nSUCCESS! Data restoration complete!");
}

restore();
