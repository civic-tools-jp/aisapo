"use strict";

function normalizeJapaneseAddress(data){
  const a=data?.address||{};
  const prefecture=a.province||a.state||a.region||'';
  const city=a.city||a.town||a.village||a.municipality||'';
  const ward=a.city_district||a.suburb||a.borough||'';
  const neighbourhood=a.neighbourhood||a.quarter||'';
  const road=a.road||a.pedestrian||'';
  const house=a.house_number||'';

  // Nominatimのdisplay_nameをそのまま保存せず、日本向けに必要部分だけ組み立てる。
  let parts=[];
  [prefecture,city,ward,neighbourhood,road,house].forEach(v=>{
    v=String(v||'').trim();
    if(v&&!parts.includes(v))parts.push(v);
  });
  let s=parts.join('');
  s=s.replace(/福岡県福岡市東区福岡市東区/g,'福岡県福岡市東区');
  return s || String(data?.display_name||'')
    .split(',').map(x=>x.trim())
    .filter(x=>x&&!/^日本$/.test(x)&&!/^〒?\d{3}-?\d{4}$/.test(x))
    .reverse().join('');
}
async function reverseAddress(lat,lng){
  try{
    const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}&accept-language=ja`);
    return normalizeJapaneseAddress(await r.json());
  }catch(_){return ''}
}

function geoErrorMessage(err){
  if(!window.isSecureContext)return '現在地取得にはHTTPS接続が必要です。';
  const code=Number(err?.code||0);
  if(code===1)return '位置情報の利用が許可されていません。ブラウザのサイト設定で「あいサポ」の位置情報を許可してください。';
  if(code===2)return '現在地を取得できませんでした。端末の位置情報をONにして、Wi-Fiやモバイル通信を確認してください。';
  if(code===3)return '現在地の取得がタイムアウトしました。少し待ってからもう一度お試しください。';
  return '現在地を取得できませんでした。';
}
function currentPositionOnce(options){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject({code:0,message:'geolocation unavailable'});return}
    navigator.geolocation.getCurrentPosition(resolve,reject,options);
  });
}
async function getCurrentPositionSmart(){
  if(!navigator.geolocation)throw {code:0,message:'geolocation unavailable'};
  try{
    return await currentPositionOnce({enableHighAccuracy:true,timeout:20000,maximumAge:15000});
  }catch(first){
    // GPSが弱い室内などでは、Wi-Fi/基地局を使える低精度取得へ自動フォールバック。
    if(Number(first?.code)===1)throw first;
    try{
      return await currentPositionOnce({enableHighAccuracy:false,timeout:15000,maximumAge:60000});
    }catch(second){
      throw second||first;
    }
  }
}

function initMap(){if(map)return;map=L.map('map').setView([33.5902,130.4017],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);map.on('click',async e=>{const address=await reverseAddress(e.latlng.lat,e.latlng.lng);openEdit({id:'',lat:e.latlng.lat,lng:e.latlng.lng,fullAddress:address,status:'unvisited',type:'戸建て',date:today(),source:'map',memberType:'general'},true)});setTimeout(()=>map.invalidateSize(),100)}
function priorityBadge(memberType){return memberType==='party_member'?'★':memberType==='supporter'?'♥':''}
function recordMemberType(r){return r.memberType||'general'}

function markerSvg(key){
  const common='viewBox="0 0 24 24" aria-hidden="true"';
  const icons={
    unvisited:`<svg ${common}><path d="M4.7 10.2 12 4.6l7.3 5.6v8.1a1.7 1.7 0 0 1-1.7 1.7H6.4a1.7 1.7 0 0 1-1.7-1.7v-8.1Z" fill="currentColor"/><path d="M9.1 20v-5.7h5.8V20" fill="var(--pin-color)"/></svg>`,
    visited:`<svg ${common}><path d="m6.2 12.5 3.4 3.4 8.2-8.4" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    good:`<svg ${common}><path d="M12 20.2S4.4 15.7 4.4 9.6c0-2.7 1.9-4.6 4.4-4.6 1.6 0 2.7.8 3.2 1.8.6-1 1.7-1.8 3.3-1.8 2.5 0 4.3 1.9 4.3 4.6 0 6.1-7.6 10.6-7.6 10.6Z" fill="currentColor"/></svg>`,
    absent:`<svg ${common}><rect x="7" y="5" width="10" height="15" rx="1.2" fill="currentColor"/><circle cx="14.4" cy="12.6" r="1" fill="var(--pin-color)"/><path d="M5 7.5 19 19" stroke="var(--pin-color)" stroke-width="2.6" stroke-linecap="round"/></svg>`,
    revisit:`<svg ${common}><path d="M12 4.3a7.7 7.7 0 1 1-7.2 10.4" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="m3.7 8.2 1.1 6.5 5.4-3.6" fill="currentColor"/></svg>`,
    refused:`<svg ${common}><path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`
  };
  return icons[key]||icons.unvisited;
}

