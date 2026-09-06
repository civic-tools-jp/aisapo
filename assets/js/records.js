function boolValue(v){return v===true||v===1||String(v||"").toLowerCase()==="true"}
"use strict";
async function loadRecords(){try{setBusy(true);const d=await api('listRecords',{areaId:currentAreaId});records=d.records||[];renderAll();}catch(e){if(/セッション/.test(e.message)){logout();return}msg('appMsg',e.message)}finally{setBusy(false)}}
function setBusy(v){$('app').classList.toggle('spinner',v)}
function isRevisit(r){return statusKey(r.status)==='revisit'}
function renderStatus(){const grid=$('statusGrid');if(grid)grid.innerHTML='';const st=STATUS[editStatus]||STATUS.unvisited;if($('detailHeaderStatus'))$('detailHeaderStatus').innerHTML=`<span class="status-icon">${st.icon||''}</span>${st.label}`;const summary=$('visitSummary');if(summary){const count=Number(editing?.visitCount||editing?.roundNo||0)||0;const next=editing?.nextVisitDate?formatVisitDate(editing.nextVisitDate):'';summary.innerHTML=`<div class="visit-summary-main"><strong>${st.icon||''} ${esc(st.label)}</strong>${count?`<span>${count}回訪問</span>`:'<span>訪問履歴なし</span>'}</div>${next?`<div class="visit-summary-next">次回予定：${esc(next)}</div>`:''}`;}}
function inputDateValue(v){
  if(!v)return today();
  if(v instanceof Date&&!isNaN(v))return v.toISOString().slice(0,10);
  const s=String(v).trim();
  let m=s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  const d=new Date(s);
  return isNaN(d)?today():d.toISOString().slice(0,10);
}
const VISIT_RESULT_LABELS={talked:'本人と話せた',family:'家族・同居人と話せた',absent:'不在',intercom:'インターフォンのみ',refused:'断られた',other:'その他'};
function toggleVisitResultFields(){const on=!!$('visitResult')?.value;$('visitResultFields')?.classList.toggle('hidden',!on);}
function nextRoundForRecord(r){const n=Number(r?.roundNo||r?.visitCount||0)||0;return Math.min(n+1,4);}
function formatVisitDate(v){if(!v)return'';return String(v).slice(0,10).replace(/-/g,'/');}
async function loadVisitHistory(recordId,record){
  const wrap=$('visitHistoryWrap'),list=$('visitHistoryList');if(!wrap||!list)return;
  wrap.classList.remove('hidden');
  if(!recordId){list.innerHTML='<div class="visit-history-empty">まだ訪問履歴はありません。</div>';if($('visitRound'))$('visitRound').value='1';return;}
  try{
    const d=await api('listVisitHistory',{recordId});let visits=d.visits||[];
    // Ver.2.8.51以前の「最新訪問」しか持っていないデータも、画面上では履歴として確認できるようにする。
    if(visits.length===0 && record && record.date && statusKey(record.status)!=='unvisited'){
      const reverseResult={visited:'talked',absent:'absent',revisit:'intercom',refused:'refused'};
      visits=[{roundNo:Number(record.roundNo||record.visitCount||1)||1,visitedAt:record.date,result:reverseResult[statusKey(record.status)]||'other',posted:false,nextVisitDate:record.nextVisitDate||'',memo:record.memo||'',legacy:true}];
    }
    if(visits.length===0){
      list.innerHTML='<div class="visit-history-empty">まだ訪問履歴はありません。</div>';
      if($('visitRound'))$('visitRound').value='1';
    }else{
      visits=[...visits].sort((a,b)=>String(b.visitedAt||'').localeCompare(String(a.visitedAt||''))||Number(b.roundNo||0)-Number(a.roundNo||0));
      list.innerHTML=visits.map(v=>`<div class="visit-history-item"><div class="visit-history-head"><strong>${esc(v.roundNo?`${v.roundNo}巡目`:'訪問')}</strong><span>${esc(formatVisitDate(v.visitedAt))}</span></div><div class="visit-history-result">${esc(VISIT_RESULT_LABELS[v.result]||v.result||'')}</div>${boolValue(v.posted)?'<div class="visit-history-posted">📮 ポスティング</div>':''}${v.nextVisitDate?`<div class="visit-history-next">次回：${esc(formatVisitDate(v.nextVisitDate))}</div>`:''}${v.memo?`<div class="visit-history-memo">${esc(v.memo)}</div>`:''}${v.legacy?'<div class="visit-history-legacy">旧データから表示</div>':''}</div>`).join('');
      const maxRound=Math.max(...visits.map(v=>Number(v.roundNo||0)||0),0);
      if($('visitRound'))$('visitRound').value=String(Math.min(maxRound+1,4));
    }
  }catch(e){console.warn('visit history',e);list.innerHTML='<div class="visit-history-empty">訪問履歴を読み込めませんでした。</div>';}
}
function isPartyOrSupporter(c){
  const mt=String(c.memberType||'').trim();
  if(mt==='party_member'||mt==='supporter')return true;
  const raw=String(c.memberTypeRaw||c.membershipType||c.memberCategory||c.partyMemberType||'').trim();
  return /党員|会員|サポーター/.test(raw);
}
function openEdit(r,isNew){editing={...r,isNew};$('recordId').value=r.id||'';$('recordMemberType').value=r.memberType||'general';$('recordSource').value=r.source||(isNew?'manual':'');$('lat').value=r.lat||'';$('lng').value=r.lng||'';$('fullAddress').value=r.fullAddress||'';$('personName').value=(typeof recordDisplayName==='function'?recordDisplayName(r):(r.personName||''));$('recordPhone').value=r.phone||'';$('recordEmail').value=r.email||'';$('supporter').value=(typeof supportRankValue==='function'?supportRankValue(r.supporter):(r.supporter||''));$('priority').value=r.revisitPriority||'';$('referrer').value=r.referrer||'';$('followParty').checked=boolValue(r.followParty);$('followSupporter').checked=boolValue(r.followSupporter);$('followDetails').checked=boolValue(r.followDetails);$('followDone').checked=boolValue(r.followDone);$('followMemo').value=r.followMemo||'';toggleFollowFields();$('warning').checked=boolValue(r.warning);$('warningReason').value=r.warningReason||'';$('warningMemo').value=r.warningMemo||'';toggleWarningFields();$('posterRequest').checked=boolValue(r.posterRequest);$('posterReported').checked=boolValue(r.posterReported);$('posterRequestMemo').value=r.posterRequestMemo||'';togglePosterRequestFields();$('type').value=r.type||'戸建て';$('date').value=today();$('memo').value='';if($('visitRound'))$('visitRound').value=String(nextRoundForRecord(r));if($('visitResult'))$('visitResult').value='';if($('visitPosted'))$('visitPosted').checked=false;if($('nextVisitDate'))$('nextVisitDate').value=r.nextVisitDate?inputDateValue(r.nextVisitDate):'';toggleVisitResultFields();editStatus=statusKey(r.status);renderStatus();updateDetailHeader({...r,isNew});const imported=String(r.source||'')==='import';
  const importedPrivacy=imported;
  $('recordAddressBlock')?.classList.toggle('hidden',importedPrivacy);
  $('recordImportedLocationBlock')?.classList.toggle('hidden',!importedPrivacy);
  $('recordContactFields')?.classList.toggle('hidden',importedPrivacy);
  if(importedPrivacy){$('fullAddress').value='';$('recordPhone').value='';$('recordEmail').value='';setTimeout(()=>initRecordLocationMap(r),60);}
  const canRemove=!!r.id&&(!imported||['leader','prefecture_admin','system_admin'].includes(window.appSession?.role));
  $('deleteRecordRow')?.classList.toggle('hidden',!canRemove);
  $('mobileDetailDeleteBtn')?.classList.toggle('hidden',!canRemove);
  const deleteBtn=document.querySelector('#deleteRecordRow button');
  if(deleteBtn){
    deleteBtn.textContent=imported?'この名簿データを無効化':'この訪問先を削除';
    deleteBtn.title=imported?'元データは削除せず、通常表示から外します':'';
  }
  const mobileCancelBtn=$('mobileDetailCancelBtn');
  if(mobileCancelBtn)mobileCancelBtn.textContent=isNew?'キャンセル':'閉じる';
  const protectedMember=window.appSession?.role==='member'&&!isNew&&['party_member','supporter'].includes(String(r.memberType||''));
  const importedMember=protectedMember&&String(r.source||'')==='import';
  const locationConfirmed=protectedMember&&r.locationConfirmed===true;

  $('personName').readOnly=importedPrivacy||importedMember;
  $('recordPhone').readOnly=protectedMember;
  $('recordMemberType').disabled=protectedMember;
  $('fullAddress').readOnly=locationConfirmed;

  if(protectedMember){
    $('recordPhone').title='電話番号は閲覧のみです。修正は管理者に依頼してください';
    $('personName').title=importedMember?'名簿から取り込んだ氏名は閲覧のみです。修正は管理者に依頼してください':'';
    if(locationConfirmed){
      $('fullAddress').title='位置確認済みの住所です。修正は管理者に依頼してください';
    }else{
      $('fullAddress').title='位置未確認のため住所を修正できます';
    }
  }else{
    $('recordPhone').title='';$('personName').title='';$('fullAddress').title='';
  }

  const hasCoords=!!(Number(r.lat)&&Number(r.lng));
  $('openGoogleMapsBtn')?.classList.toggle('hidden',!hasCoords);
  const source=String(r.source||(isNew?'manual':'manual'));
  const geocodeBtn=$('recordGeocodeBtn'),currentBtn=$('recordCurrentBtn'),mapCheckBtn=$('recordMapCheckBtn');

  // 登録方法に応じて必要な位置操作だけ表示する。
  // 地図登録は既に地図上の位置が確定しているので、Googleマップ確認だけ。
  // 名簿取込で位置未確認なら住所から位置取得。手入力なら住所/現在地の両方を利用可。
  const mapRegistered=source==='map'&&hasCoords;
  if(geocodeBtn)geocodeBtn.classList.toggle('hidden',mapRegistered||locationConfirmed);
  if(currentBtn)currentBtn.classList.toggle('hidden',mapRegistered||source==='import'||locationConfirmed);
  if(mapCheckBtn)mapCheckBtn.classList.remove('hidden');

  const locationNote=document.getElementById('recordLocationNote');
  if(locationNote){
    locationNote.textContent=importedPrivacy?'🔐 名簿由来データは住所を保存せず、地図上の位置情報だけで管理します。':(protectedMember?(locationConfirmed?'🔒 位置確認済み':'⚠️ 位置未確認'):'');
    locationNote.classList.toggle('hidden',!(importedPrivacy||protectedMember));
  }

  const editModal=$('editModal');editModal.style.display='flex';loadVisitHistory(r.id||'',r);requestAnimationFrame(()=>{editModal.scrollTop=0;const detail=editModal.querySelector('.detail-modal');if(detail)detail.scrollTop=0;window.scrollTo({top:0,left:0,behavior:'auto'});});}
