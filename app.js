/* ----------------------- Initialize Map ----------------------- */
const map = L.map('map').setView([14.5995, 120.9842], 5); // Manila default
const tileLayers = {
  osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }),
  sat: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: '© OpenTopoMap' }),
  dark: L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', { attribution: '© Stadia Maps' })
};
tileLayers.osm.addTo(map);
L.control.zoom({ position: 'topright' }).addTo(map);
L.control.scale().addTo(map);

const markersCluster = L.markerClusterGroup().addTo(map);
let routingControl = null;

/* ----------------------- Marker Helper ----------------------- */
function createIcon(emoji='📍'){ 
  return L.divIcon({ html:`<div style="font-size:20px">${emoji}</div>`, className:'', iconSize:[32,32] }); 
}
function addMarker(lat,lng,title,desc='',icon='📍'){
  const marker=L.marker([lat,lng],{icon:createIcon(icon)});
  marker.bindPopup(`<strong>${title}</strong><br>${desc}`);
  markersCluster.addLayer(marker);
  const list=document.getElementById('locations-list');
  const el=document.createElement('div');el.className='loc';
  el.innerHTML=`<div class="icon">${icon}</div><div><div>${title}</div><div class="small">${desc}</div></div>`;
  el.onclick=()=>map.setView([lat,lng],13);
  list.appendChild(el);
}

/* ----------------------- Example Markers ----------------------- */
addMarker(48.8584,2.2945,"Eiffel Tower","Paris, France","🗼");
addMarker(40.6892,-74.0445,"Statue of Liberty","New York, USA","🗽");
addMarker(51.5007,-0.1246,"Big Ben","London, UK","🕰️");

/* ----------------------- Buttons ----------------------- */
// Current Location
document.getElementById('btn-location').onclick=()=>{
  navigator.geolocation.getCurrentPosition(p=>{
    const {latitude,longitude}=p.coords;
    map.setView([latitude,longitude],13);
    addMarker(latitude,longitude,"You are here");
  },()=>alert("Location access denied"));
};

// Add Marker manually
let addMode=false;
document.getElementById('btn-add-marker').onclick=()=>{
  addMode=!addMode;
  alert(addMode?"Click map to add marker":"Add marker cancelled");
};
map.on('click',e=>{
  if(addMode){
    const title=prompt("Marker title","Custom place");
    if(title) addMarker(e.latlng.lat,e.latlng.lng,title);
    addMode=false;
  }
});

// Measure distance
let measureMode=false,measurePts=[];
document.getElementById('btn-measure').onclick=()=>{
  measureMode=!measureMode;measurePts=[];
  alert(measureMode?"Click two points to measure":"Measure tool off");
};
map.on('click',e=>{
  if(measureMode){
    measurePts.push(e.latlng);
    if(measurePts.length===2){
      const d=map.distance(measurePts[0],measurePts[1])/1000;
      L.polyline(measurePts,{color:'orange'}).addTo(map);
      L.popup().setLatLng(measurePts[1]).setContent(`Distance: ${d.toFixed(2)} km`).openOn(map);
      measureMode=false;measurePts=[];
    }
  }
});

// Route
document.getElementById('btn-route').onclick=async()=>{
  if(routingControl){map.removeControl(routingControl);routingControl=null;return}
  const from=prompt("Start location","Manila"),to=prompt("Destination","Cebu");
  if(!from||!to)return;
  const f=await geocode(from),t=await geocode(to);
  routingControl=L.Routing.control({waypoints:[L.latLng(f.lat,f.lon),L.latLng(t.lat,t.lon)]}).addTo(map);
};

// Share view
document.getElementById('btn-share').onclick=()=>{
  const c=map.getCenter();
  const url=`${location.origin}${location.pathname}?lat=${c.lat}&lng=${c.lng}&z=${map.getZoom()}`;
  navigator.clipboard.writeText(url).then(()=>alert("Link copied!"));
};

// Search
document.getElementById('search-btn').onclick=()=>doSearch();
document.getElementById('search-input').addEventListener('keydown',e=>{if(e.key==='Enter')doSearch()});
async function doSearch(){
  const q=document.getElementById('search-input').value.trim();
  if(!q)return;
  const res=await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
  const d=await res.json();if(!d.length)return alert("Not found");
  const {lat,lon,display_name}=d[0];
  map.setView([lat,lon],12);addMarker(lat,lon,display_name,"Search result");
}

// Geocode helper
async function geocode(q){
  const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
  const d=await r.json();return d[0];
}

// Style select
document.getElementById('style-select').onchange=e=>{
  Object.values(tileLayers).forEach(l=>map.removeLayer(l));
  tileLayers[e.target.value].addTo(map);
};