function markerExtraBadge(r){
  if(boolValue(r.warning))return '<span class="pin-extra pin-extra-warning" title="訪問注意">!</span>';
  const mt=recordMemberType(r);
  if(mt==='party_member')return '<span class="pin-extra pin-extra-party" title="党員">★</span>';
  if(mt==='supporter')return '<span class="pin-extra pin-extra-supporter" title="サポーター">♥</span>';
  return '';
}

function icon(r){
  const key=statusKey(r.status),c=STATUS[key].color;
  return L.divIcon({
    className:'aisapo-leaflet-marker',
    html:`<div class="cute-pin-wrap">
      <div class="cute-pin pin-${key}" style="--pin-color:${c}">
        <span class="cute-pin-icon">${markerSvg(key)}</span>
      </div>
      ${markerExtraBadge(r)}
    </div>`,
    iconSize:[48,56],
    iconAnchor:[24,53],
    tooltipAnchor:[0,-43]
  })
}
function renderMarkers(){
  if(!map)return;
  Object.values(markers).forEach(m=>map.removeLayer(m));
  markers={};
  const pts=[];
  let matched=0,shown=0;

  const followOnly=!!$('mapFollow')?.checked;
  const followPendingOnly=!!$('mapFollowPending')?.checked;
  const posterOnly=!!$('mapPosterRequest')?.checked;
  const priorityFilters=[];
  if($('mapPriorityHigh')?.checked)priorityFilters.push('◎高');
  if($('mapPriorityMedium')?.checked)priorityFilters.push('○中');
  if($('mapPriorityLow')?.checked)priorityFilters.push('△低');

  records.forEach(r=>{
    if(currentAreaId && String(r.areaId||'')!==String(currentAreaId))return;
    if(followOnly && !hasFollow(r))return;
    if(followPendingOnly && (!hasFollow(r)||boolValue(r.followDone)))return;
    if(posterOnly && !boolValue(r.posterRequest))return;
    if(priorityFilters.length && !priorityFilters.includes(String(r.revisitPriority||'')))return;
    matched++;

    const mt=recordMemberType(r),key=statusKey(r.status);
    const lat=Number(r.lat),lng=Number(r.lng);
    if(r.lat===''||r.lat==null||r.lng===''||r.lng==null)return;
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||!lat||!lng)return;

    const marker=L.marker([lat,lng],{icon:icon(r)}).addTo(map).on('click',()=>openEdit(r,false));
    const extras=[
      priorityBadge(mt),
      (typeof recordDisplayName==='function'?recordDisplayName(r):(r.personName||''))||r.fullAddress||'訪問先',
      key==='refused'?'×断られた':'',
      boolValue(r.warning)?'⚠️訪問注意':'',
      boolValue(r.posterRequest)?'🍊ポスター依頼':'',
      Number(r.visitCount||0)>0?`訪問${Number(r.visitCount)}回`:''
    ].filter(Boolean).join(' ');
    marker.bindTooltip(extras);
    markers['r_'+r.id]=marker;
    pts.push([lat,lng]);
    shown++;
  });

  const countEl=$('mapResultCount');
  if(countEl){
    countEl.textContent = matched===shown ? `表示 ${shown}件` : `登録 ${matched}件（地図表示 ${shown}件）`;
    if(typeof syncMobileMapMeta==='function')syncMobileMapMeta();
  }

  if(pts.length>1)map.fitBounds(pts,{padding:[25,25],maxZoom:17});
  else if(pts.length===1)map.setView(pts[0],17);
}

function showRecordOnMap(recordId){
  const r=records.find(x=>String(x.id)===String(recordId));
  if(!r){alert('訪問先が見つかりません');return}

  const lat=Number(r.lat),lng=Number(r.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||!lat||!lng){
    alert('この訪問先は位置情報が登録されていません');
    return;
  }

  showView('map');
  setTimeout(()=>{
    if(!map)return;
    map.invalidateSize();
    if(!markers['r_'+r.id])renderMarkers();
    map.setView([lat,lng],18);
    const marker=markers['r_'+r.id];
    if(marker){
      marker.openTooltip();
      setTimeout(()=>{try{marker.closeTooltip()}catch(_){ }},2200);
    }
  },220);
}

async function searchMap(){
  const q=$('searchText').value.trim();if(!q)return;
  const local=records.find(r=>[r.personName,r.fullAddress,r.phone].some(v=>String(v||'').includes(q))&&Number(r.lat)&&Number(r.lng));
  if(local){map.setView([Number(local.lat),Number(local.lng)],17);markers['r_'+local.id]?.openTooltip();return}
  try{const res=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=ja&q=${encodeURIComponent(q)}`);const j=await res.json();if(j[0])map.setView([+j[0].lat,+j[0].lon],17);else alert('見つかりませんでした')}catch(_){alert('検索に失敗しました')}
}
async function addCurrentLocation(){
  try{
    const p=await getCurrentPositionSmart();
    const lat=p.coords.latitude,lng=p.coords.longitude;
    map.setView([lat,lng],18);
    const address=await reverseAddress(lat,lng);
    openEdit({lat,lng,fullAddress:address,status:'visited',type:'戸建て',date:today(),source:'map',memberType:'general'},true);
  }catch(err){
    alert(geoErrorMessage(err));
  }
}
