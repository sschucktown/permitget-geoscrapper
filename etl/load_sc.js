import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Map Census state FIPS → abbreviation
const stateMap = {
  "45": "SC"  // South Carolina
};

// Generic loader for TIGERweb GeoJSON
async function loadJurisdictions(url, type) {
  console.log(`Fetching: ${url}`);
  const res = await fetch(url);
  const geojson = await res.json();

  for (const feature of geojson.features) {
    const { GEOID, NAME, STATE } = feature.properties;
    const stateAbbr = stateMap[STATE] || STATE;

    const { error } = await supabase.from("jurisdictions").upsert({
      geoid: GEOID,
      name: NAME,
      type: type,
      state: stateAbbr,
      authority: NAME,              // later you can override (ex: James Island -> Charleston County)
      permit_url: null,             // fill later
      forms_url: null,              // fill later
      boundary: feature.geometry    // Supabase/PostGIS accepts GeoJSON
    });

    if (error) {
      console.error("Insert error:", error, NAME);
    } else {
      console.log(`Inserted/updated: ${NAME} (${type})`);
    }
  }
}

async function main() {
  // All SC counties (STATE='45')
  await loadJurisdictions(
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/2/query?where=STATE='45'&outFields=STATE,COUNTY,NAME,GEOID&outSR=4326&f=geojson",
    "county"
  );

  // All SC places (cities/towns) (STATE='45')
  await loadJurisdictions(
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_Census2010/MapServer/0/query?where=STATE='45'&outFields=STATE,PLACE,NAME,GEOID&outSR=4326&f=geojson",
    "city"
  );
}

main().then(() => console.log("✅ All SC jurisdictions loaded"));
