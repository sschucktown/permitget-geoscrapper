import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const stateMap = { "45": "SC" }; // South Carolina

async function loadJurisdictions(url, type) {
  console.log(`Fetching: ${url}`);
  const res = await fetch(url + "&resultRecordCount=5000");
  const geojson = await res.json();

  if (!geojson.features) {
    console.error("❌ Unexpected response from Census API:");
    console.error(JSON.stringify(geojson, null, 2));
    return;
  }

  for (const feature of geojson.features) {
    const { GEOID, NAME, STATEFP } = feature.properties || {};
    if (!GEOID || !NAME) continue;

    const stateAbbr = stateMap[STATEFP] || STATEFP;

    const { error } = await supabase.from("jurisdictions").upsert({
      geoid: GEOID,
      name: NAME,
      type: type,
      state: stateAbbr,
      authority: NAME,
      permit_url: null,
      forms_url: null,
      boundary: feature.geometry
    });

    if (error) {
      console.error("Insert error:", error, NAME);
    } else {
      console.log(`Inserted/updated: ${NAME} (${type})`);
    }
  }
}

async function main() {
  // All SC counties
  await loadJurisdictions(
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/2/query?where=STATEFP='45'&outFields=STATEFP,COUNTYFP,NAME,GEOID&outSR=4326&f=geojson",
    "county"
  );

  // All SC places (cities/towns)
  await loadJurisdictions(
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_Census2010/MapServer/0/query?where=STATEFP='45'&outFields=STATEFP,PLACEFP,NAME,GEOID&outSR=4326&f=geojson",
    "city"
  );
}

main().then(() => console.log("✅ All SC jurisdictions loaded"));
