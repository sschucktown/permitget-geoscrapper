import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Map Census FIPS → state abbreviation
const stateMap = { "45": "SC" }; // South Carolina

async function loadJurisdictions(url, type) {
  console.log(`Fetching: ${url}`);
  const res = await fetch(url + "&resultRecordCount=5000"); // fetch with max records
  const geojson = await res.json();

  // Debug if response is not what we expect
  if (!geojson.features) {
    console.error("❌ Unexpected response from Census API:");
    console.error(JSON.stringify(geojson, null, 2));
    return;
  }

  for (const feature of geojson.features) {
    const { GEOID, NAME, STATE } = feature.properties || {};
    if (!GEOID || !NAME) continue;

    const stateAbbr = stateMap[STATE] || STATE;

    const { error } = await supabase.from("jurisdictions").upsert({
      geoid: GEOID,
      name: NAME,
      type: type,
      state: stateAbbr,
      authority: NAME,   // override later if needed (ex: James Island → Charleston County)
      permit_url: null,
      forms_url: null,
      boundary: feature.geometry // Supabase/PostGIS accepts GeoJSON
    });

    if (error) {
