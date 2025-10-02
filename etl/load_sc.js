import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const stateMap = { "45": "SC" };  // South Carolina

async function loadJurisdictions(url, type) {
  console.log(`Fetching: ${url}`);
  const res = await fetch(url + "&resultRecordCount=5000"); // force full record set
  const geojson = await res.json();

  if (!geojson.features) {
    console.error("❌ Unexpected response:", geojson);
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
  await loadJurisdictions(
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/2/query?where=STATE='45'&outFields=STATE,COUNTY,NAME,GEOID&outSR=4326&f=geojson",
    "county"
  );

  await loadJurisdictions(
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_Census2010/MapServer/0/query?where=STATE='45'&outFields=STATE,PLACE,NAME,GEOID&outSR=4326&f=geojson",
    "city"
  );
}

main().then(() => console.log("✅ All SC jurisdictions loaded"));
