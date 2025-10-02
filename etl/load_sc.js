import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function loadFromFile(filename, type, stateFips, stateAbbr) {
  const geojson = JSON.parse(fs.readFileSync(filename));
  if (!geojson.features) {
    console.error("❌ No features in", filename);
    return [];
  }

  const features = geojson.features.filter(f => f.properties.STATEFP === stateFips);
  console.log(`✅ Found ${features.length} ${type}(s) for ${stateAbbr}`);

  return features.map(f => ({
    geoid: f.properties.GEOID,
    name: f.properties.NAME,
    type,
    state: stateAbbr,
    authority: f.properties.NAME,
    permit_url: null,
    forms_url: null,
    boundary: f.geometry
  }));
}

async function main() {
  const stateFips = "45"; // SC
  const stateAbbr = "SC";

  const counties = loadFromFile("counties.json", "county", stateFips, stateAbbr);
  const places = loadFromFile("places.json", "city", stateFips, stateAbbr);

  const rows = [...counties, ...places];
  console.log(`🚀 Upserting ${rows.length} jurisdictions into Supabase...`);

  const { error } = await supabase.from("jurisdictions").upsert(rows);
  if (error) {
    console.error("❌ Insert error:", error);
    process.exit(1);
  }

  console.log("🏁 SC load complete!");
}

main();
