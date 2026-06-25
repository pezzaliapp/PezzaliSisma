'use strict';

const endpoints = {
  day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  week: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
  month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson'
};
const italyBounds = { minLat: 35, maxLat: 48.5, minLon: 5.5, maxLon: 19.5 };
let map, markers = L.layerGroup(), allEvents = [], filtered = [], userPos = null;

const $ = id => document.getElementById(id);

function initMap(){
  map = L.map('map', { zoomControl: true }).setView([42.5, 12.5], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  markers.addTo(map);
  setTimeout(()=>map.invalidateSize(), 250);
}

function colorFor(m){ return m >= 4 ? '#ff3b30' : m >= 3 ? '#ff8a00' : m >= 2 ? '#ffd23f' : '#2dd36f'; }
function radiusFor(m){ return Math.max(6, Math.min(22, 5 + (Number(m)||0) * 3)); }
function km(a,b,c,d){ const R=6371, toRad=x=>x*Math.PI/180; const dLat=toRad(c-a), dLon=toRad(d-b); const s=Math.sin(dLat/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dLon/2)**2; return 2*R*Math.atan2(Math.sqrt(s),Math.sqrt(1-s)); }
function inItaly(e){ const [lon,lat]=e.geometry.coordinates; return lat>=italyBounds.minLat&&lat<=italyBounds.maxLat&&lon>=italyBounds.minLon&&lon<=italyBounds.maxLon; }
function fmtTime(ms){ return new Date(ms).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'}); }

async function loadData(){
  $('status').textContent = 'Carico dati reali...';
  try{
    const period = $('periodSelect').value;
    const res = await fetch(endpoints[period], {cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const json = await res.json();
    allEvents = json.features || [];
    $('status').textContent = 'Aggiornato: '+new Date().toLocaleTimeString('it-IT');
    applyFilters();
  }catch(err){
    $('status').textContent = 'Errore dati: '+err.message+'. Avvia da GitHub Pages o server locale.';
    allEvents = [];
    applyFilters();
  }
}

function applyFilters(){
  const minMag = parseFloat($('magRange').value);
  $('magValue').textContent = minMag;
  const area = $('areaSelect').value;
  filtered = allEvents.filter(e => {
    const m = Number(e.properties.mag || 0);
    if(m < minMag) return false;
    return area === 'world' || inItaly(e);
  }).sort((a,b)=>b.properties.time-a.properties.time);
  drawMarkers();
  renderList();
  renderStats();
}

function drawMarkers(){
  markers.clearLayers();
  const bounds = [];
  filtered.forEach(e=>{
    const [lon,lat,depth] = e.geometry.coordinates;
    const m = Number(e.properties.mag || 0);
    const title = e.properties.place || 'Evento sismico';
    const dist = userPos ? `<br>Distanza da te: ${km(userPos.lat,userPos.lon,lat,lon).toFixed(1)} km` : '';
    const marker = L.circleMarker([lat,lon], {radius: radiusFor(m), color:'#fff', weight:1, fillColor:colorFor(m), fillOpacity:.82})
      .bindPopup(`<b>M ${m.toFixed(1)}</b><br>${title}<br>${fmtTime(e.properties.time)}<br>Profondità: ${(depth||0).toFixed(1)} km${dist}`);
    marker.addTo(markers);
    bounds.push([lat,lon]);
  });
  if(userPos){ L.circleMarker([userPos.lat,userPos.lon], {radius:8,color:'#3291ff',fillColor:'#3291ff',fillOpacity:1}).bindPopup('La tua posizione').addTo(markers); bounds.push([userPos.lat,userPos.lon]); }
  if(bounds.length) map.fitBounds(bounds, {padding:[40,40], maxZoom:7});
  else map.setView($('areaSelect').value==='world' ? [20,0] : [42.5,12.5], $('areaSelect').value==='world' ? 2 : 6);
  setTimeout(()=>map.invalidateSize(),100);
}

function renderList(){
  const box = $('eventList'); box.innerHTML = '';
  filtered.slice(0,40).forEach(e=>{
    const [lon,lat,depth] = e.geometry.coordinates;
    const m = Number(e.properties.mag || 0);
    const div = document.createElement('div'); div.className='event';
    div.innerHTML = `<strong>M ${m.toFixed(1)} — ${e.properties.place || 'Evento'}</strong><small>${fmtTime(e.properties.time)} · prof. ${(depth||0).toFixed(1)} km</small>`;
    div.onclick = ()=> map.setView([lat,lon],8);
    box.appendChild(div);
  });
  if(!filtered.length) box.innerHTML = '<p>Nessun evento con questi filtri.</p>';
}

function renderStats(){
  $('count').textContent = filtered.length;
  const mags = filtered.map(e=>Number(e.properties.mag||0));
  $('maxMag').textContent = mags.length ? Math.max(...mags).toFixed(1) : '–';
  $('lastEvent').textContent = filtered[0] ? fmtTime(filtered[0].properties.time).replace(',','') : '–';
  if(userPos && filtered.length){
    const near = Math.min(...filtered.map(e=>{const [lon,lat]=e.geometry.coordinates; return km(userPos.lat,userPos.lon,lat,lon);}));
    $('nearest').textContent = near.toFixed(0)+' km';
  } else $('nearest').textContent = '–';
  const last24 = filtered.filter(e=>Date.now()-e.properties.time <= 86400000).length;
  const ge3 = filtered.filter(e=>Number(e.properties.mag||0)>=3).length;
  const shallow = filtered.filter(e=>(e.geometry.coordinates[2]||0)<=10).length;
  $('signal').textContent = `Negli eventi filtrati: ${last24} nelle ultime 24 ore, ${ge3} con magnitudo ≥ 3, ${shallow} superficiali ≤ 10 km. Dato statistico, non previsionale.`;
}

async function locate(){
  if(!navigator.geolocation){ $('status').textContent='Geolocalizzazione non disponibile.'; return; }
  navigator.geolocation.getCurrentPosition(pos=>{ userPos={lat:pos.coords.latitude, lon:pos.coords.longitude}; applyFilters(); }, err=>{$('status').textContent='Posizione non autorizzata: '+err.message;}, {enableHighAccuracy:true,timeout:10000});
}

window.addEventListener('load', ()=>{
  initMap();
  $('refreshBtn').onclick = loadData;
  $('locateBtn').onclick = locate;
  $('periodSelect').onchange = loadData;
  $('magRange').oninput = applyFilters;
  $('areaSelect').onchange = applyFilters;
  loadData();
  setInterval(loadData, 300000);
  if('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(()=>{});
});