function toggleRecordContactLink(){
  const checked=!!$('linkContactCheck')?.checked;
  $('recordContactWrap')?.classList.toggle('hidden',!checked);
  if(checked)renderContactSelect();
  if(!checked){
    if($('recordContactSearch'))$('recordContactSearch').value='';
    if($('recordContact'))$('recordContact').value='';
    renderLinkedContactInfo('');
  }
}
function renderLinkedContactInfo(contactId){
  const c=contacts.find(x=>String(x.contactId)===String(contactId||''));
  const box=$('linkedContactInfo');
  if(!box)return;
  if(!c){box.innerHTML='';box.classList.add('hidden');return;}
  const label=memberTypeLabel(c.memberType);
  const cls=c.memberType==='party_member'?'member-party':c.memberType==='supporter'?'member-supporter':'member-general';
  box.className='contact-link-info '+cls;
  box.innerHTML=`<div class="member-linked-title">${esc(label)}　${esc(c.name||'')}</div>
    ${c.partyId?`<div>参政党ID：${esc(c.partyId)}</div>`:''}
    ${c.sourceBranch?`<div>所属：${esc(c.sourceBranch)}</div>`:''}
    ${c.phone?`<div>☎ ${esc(c.phone)}</div>`:''}
    ${c.email?`<div>✉ ${esc(c.email)}</div>`:''}`;
}
function onRecordContactChange(){const id=$('recordContact').value;renderLinkedContactInfo(id);const c=contacts.find(x=>String(x.contactId)===String(id));if(!c)return;if(!$('personName').value.trim())$('personName').value=c.name||'';if(!$('fullAddress').value.trim())$('fullAddress').value=c.fullAddress||'';if(!$('recordPhone').value.trim())$('recordPhone').value=c.phone||'';if(!$('recordEmail').value.trim())$('recordEmail').value=c.email||'';}
function renderContactSelect(preferred){
  const el=$('recordContact');if(!el)return;
  const previous=preferred!==undefined?preferred:el.value;
  const q=String($('recordContactSearch')?.value||'').trim().toLowerCase();
  const allowed=contacts.filter(c=>{
    if(!isPartyOrSupporter(c))return false;
    if(c.areaId&&currentAreaId&&String(c.areaId)!==String(currentAreaId))return false;
    if(!q)return true;
    return [c.name,c.fullAddress,c.partyId,c.phone].some(v=>String(v||'').toLowerCase().includes(q));
  });
  el.innerHTML='<option value="">選択してください</option>'+allowed.map(c=>`<option value="${esc(c.contactId)}">${esc(memberTypeLabel(c.memberType))}｜${esc(c.name||'名称未設定')}${c.fullAddress?'｜'+esc(c.fullAddress):''}</option>`).join('');
  const exists=allowed.some(c=>String(c.contactId)===String(previous||''));
  el.value=exists?previous:'';
  el.classList.toggle('hidden',allowed.length===0);
  $('recordContactEmpty')?.classList.toggle('hidden',allowed.length!==0);
  el.onchange=onRecordContactChange;
}

