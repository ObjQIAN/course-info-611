import * as csv from 'https://unpkg.com/csv-parse@5.5.0/dist/esm/sync.js';
import * as d3 from 'https://cdn.skypack.dev/d3-scale-chromatic@3';


const map = L.map('census-map', {
  zoomSnap: 0,
});
map.setView([39.96, -75.15], 11);

L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

async function downloadGeographicData() {
  const resp = await fetch('../data/phl_blockgroups.geojson');
  const json = await resp.json();
  return json;
}

async function downloadDemographicData() {
  const resp = await fetch('../data/phl_blockgroup_dmg.csv');
  const text = await resp.text();
  const rows = csv.parse(text, {
    from_line: 2,
    columns: false,
  });
  const dmgByGeoid = {};
  for (const row of rows) {
    const [state, county, tract, bgid] = row.slice(row.length - 4);
    const geoid = state + county + tract + bgid;
    row.push(geoid);
    dmgByGeoid[geoid] = row;
  }
  return dmgByGeoid;
}

const geoData = await downloadGeographicData();
const dmgData = await downloadDemographicData();

// const joinedData = {
//   'type': 'FeatureCollection',
//   'features': [],
// };
// for (const feature of geoData.features) {
//   const geoid = feature.properties.GEOID;
//   const dmg = dmgData[geoid];
//   const newFeature = {
//     'type': 'Feature',
//     'properties': feature.properties,
//     'geometry': feature.geometry,
//   };
//   newFeature.properties.demographics = dmg;
//   joinedData.features.push(newFeature);
// }

// const joinedData = {
//   'type': 'FeatureCollection',
//   'features': geoData.features.map((feature) => {
//     const geoid = feature.properties.GEOID;
//     const dmg = dmgData[geoid];
//     const newFeature = {
//       'type': 'Feature',
//       'properties': feature.properties,
//       'geometry': feature.geometry,
//     };
//     newFeature.properties.demographics = dmg;
//     return newFeature;
//   }),
// };

const joinedData = {
  'type': 'FeatureCollection',
  'features': geoData.features.map((feature) => {
    return {
      type: 'Feature',
      properties: {
        ...feature.properties,
        demographics: dmgData[feature.properties.GEOID],
      },
      geometry: feature.geometry,
    };
  }),
};
window.joinedData = joinedData;

const raceLabels = [
  'White',
  'Black or African American',
  'American Indian and Alaska Native',
  'Asian',
  'Native Hawaiian and Other Pacific Islander',
  'Some Other Race',
  'Two or More Races',
];
const raceColors = d3.schemeCategory10;

function mostCommonRaceIndex(blockgroup) {
  const racePops = blockgroup.properties.demographics.slice(2, 8);
  let maxIndex = 0;
  let maxPop = 0;
  for (let i = 0; i < racePops.length; i++) {
    if (maxPop < parseInt(racePops[i])) {
      maxPop = parseInt(racePops[i]);
      maxIndex = i;
    }
  }

  return maxIndex;
}

function calcFeatureStyle(blockgroup) {
  // const totalPop = blockgroup.properties.demographics[0];
  // const allTotalPops = joinedData.features.map((f) => parseInt(f.properties.demographics[0]));
  // const maxPop = Math.max(...allTotalPops);

  const maxIndex = mostCommonRaceIndex(blockgroup);

  return {
    // fillOpacity: totalPop * 1.0 / maxPop,
    fillOpacity: 0.8,
    color: raceColors[maxIndex],
    weight: 1,
  };
}

function calcFeatureTooltip(layer) {
  const blockgroup = layer.feature;
  const maxIndex = mostCommonRaceIndex(blockgroup);
  return `Most common race is ${raceLabels[maxIndex]}`;
}

const dataLayer = L.geoJSON(joinedData, {
  style: calcFeatureStyle,
});
dataLayer.bindTooltip(calcFeatureTooltip);
dataLayer.addTo(map);

const legend = L.control({position: 'bottomright'});

legend.onAdd = (map) => {
  const legendDiv = document.createElement('div');
  legendDiv.classList.add('legend');

  legendDiv.innerHTML = '<h2>Racial Categories</h2>';
  let ulHTML = '<ul class="legend-entries">';
  for (const [index, label] of raceLabels.entries()) {
    const color = raceColors[index];
    const liHTML = `
      <li class="legend-entry">
        <span class="legend-color" style="background-color: ${color};"></span>
        <span class="legend-label">${label.replace(/ /g, '&nbsp;')}</span>
      </li>
    `;
    ulHTML += liHTML;
  }
  ulHTML += '</ul>';
  legendDiv.innerHTML += ulHTML;
  legendDiv.innerHTML += `
    <p class="legend-description">
      A census block group is colored according to the most common
      racial classification within that block group.
    </p>
  `;

  return legendDiv;
};

legend.addTo(map);

window.map = map;
window.geoData = geoData;
window.dmgData = dmgData;
window.dataLayer = dataLayer;
