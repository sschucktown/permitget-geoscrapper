import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ Normalize geometry to MultiPolygon
function normalizeToMultiPolygon(geometry) {
  if (!geometry) return null;

  if (geometry.type === "Polygon") {
    return {
      type: "MultiPolygon",
      coordinates: [geometry.coordinates],
    };
  }
  return geometry;
}

function loadFromFile(filename, type, stateFips, stateAbbr) {
  const geojson = JSON.parse(fs.readFileSync(filename));
  if (!geojson.features) {
    console.error("❌ No features in", filename);
    return [];
  }

  // Filter features by SC FIPS = 45
  const features = geojson.features.filter(
    (f) => f.properties.STATEFP === stateFips
  );
  console.log(`📦 ${filename}: found ${features.length} ${type}(s) for ${stateAbbr}`);

  return features.map((f) => ({
    geoid: f.properties.GEOID,
    name: f.properties.NAME,
    type,
    state: stateAbbr,
    authority: f.properties.NAME,
    permit_url: null,
    forms_url: null,
    boundary: normalizeToMultiPolygon(f.geometry), // ✅ ensure MultiPolygon
  }));
}

async function main() {
  const stateFips = "45"; // South Carolina
  const stateAbbr = "SC";

  const counties = loadFromFile("counties.json", "county", stateFips, stateAbbr);
  const places = loadFromFile("places.json", "city", stateFips, stateAbbr);

  const rows = [...counties, ...places];
  console.log(`🚀 Preparing to upsert ${rows.length} jurisdictions into Supabase...`);

  const { error, count } = await supabase
    .from("jurisdictions")
    .upsert(rows, { count: "exact" });

  if (error) {
    console.error("❌ Insert error:", error);
    process.exit(1);
  }

  console.log(`✅ Inserted/updated ${counties.length} counties`);
  console.log(`✅ Inserted/updated ${places.length} places`);
  console.log("🏁 SC load complete!");
}

main();