function hasFollow(r){return boolValue(r.followParty)||boolValue(r.followSupporter)||boolValue(r.followDetails)}
function followLabel(r){
  const a=[];
  if(boolValue(r.followParty))a.push('⭐ 党員希望');
  if(boolValue(r.followSupporter))a.push('🟠 サポーター希望');
  if(boolValue(r.followDetails))a.push('💬 詳細希望');
  return a.join(' / ');
}
function toggleFollowFields(){
  const on=$('followParty')?.checked||$('followSupporter')?.checked||$('followDetails')?.checked;
  $('followFields')?.classList.toggle('hidden',!on);
  if(!on&&$('followDone'))$('followDone').checked=false;
}
function updateDetailHeader(r){
  const vc=Number(r?.visitCount||0); if($('detailVisitCount')){$('detailVisitCount').textContent=`訪問 ${vc}回`;$('detailVisitCount').classList.toggle('hidden',vc<=0);}
  const displayName=(typeof recordDisplayName==='function'?recordDisplayName(r):(r.personName||''));
  const isNew=!!(r?.isNew||editing?.isNew);
  const name=displayName||(isNew?'新しい訪問先':'名前未登録');
  if($('detailHeaderName'))$('detailHeaderName').textContent=name;
  if($('detailHeaderAddress'))$('detailHeaderAddress').textContent=String(r.source||'')==='import'?`${r.partyId?'党員ID '+r.partyId+' ／ ':''}位置情報で管理`:(r.fullAddress||'住所未設定');
  if($('detailHeaderStatus')){
    const st=STATUS[statusKey(r.status)]||STATUS.unvisited;
    $('detailHeaderStatus').innerHTML=`<span class="status-icon">${st.icon||''}</span>${st.label}`;
  }
}


