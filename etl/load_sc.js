import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function loadAndInsert(url, type, stateFips, stateAbbr) {
  console.log(`Fetching: ${url}`);
  const res = await fetch(url);
  const geojson = await res.json();

  if (!geojson.features) {
    console.error("❌ Unexpected response");
    return;
  }

  const scFeatures = geojson.features.filter(f => f.properties.STATEFP === stateFips);
  console.log(`✅ Retrieved ${scFeatures.length} ${type}s for ${stateAbbr}`);

  // Batch insert for efficiency
  const rows = scFeatures.map(f => ({
    geoid: f.properties.GEOID,
    name: f.properties.NAME,
    type,
    state: stateAbbr,
    authority: f.properties.NAME,
    permit_url: null,
    forms_url: null,
    boundary: f.geometry
  }));

  const { error } = await supabase.from("jurisdictions").upsert(rows);
  if (error) console.error("Insert error:", error);
}

async function main() {
  const stateFips = "45";
  const stateAbbr = "SC";

  // Counties
  await loadAndInsert(
    "https://www2.census.gov/geo/tiger/GENZ2022/shp/cb_2022_us_county_500k.json",
    "county",
    stateFips,
    stateAbbr
  );

  // Places (cities/towns)
  await loadAndInsert(
    "https://www2.census.gov/geo/tiger/GENZ2022/shp/cb_2022_us_place_500k.json",
    "city",
    stateFips,
    stateAbbr
  );
}

main().then(() => console.log("🏁 SC load complete"));