function openRecordInGoogleMaps(){
  const lat=Number($('lat')?.value||editing?.lat||0),lng=Number($('lng')?.value||editing?.lng||0);
  if(!(Number.isFinite(lat)&&Number.isFinite(lng)&&lat&&lng)){return}
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`,'_blank','noopener');
}

function closeEdit(){$('editModal').style.display='none';recordLocationEditing=false;editing=null}
async function geocodeAddressQuietly(address){
  const q=String(address||'').trim();
  if(!q)return null;
  try{
    const res=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=ja&q=${encodeURIComponent(q)}`);
    const data=await res.json();
    if(!data?.[0])return null;
    const lat=Number(data[0].lat),lng=Number(data[0].lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||!lat||!lng)return null;
    return {lat,lng};
  }catch(_){return null}
}

async function saveRecord(){
  const btn=document.getElementById('saveRecordBtn'),mobileBtn=document.getElementById('mobileSaveRecordBtn');
  try{
    [btn,mobileBtn].filter(Boolean).forEach(b=>{b.disabled=true;b.textContent='保存中…'});

    const importedPrivacy=String($('recordSource').value||'')==='import'&&['party_member','supporter'].includes(String($('recordMemberType').value||''));
    const fullAddress=importedPrivacy?'':$('fullAddress').value.trim();
    let lat=Number($('lat').value),lng=Number($('lng').value);
    const hasCoords=Number.isFinite(lat)&&Number.isFinite(lng)&&lat&&lng;
    const addressChanged=String(editing?.fullAddress||'').trim()!==fullAddress;
    const shouldGeocode=!importedPrivacy&&fullAddress && (!hasCoords || (addressChanged && String($('recordSource').value||'manual')!=='map'));

    if(shouldGeocode){
      [btn,mobileBtn].filter(Boolean).forEach(b=>b.textContent='位置確認中…');
      const pos=await geocodeAddressQuietly(fullAddress);
      if(pos){
        lat=pos.lat;lng=pos.lng;
        $('lat').value=lat;$('lng').value=lng;
      }
    }

    const statusNow=editStatus;
    const priorityNow=$('priority').value;
    const hasFollowNow=$('followParty').checked||$('followSupporter').checked||$('followDetails').checked;
    const posterNow=$('posterRequest').checked;
    const dateNow=$('date').value;
    const visitResult=$('visitResult')?.value||'';
    const cautions=[];
    if(statusNow==='refused' && priorityNow) cautions.push('「断られた」状態ですが、再訪優先度が設定されています。');
    if(statusNow==='refused' && hasFollowNow) cautions.push('「断られた」状態ですが、フォロー対象が設定されています。');
    if(statusNow==='refused' && posterNow) cautions.push('「断られた」状態ですが、ポスター依頼が設定されています。');
    if(cautions.length && !confirm(cautions.join('\n')+'\n\nこの内容で保存しますか？')) return;

    const rec={
      id:$('recordId').value,
      areaId:currentAreaId,
      source:$('recordSource').value||'manual',
      memberType:$('recordMemberType').value||'general',
      contactId:editing?.contactId||'',
      lat:Number.isFinite(lat)?lat:0,
      lng:Number.isFinite(lng)?lng:0,
      fullAddress,
      personName:$('personName').value.trim(),
      phone:importedPrivacy?'':$('recordPhone').value.trim(),
      email:importedPrivacy?'':$('recordEmail').value.trim(),
      status:editStatus,
      supporter:$('supporter').value,
      revisitPriority:$('priority').value,
      referrer:$('referrer').value.trim(),
      followParty:$('followParty').checked,
      followSupporter:$('followSupporter').checked,
      followDetails:$('followDetails').checked,
      followDone:$('followDone').checked,
      followMemo:$('followMemo').value.trim(),
      warning:$('warning').checked,
      warningReason:$('warningReason').value,
      warningMemo:$('warningMemo').value.trim(),
      posterRequest:$('posterRequest').checked,
      posterReported:$('posterReported').checked,
      posterRequestMemo:$('posterRequestMemo').value.trim(),
      type:$('type').value,
      date:visitResult?($('date').value||today()):(editing?.date||''),
      memo:visitResult?$('memo').value.trim():(editing?.memo||''),
      updatedAt:editing?.updatedAt||''
    };
    if(visitResult){
      const mappedStatus={talked:'visited',family:'visited',absent:'absent',intercom:'revisit',refused:'refused',other:editStatus};
      rec.status=mappedStatus[visitResult]||editStatus;
    }
    const visitEntry=visitResult?{
      roundNo:Number($('visitRound')?.value||nextRoundForRecord(editing)),
      visitedAt:$('date').value||today(),
      result:visitResult,
      posted:!!$('visitPosted')?.checked,
      nextVisitDate:$('nextVisitDate')?.value||'',
      memo:$('memo').value.trim()
    }:null;
    await api('saveRecord',{record:rec,visitEntry});
    closeEdit();
    await loadRecords();
  }catch(e){
    console.error(e);
    alert(e.message||String(e));
  }finally{
    [btn,mobileBtn].filter(Boolean).forEach(b=>{b.disabled=false;b.textContent='保存'});
  }
}
async function deleteRecord(){
  if(!editing?.id){closeEdit();return}
  const imported=String(editing.source||'')==='import';
  if(imported&&!['leader','prefecture_admin','system_admin'].includes(window.appSession?.role)){alert('名簿から取り込んだデータは削除できません');return}
  const text=imported?'この名簿データを無効化しますか？\n\n元データは削除せず、一覧・地図・分析から非表示にします。':'この訪問先を削除しますか？';
  if(!confirm(text))return;
  try{
    const d=await api('deleteRecord',{recordId:editing.id,updatedAt:editing.updatedAt||''});
    closeEdit();await loadRecords();
    if(imported&&d?.deactivated)alert('名簿データを無効化しました');
  }catch(e){alert(e.message)}
}

function toggleWarningFields(){const on=!!$('warning')?.checked;$('warningFields')?.classList.toggle('hidden',!on)}

function newUnifiedRecord(){openEdit({id:'',lat:'',lng:'',fullAddress:'',personName:'',status:'unvisited',type:'戸建て',date:today(),source:'manual',memberType:'general'},true)}

function togglePosterRequestFields(){const on=!!$('posterRequest')?.checked;$('posterRequestFields')?.classList.toggle('hidden',!on);if(!on&&$('posterReported'))$('posterReported').checked=false}


function syncDetailHeaderFromForm(){
  if(!$('editModal') || $('editModal').style.display==='none')return;
  updateDetailHeader({
    ...(editing||{}),
    isNew:!!editing?.isNew,
    personName:$('personName')?.value||'',
    fullAddress:$('fullAddress')?.value||'',
    status:editStatus,
    visitCount:editing?.visitCount||0
  });
}
document.addEventListener('DOMContentLoaded',()=>{
  $('personName')?.addEventListener('input',syncDetailHeaderFromForm);
  $('fullAddress')?.addEventListener('input',syncDetailHeaderFromForm);
});

function initRecordLocationMap(r){
  const el=$('recordLocationMap');if(!el)return;const lat=Number(r.lat),lng=Number(r.lng);const area=areas.find(a=>String(a.areaId)===String(r.areaId||currentAreaId));const center=(lat&&lng)?[lat,lng]:(area&&Number(area.mapLat)&&Number(area.mapLng)?[Number(area.mapLat),Number(area.mapLng)]:[33.5902,130.4017]);
  if(!recordLocationMap){recordLocationMap=L.map('recordLocationMap').setView(center,(lat&&lng)?18:13);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(recordLocationMap);recordLocationMap.on('click',e=>{if(!recordLocationEditing)return;setRecordLocationMarker(e.latlng.lat,e.latlng.lng,true)});}else recordLocationMap.setView(center,(lat&&lng)?18:13);
  setTimeout(()=>recordLocationMap.invalidateSize(),30);if(lat&&lng)setRecordLocationMarker(lat,lng,false);else if(recordLocationMarker){recordLocationMarker.remove();recordLocationMarker=null;}
  recordLocationEditing=false;const btn=$('recordLocationEditBtn');const canEdit=['leader','prefecture_admin','system_admin'].includes(window.appSession?.role);if(btn){btn.classList.toggle('hidden',!canEdit);btn.textContent='位置を修正';}
}
function setRecordLocationMarker(lat,lng,fromEdit){if(recordLocationMarker)recordLocationMarker.remove();recordLocationMarker=L.marker([lat,lng],{draggable:!!recordLocationEditing}).addTo(recordLocationMap);if(recordLocationEditing)recordLocationMarker.on('dragend',e=>{const p=e.target.getLatLng();$('lat').value=p.lat;$('lng').value=p.lng;});$('lat').value=lat;$('lng').value=lng;if(fromEdit)recordLocationMap.setView([lat,lng],18);}
function toggleRecordLocationEdit(){if(!['leader','prefecture_admin','system_admin'].includes(window.appSession?.role))return;recordLocationEditing=!recordLocationEditing;const btn=$('recordLocationEditBtn');if(btn)btn.textContent=recordLocationEditing?'地図をタップ／ピンを移動':'位置を修正';if(recordLocationMarker){const p=recordLocationMarker.getLatLng();setRecordLocationMarker(p.lat,p.lng,false);}}
