// あいサポ Ver.2.8.57 API — production source
// Source cleanup only: no data migration code or one-off maintenance functions.

const SHEETS={USERS:'Users',BRANCHES:'Branches',AREAS:'Areas',CONTACTS:'Contacts',RECORDS:'Records',VISIT_HISTORY:'VisitHistory',SESSIONS:'Sessions',BRANCH_MESSAGES:'BranchMessages',LOGIN_HISTORY:'LoginHistory'};
const USER_HEADERS=['userId','loginId','name','passwordHash','salt','role','branchId','areaId','active','mustChangePassword','createdAt','updatedAt'];
const BRANCH_HEADERS=['branchId','name','prefecture','active'];
const AREA_HEADERS=['areaId','branchId','city','name','mapLat','mapLng','active'];
const CONTACT_HEADERS=['contactId','branchId','areaId','partyId','lastName','firstName','lastNameKana','firstNameKana','name','phone','email','postalCode','fullAddress','memberType','birthDate','gender','occupation','approvedAt','branchParticipation','joinReason','sourceBranch','lat','lng','referrer','supporter','assigneeId','assigneeName','memo','createdAt','updatedAt','updatedBy'];
const RECORD_HEADERS=['id','branchId','areaId','active','inactiveAt','inactiveBy','inactiveReason','source','memberType','partyId','lastName','firstName','lastNameKana','firstNameKana','postalCode','birthDate','gender','occupation','approvedAt','branchParticipation','joinReason','sourceBranch','contactId','lat','lng','area','address','fullAddress','personName','phone','email','status','type','household','contact','revisitPriority','referrer','supporter','followParty','followSupporter','followDetails','followDone','followMemo','warning','warningReason','warningMemo','posterRequest','posterReported','posterRequestMemo','visitCount','roundNo','lastVisitResult','nextVisitDate','signboard','posterParty','posterMemo','memo','date','startTime','endTime','durationMinutes','googleMapsUrl','assigneeId','assigneeName','createdAt','updatedAt','updatedBy'];
const VISIT_HISTORY_HEADERS=['visitId','recordId','branchId','areaId','roundNo','visitedAt','result','posted','nextVisitDate','memo','createdById','createdByName','createdAt'];
const SESSION_HEADERS=['token','userId','expiresAt','createdAt'];
const BRANCH_MESSAGE_HEADERS=['messageId','fromBranchId','toBranchId','title','body','createdBy','createdByName','createdAt','active'];
const LOGIN_HISTORY_HEADERS=['logId','userId','loginId','name','success','loggedAt'];

function doGet(){return json_({ok:true,name:'あいサポ Ver.2.8.57 API'});}
function doPost(e){try{const p=JSON.parse((e.postData&&e.postData.contents)||'{}');if(p.action==='setup')return json_(setup_(p));if(p.action==='login')return json_(login_(p));const user=auth_(p.token);switch(p.action){
case'bootstrap':return json_(bootstrap_(user));
case'listRecords':return json_(listRecords_(user,p));case'listVisitHistory':return json_(listVisitHistory_(user,p));case'activitySummary':return json_(activitySummary_(user,p));case'saveRecord':return json_(saveRecord_(user,p.record||{},p.visitEntry||null));case'deleteRecord':return json_(deleteRecord_(user,p));
case'listContacts':return json_(listContacts_(user,p));case'saveContact':return json_(saveContact_(user,p.contact||{}));case'deleteContact':return json_(deleteContact_(user,p));
case'listBranchMessages':return json_(listBranchMessages_(user,p));case'saveBranchMessage':return json_(saveBranchMessage_(user,p.message||{}));case'deleteBranchMessage':return json_(deleteBranchMessage_(user,p));
case'saveImportedLocation':return json_(saveImportedLocation_(user,p));
case'adminData':return json_(adminData_(user));case'createUser':return json_(createUser_(user,p.user||{}));case'updateUser':return json_(updateUser_(user,p));case'setUserArea':return json_(setUserArea_(user,p));case'setUserActive':return json_(setUserActive_(user,p));case'deleteUser':return json_(deleteUser_(user,p));case'createArea':return json_(createArea_(user,p.area||{}));case'deleteArea':return json_(deleteArea_(user,p));case'importContacts':return json_(importContacts_(user,p));case'changePassword':return json_(changePassword_(user,p));case'resetPassword':return json_(resetPassword_(user,p));
default:throw Error('不明な処理です');}}catch(err){return json_({ok:false,error:String(err.message||err)});}}

// 初回セットアップ用。既存環境では通常実行不要です。
function setup_(p){const ss=SpreadsheetApp.getActive();ensureSheet_(ss,SHEETS.USERS,USER_HEADERS);ensureSheet_(ss,SHEETS.BRANCHES,BRANCH_HEADERS);ensureSheet_(ss,SHEETS.AREAS,AREA_HEADERS);ensureSheet_(ss,SHEETS.CONTACTS,CONTACT_HEADERS);ensureSheet_(ss,SHEETS.RECORDS,RECORD_HEADERS);ensureSheet_(ss,SHEETS.VISIT_HISTORY,VISIT_HISTORY_HEADERS);ensureSheet_(ss,SHEETS.SESSIONS,SESSION_HEADERS);ensureSheet_(ss,SHEETS.BRANCH_MESSAGES,BRANCH_MESSAGE_HEADERS);ensureSheet_(ss,SHEETS.LOGIN_HISTORY,LOGIN_HISTORY_HEADERS);
const bs=ss.getSheetByName(SHEETS.BRANCHES);if(bs.getLastRow()===1)bs.appendRow(['branch_fukuoka_1','福岡第1支部','福岡県',true]);
const as=ss.getSheetByName(SHEETS.AREAS);if(as.getLastRow()===1)as.appendRow(['area_higashi','branch_fukuoka_1','福岡市','東区',33.6452,130.4319,true]);
const us=ss.getSheetByName(SHEETS.USERS);if(us.getLastRow()===1){const salt=uuid_(),pw=p.adminPassword||'ChangeMe123!';us.appendRow([uuid_(),p.adminLoginId||'admin',p.adminName||'管理者',hash_(pw,salt),salt,'system_admin','','',true,false,now_(),now_()]);}return{ok:true,message:'初期設定が完了しました'};}

// ===== Authentication =====
function login_(p){
  cleanupSessions_();
  const id=String(p.loginId||'').trim(),pw=String(p.password||'');
  if(!id||!pw){logLoginAttempt_({loginId:id,success:false});throw Error('ユーザーIDとパスワードを入力してください');}
  const users=rows_(SHEETS.USERS);
  const anyUser=users.find(x=>String(x.loginId)===id);
  const u=users.find(x=>String(x.loginId)===id&&truth_(x.active));
  if(!u||!passwordMatches_(pw,u)){logLoginAttempt_({user:anyUser,loginId:id,success:false});throw Error('ユーザーIDまたはパスワードが違います');}
  const branch=rows_(SHEETS.BRANCHES).find(b=>String(b.branchId)===String(u.branchId))||{};
  const token=uuid_()+uuid_(),expires=new Date(Date.now()+1000*60*60*3).toISOString();
  SpreadsheetApp.getActive().getSheetByName(SHEETS.SESSIONS).appendRow([token,u.userId,expires,now_()]);
  logLoginAttempt_({user:u,loginId:id,success:true});
  return{ok:true,session:{token,userId:u.userId,loginId:u.loginId,name:u.name,role:u.role,branchId:u.branchId,areaId:u.areaId||'',branchName:branch.name||'全支部',mustChangePassword:truth_(u.mustChangePassword),expiresAt:expires}};
}
function logLoginAttempt_(x){try{const ss=SpreadsheetApp.getActive();ensureSheet_(ss,SHEETS.LOGIN_HISTORY,LOGIN_HISTORY_HEADERS);const u=x.user||{};ss.getSheetByName(SHEETS.LOGIN_HISTORY).appendRow([uuid_(),u.userId||'',x.loginId||u.loginId||'',u.name||'',!!x.success,now_()]);}catch(_){}}


// ===== Branch messages =====
function listBranchMessages_(u,p){
  ensureSheet_(SpreadsheetApp.getActive(),SHEETS.BRANCH_MESSAGES,BRANCH_MESSAGE_HEADERS);
  const all=rows_(SHEETS.BRANCH_MESSAGES).filter(x=>String(x.active).toLowerCase()!=='false');
  let visible=all;
  if(!isGlobal_(u)){
    const bid=String(u.branchId||'');
    visible=all.filter(x=>String(x.fromBranchId||'')===bid);
  }
  visible.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  const limit=Math.max(1,Math.min(100,Number(p.limit)||5));
  return {ok:true,messages:visible.slice(0,limit)};
}

function canManageBranchMessage_(u,item){
  if(String(u.role)==='system_admin')return true;
  return String(item.createdBy||'')===String(u.userId||'');
}

function saveBranchMessage_(u,m){
  ensureSheet_(SpreadsheetApp.getActive(),SHEETS.BRANCH_MESSAGES,BRANCH_MESSAGE_HEADERS);
  const body=String(m.body||'').trim();
  if(!body)throw Error('連絡内容を入力してください');
  if(body.length>1000)throw Error('連絡内容は1000文字以内で入力してください');
  const title=String(m.title||'').trim().slice(0,80);
  const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.BRANCH_MESSAGES);
  const messageId=String(m.messageId||'');

  if(messageId){
    const vals=sh.getDataRange().getValues(),headers=vals[0].map(String);
    const idx=headers.indexOf('messageId');
    for(let i=1;i<vals.length;i++){
      if(String(vals[i][idx])===messageId){
        const item={};headers.forEach((hh,j)=>item[hh]=vals[i][j]);
        if(!canManageBranchMessage_(u,item))throw Error('この連絡は編集できません');
        const changes={title,body};
        headers.forEach((hh,j)=>{if(Object.prototype.hasOwnProperty.call(changes,hh))sh.getRange(i+1,j+1).setValue(changes[hh])});
        return {ok:true,message:Object.assign(item,changes)};
      }
    }
    throw Error('連絡が見つかりません');
  }

  const fromBranchId=String(u.branchId||'all');
  const item={
    messageId:uuid_(),
    fromBranchId,
    toBranchId:'',
    title,
    body,
    createdBy:String(u.userId||''),
    createdByName:String(u.name||u.loginId||''),
    createdAt:now_(),
    active:true
  };
  sh.appendRow(BRANCH_MESSAGE_HEADERS.map(h=>item[h]??''));
  return {ok:true,message:item};
}

function deleteBranchMessage_(u,p){
  ensureSheet_(SpreadsheetApp.getActive(),SHEETS.BRANCH_MESSAGES,BRANCH_MESSAGE_HEADERS);
  const id=String(p.messageId||'');if(!id)throw Error('連絡IDがありません');
  const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.BRANCH_MESSAGES);
  const vals=sh.getDataRange().getValues(),headers=vals[0].map(String);
  const idIdx=headers.indexOf('messageId'),activeIdx=headers.indexOf('active');
  for(let i=1;i<vals.length;i++){
    if(String(vals[i][idIdx])===id){
      const item={};headers.forEach((hh,j)=>item[hh]=vals[i][j]);
      if(!canManageBranchMessage_(u,item))throw Error('この連絡は削除できません');
      if(activeIdx>=0)sh.getRange(i+1,activeIdx+1).setValue(false);else sh.deleteRow(i+1);
      return {ok:true};
    }
  }
  throw Error('連絡が見つかりません');
}

function auth_(token){if(!token)throw Error('セッションがありません');cleanupSessions_();const sessions=rowsWithRow_(SHEETS.SESSIONS),s=sessions.find(x=>x.token===token);if(!s||new Date(s.expiresAt)<=new Date())throw Error('セッションの有効期限が切れました');const u=rows_(SHEETS.USERS).find(x=>x.userId===s.userId&&truth_(x.active));if(!u)throw Error('利用者が無効です');const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.SESSIONS),headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String),c=headers.indexOf('expiresAt')+1;if(c)sh.getRange(s._row,c).setValue(new Date(Date.now()+1000*60*60*3).toISOString());return u;}
// ===== Bootstrap / access scope =====
function bootstrap_(u){const branches=visibleBranches_(u),areas=visibleAreas_(u);return{ok:true,branches,areas,defaultAreaId:u.role==='member'?String(u.areaId||''):'',areaLocked:u.role==='member'};}
function visibleBranches_(u){const all=rows_(SHEETS.BRANCHES).filter(x=>truth_(x.active));return isGlobal_(u)?all:all.filter(x=>x.branchId===u.branchId);}
function visibleAreas_(u){let all=rows_(SHEETS.AREAS).filter(x=>truth_(x.active));if(isGlobal_(u))return all;if(u.role==='member')return all.filter(x=>String(x.areaId)===String(u.areaId)&&String(x.branchId)===String(u.branchId));return all.filter(x=>String(x.branchId)===String(u.branchId));}
function allowedArea_(u,areaId){let requested=String(areaId||'');if(u.role==='member'){if(!u.areaId)throw Error('この利用者に活動エリアが設定されていません');requested=String(u.areaId);}if(!requested)return null;const a=rows_(SHEETS.AREAS).find(x=>String(x.areaId)===requested&&truth_(x.active));if(!a)throw Error('活動エリアが見つかりません');if(isGlobal_(u))return a;if(String(a.branchId)!==String(u.branchId))throw Error('この活動エリアにはアクセスできません');if(u.role==='member'&&String(a.areaId)!==String(u.areaId))throw Error('この活動エリアにはアクセスできません');return a;}

// ===== Records / visit history =====
function listRecords_(u,p){
  const area=allowedArea_(u,p.areaId||u.areaId||'');
  if(!area)return{ok:true,records:[]};
  let all=rows_(SHEETS.RECORDS).filter(r=>String(r.areaId)===String(area.areaId)&&String(r.active||'').toLowerCase()!=='false');
  all=all.map(r=>{
    const imported=String(r.source||'')==='import';
    if(!imported)return r;
    const locationConfirmed=!!(Number(r.lat)&&Number(r.lng));
    // 名簿由来データは活動に必要な最小限のみAPIへ返す。
    return {...r,firstName:'',lastNameKana:'',firstNameKana:'',postalCode:'',birthDate:'',gender:'',occupation:'',approvedAt:'',branchParticipation:'',joinReason:'',sourceBranch:'',address:'',fullAddress:'',phone:'',email:'',locationConfirmed,personName:String(r.lastName||r.personName||'').trim()};
  });
  return{ok:true,records:all};
}
function ensureVisitHistorySheet_(){const ss=SpreadsheetApp.getActive();ensureSheet_(ss,SHEETS.VISIT_HISTORY,VISIT_HISTORY_HEADERS);const sh=ss.getSheetByName(SHEETS.VISIT_HISTORY);ensureHeadersByName_(sh,VISIT_HISTORY_HEADERS);return sh;}
function listVisitHistory_(u,p){
  const recordId=String(p.recordId||'');if(!recordId)return{ok:true,visits:[]};
  const rec=rows_(SHEETS.RECORDS).find(x=>String(x.id)===recordId);if(!rec||!canAccessRecord_(u,rec))throw Error('この訪問履歴は表示できません');
  ensureVisitHistorySheet_();
  const visits=rows_(SHEETS.VISIT_HISTORY).filter(v=>String(v.recordId)===recordId).sort((a,b)=>String(b.visitedAt||b.createdAt||'').localeCompare(String(a.visitedAt||a.createdAt||'')));
  return{ok:true,visits};
}

function activitySummary_(u,p){
  const area=allowedArea_(u,p.areaId||u.areaId||'');
  if(!area)return{ok:true,periods:{today:emptyActivityPeriod_(),week:emptyActivityPeriod_(),month:emptyActivityPeriod_()}};
  ensureVisitHistorySheet_();
  const visits=rows_(SHEETS.VISIT_HISTORY).filter(v=>String(v.areaId)===String(area.areaId));
  const now=new Date(),today=localYmd_(now);
  const weekStart=new Date(now.getFullYear(),now.getMonth(),now.getDate()-6);
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  const periods={
    today:summarizeActivityPeriod_(visits,today,today),
    week:summarizeActivityPeriod_(visits,localYmd_(weekStart),today),
    month:summarizeActivityPeriod_(visits,localYmd_(monthStart),today)
  };
  return{ok:true,periods};
}
function emptyActivityPeriod_(){return{visits:0,contacts:0,absent:0,intercom:0,refused:0,posted:0,contactRate:0};}
function summarizeActivityPeriod_(visits,from,to){
  const x=emptyActivityPeriod_();
  visits.forEach(v=>{
    const d=String(v.visitedAt||'').slice(0,10);if(!d||d<from||d>to)return;
    x.visits++;
    const r=String(v.result||'');
    if(r==='talked'||r==='family')x.contacts++;
    if(r==='absent')x.absent++;
    if(r==='intercom')x.intercom++;
    if(r==='refused')x.refused++;
    if(truth_(v.posted))x.posted++;
  });
  x.contactRate=x.visits?Math.round(x.contacts/x.visits*100):0;
  return x;
}
function localYmd_(d){return Utilities.formatDate(d,Session.getScriptTimeZone()||'Asia/Tokyo','yyyy-MM-dd');}

function appendVisitHistory_(u,record,entry){
  const sh=ensureVisitHistorySheet_(),now=now_();
  const row={visitId:uuid_(),recordId:record.id,branchId:record.branchId,areaId:record.areaId,roundNo:Number(entry.roundNo||0)||'',visitedAt:String(entry.visitedAt||'').slice(0,10),result:String(entry.result||''),posted:bool_(entry.posted),nextVisitDate:String(entry.nextVisitDate||'').slice(0,10),memo:String(entry.memo||''),createdById:u.userId,createdByName:u.name,createdAt:now};
  sh.appendRow(VISIT_HISTORY_HEADERS.map(h=>row[h]??''));
}

function saveRecord_(u,r,visitEntry){
  if(!r.fullAddress&&!r.personName)throw Error('氏名・名称または住所を入力してください');
  const area=allowedArea_(u,r.areaId);
  if(!area)throw Error('活動エリアを選択してください');

  const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.RECORDS);
  ensureHeadersByName_(sh,RECORD_HEADERS);
  const all=rowsWithRow_(SHEETS.RECORDS);
  const old=all.find(x=>String(x.id)===String(r.id));

  if(old&&!canAccessRecord_(u,old))throw Error('この記録は編集できません');
  if(old&&r.updatedAt&&String(old.updatedAt)!==String(r.updatedAt)){
    throw Error('他の利用者が先に更新しました。最新表示後に編集してください');
  }

  const oldMemberType=normalizeMemberType_(old?.memberType||r.memberType||'general');
  const protectedMember=u.role==='member'&&old&&['party_member','supporter'].includes(oldMemberType);
  const importedMember=protectedMember&&String(old.source||'')==='import';
  const oldLocationConfirmed=protectedMember&&Number(old.lat)&&Number(old.lng);
  if(protectedMember){
    if(importedMember&&String(r.personName||'').trim()!==String(old.personName||'').trim())throw Error('名簿から取り込んだ氏名は変更できません。修正は管理者に依頼してください');
    if(String(r.phone||'')!==String(old.phone||''))throw Error('党員・サポーターの電話番号は閲覧のみです。修正は管理者に依頼してください');
    if(oldLocationConfirmed&&String(r.fullAddress||'').trim()!==String(old.fullAddress||'').trim())throw Error('位置確認済みの住所は変更できません。修正は管理者に依頼してください');
    if(normalizeMemberType_(r.memberType)!==oldMemberType)throw Error('党員・サポーターの区分変更は管理者のみ可能です');
  }

  const now=now_();
  const item={
    id:old?old.id:uuid_(),
    branchId:old?old.branchId:area.branchId,
    areaId:old?old.areaId:area.areaId,
    active:old?(String(old.active||'').toLowerCase()==='false'?false:true):true,
    inactiveAt:old?.inactiveAt||'',
    inactiveBy:old?.inactiveBy||'',
    inactiveReason:old?.inactiveReason||'',
    source:String(r.source||old?.source||'manual'),
    memberType:normalizeMemberType_(r.memberType||old?.memberType||'general'),
    partyId:String(r.partyId||old?.partyId||'').trim(),
    lastName:String(r.lastName||old?.lastName||'').trim(),
    firstName:String(r.firstName||old?.firstName||'').trim(),
    lastNameKana:String(r.lastNameKana||old?.lastNameKana||'').trim(),
    firstNameKana:String(r.firstNameKana||old?.firstNameKana||'').trim(),
    postalCode:String(r.postalCode||old?.postalCode||'').trim(),
    birthDate:r.birthDate||old?.birthDate||'',
    gender:String(r.gender||old?.gender||'').trim(),
    occupation:String(r.occupation||old?.occupation||'').trim(),
    approvedAt:r.approvedAt||old?.approvedAt||'',
    branchParticipation:String(r.branchParticipation||old?.branchParticipation||'').trim(),
    joinReason:String(r.joinReason||old?.joinReason||'').trim(),
    sourceBranch:String(r.sourceBranch||old?.sourceBranch||'').trim(),
    contactId:r.contactId||old?.contactId||'',
    lat:(protectedMember&&oldLocationConfirmed)?old.lat:r.lat,
    lng:(protectedMember&&oldLocationConfirmed)?old.lng:r.lng,
    area:r.area||old?.area||'',
    address:r.address||old?.address||'',
    fullAddress:r.fullAddress,
    personName:importedMember?old.personName:(r.personName||''),
    phone:protectedMember?old.phone:(r.phone||''),
    email:protectedMember?old.email:(r.email||''),
    status:r.status||'unvisited',
    type:r.type||'戸建て',
    household:r.household||old?.household||'',
    contact:r.contact||old?.contact||'',
    revisitPriority:r.revisitPriority||'',
    urgent:bool_(r.urgent),
    referrer:r.referrer||'',
    supporter:r.supporter||'',
    followParty:bool_(r.followParty),
    followSupporter:bool_(r.followSupporter),
    followDetails:bool_(r.followDetails),
    followDone:bool_(r.followDone),
    followMemo:r.followMemo||'',
    warning:bool_(r.warning),
    warningReason:r.warningReason||'',
    warningMemo:r.warningMemo||'',
    posterRequest:bool_(r.posterRequest),
    posterReported:bool_(r.posterReported),
    posterRequestMemo:r.posterRequestMemo||'',
    visitCount:(Number(old?.visitCount||0)||0)+(visitEntry&&visitEntry.result?1:0),
    roundNo:visitEntry&&visitEntry.result?Number(visitEntry.roundNo||0):(Number(old?.roundNo||0)||0),
    lastVisitResult:visitEntry&&visitEntry.result?String(visitEntry.result||''):String(old?.lastVisitResult||''),
    nextVisitDate:visitEntry&&visitEntry.result?String(visitEntry.nextVisitDate||''):String(r.nextVisitDate!==undefined?r.nextVisitDate:(old?.nextVisitDate||'')),
    signboard:bool_(r.signboard),
    posterParty:r.posterParty||old?.posterParty||'',
    posterMemo:r.posterMemo||old?.posterMemo||'',
    memo:r.memo||'',
    date:r.date||'',
    startTime:r.startTime||old?.startTime||'',
    endTime:r.endTime||old?.endTime||'',
    durationMinutes:r.durationMinutes||old?.durationMinutes||'',
    googleMapsUrl:r.googleMapsUrl||old?.googleMapsUrl||'',
    assigneeId:old?old.assigneeId:u.userId,
    assigneeName:old?old.assigneeName:u.name,
    createdAt:old?old.createdAt:now,
    updatedAt:now,
    updatedBy:u.name
  };

  if(item.source==='import'){
    item.firstName='';item.lastNameKana='';item.firstNameKana='';item.postalCode='';item.birthDate='';item.gender='';item.occupation='';item.approvedAt='';item.branchParticipation='';item.joinReason='';item.sourceBranch='';item.contactId='';item.address='';item.fullAddress='';item.phone='';item.email='';item.personName=String(item.lastName||item.personName||'').trim();
  }

  const row=writeRecordByHeader_(sh,old?old._row:null,item);
  if(visitEntry&&visitEntry.result){appendVisitHistory_(u,item,visitEntry);}
  SpreadsheetApp.flush();

  const saved=rowsWithRow_(SHEETS.RECORDS).find(x=>x._row===row);
  if(!saved||String(saved.id)!==String(item.id))throw Error('保存確認に失敗しました');
  return{ok:true,record:item};
}
function deleteRecord_(u,p){
  const all=rowsWithRow_(SHEETS.RECORDS),old=all.find(x=>String(x.id)===String(p.recordId));
  if(!old)return{ok:true};
  if(!canAccessRecord_(u,old))throw Error('削除できません');
  if(p.updatedAt&&String(old.updatedAt)!==String(p.updatedAt))throw Error('他の利用者が先に更新しました');
  const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.RECORDS);
  if(String(old.source||'')==='import'){
    requireAdmin_(u);
    old.active=false;old.inactiveAt=now_();old.inactiveBy=u.name||u.userId;
    old.inactiveReason=String(p.reason||'管理者による無効化');
    old.updatedAt=now_();old.updatedBy=u.name||u.userId;
    writeRecordByHeader_(sh,old._row,old);
    return{ok:true,deactivated:true};
  }
  sh.deleteRow(old._row);
  return{ok:true,deleted:true};
}
function restrictedContactForMember_(c){
  const x=Object.assign({},c);
  // 一般利用者にも現場連絡に必要な住所・電話は表示する。
  // 緯度経度や詳細属性は返さず、名簿自体の編集は管理者のみ。
  x.partyId='';x.email='';x.postalCode='';x.birthDate='';x.gender='';x.occupation='';x.approvedAt='';x.joinReason='';x.lat='';x.lng='';x.referrer='';x.memo='';
  x.restricted=true;x.locationHidden=true;
  return x;
}
// ===== Contacts =====
function listContacts_(u,p){
  const area=allowedArea_(u,p.areaId||u.areaId||'');if(!area)return{ok:true,contacts:[]};
  let all=rows_(SHEETS.CONTACTS).filter(r=>String(r.areaId)===String(area.areaId));
  if(u.role==='member')all=all.map(c=>['party_member','supporter'].includes(normalizeMemberType_(c.memberType))?restrictedContactForMember_(c):c);
  return{ok:true,contacts:all};
}
function saveContact_(u,c){
  if(!c.name&&!c.lastName&&!c.firstName)throw Error('氏名・呼び名を入力してください');
  const area=allowedArea_(u,c.areaId||u.areaId||'');if(!area)throw Error('活動エリアを選択してください');
  const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.CONTACTS),all=rowsWithRow_(SHEETS.CONTACTS);
  let old=all.find(x=>String(x.contactId)===String(c.contactId));
  if(old&&!canAccessAreaId_(u,old.areaId))throw Error('この名簿は編集できません');
  if(old&&u.role==='member'&&['party_member','supporter'].includes(normalizeMemberType_(old.memberType)))throw Error('党員・サポーター名簿の編集は管理者のみ可能です');
  if(old&&c.updatedAt&&String(old.updatedAt)!==String(c.updatedAt))throw Error('他の利用者が先に更新しました');
  const now=now_();
  const lastName=String(c.lastName||'').trim(),firstName=String(c.firstName||'').trim();
  const displayName=String(c.name||[lastName,firstName].filter(Boolean).join(' ')).trim()||'名称未設定';
  const item={
    contactId:old?old.contactId:uuid_(),branchId:old?old.branchId:area.branchId,areaId:old?old.areaId:area.areaId,
    partyId:String(c.partyId||'').trim(),lastName,firstName,
    lastNameKana:String(c.lastNameKana||'').trim(),firstNameKana:String(c.firstNameKana||'').trim(),name:displayName,
    phone:String(c.phone||'').trim(),email:String(c.email||'').trim(),postalCode:String(c.postalCode||'').trim(),fullAddress:String(c.fullAddress||'').trim(),
    memberType:normalizeMemberType_(c.memberType),birthDate:c.birthDate||'',gender:String(c.gender||'').trim(),occupation:String(c.occupation||'').trim(),approvedAt:c.approvedAt||'',
    branchParticipation:String(c.branchParticipation||'').trim(),joinReason:String(c.joinReason||'').trim(),sourceBranch:String(c.sourceBranch||'').trim(),
    lat:c.lat||'',lng:c.lng||'',referrer:String(c.referrer||'').trim(),supporter:String(c.supporter||'').trim(),
    assigneeId:old?old.assigneeId:u.userId,assigneeName:old?old.assigneeName:u.name,memo:String(c.memo||'').trim(),
    createdAt:old?old.createdAt:now,updatedAt:now,updatedBy:u.name
  };
  const vals=CONTACT_HEADERS.map(h=>item[h]??'');if(old)sh.getRange(old._row,1,1,vals.length).setValues([vals]);else sh.appendRow(vals);
  return{ok:true,contact:item};
}
function deleteContact_(u,p){const all=rowsWithRow_(SHEETS.CONTACTS),old=all.find(x=>String(x.contactId)===String(p.contactId));if(!old)return{ok:true};if(!canAccessAreaId_(u,old.areaId))throw Error('削除できません');if(rows_(SHEETS.RECORDS).some(r=>String(r.contactId)===String(old.contactId)))throw Error('訪問記録に紐づいているため削除できません');SpreadsheetApp.getActive().getSheetByName(SHEETS.CONTACTS).deleteRow(old._row);return{ok:true};}

// ===== Administration =====
function adminData_(u){
  requireAdmin_(u);
  const branches=visibleBranches_(u),areas=visibleAreas_(u);
  let users=rows_(SHEETS.USERS);if(u.role==='leader')users=users.filter(x=>String(x.branchId)===String(u.branchId));
  const bm=Object.fromEntries(rows_(SHEETS.BRANCHES).map(b=>[b.branchId,b.name])),am=Object.fromEntries(rows_(SHEETS.AREAS).map(a=>[a.areaId,(a.city?a.city+' ':'')+a.name]));
  ensureSheet_(SpreadsheetApp.getActive(),SHEETS.LOGIN_HISTORY,LOGIN_HISTORY_HEADERS);
  const history=rows_(SHEETS.LOGIN_HISTORY).sort((a,b)=>String(b.loggedAt||'').localeCompare(String(a.loggedAt||'')));
  const lastByUser={};history.forEach(h=>{if(truth_(h.success)&&h.userId&&!lastByUser[h.userId])lastByUser[h.userId]=h.loggedAt;});
  const result={ok:true,branches,areas,users:users.map(x=>({userId:x.userId,loginId:x.loginId,name:x.name,role:x.role,branchId:x.branchId,areaId:x.areaId||'',branchName:bm[x.branchId]||'全支部',areaName:am[x.areaId]||(['prefecture_admin','system_admin','leader'].includes(x.role)?'選択可':'未設定'),active:truth_(x.active),mustChangePassword:truth_(x.mustChangePassword),lastLoginAt:lastByUser[x.userId]||''}))};
  if(u.role==='system_admin')result.loginHistory=history.slice(0,100).map(h=>({userId:h.userId||'',loginId:h.loginId||'',name:h.name||'',success:truth_(h.success),loggedAt:h.loggedAt||''}));
  return result;
}


function createUser_(u,x){
  requireAdmin_(u);
  x=x||{};
  const loginId=String(x.loginId||'').trim();
  const name=String(x.name||'').trim();
  const password=String(x.password||'');
  if(!loginId||!name||!password)throw Error('必須項目を入力してください');
  validateNewPassword_(password);
  if(rows_(SHEETS.USERS).some(v=>String(v.loginId)===loginId))throw Error('同じユーザーIDが登録されています');

  let role=String(x.role||'member');
  let branchId=String(x.branchId||'');
  let areaId=String(x.areaId||'');

  // 支部管理者は自支部の一般利用者のみ作成可能
  if(u.role==='leader'){
    role='member';
    branchId=String(u.branchId||'');
  }

  if(!['member','leader'].includes(role))throw Error('登録できない権限です');
  if(!isGlobal_(u)&&branchId!==String(u.branchId||''))throw Error('他支部には登録できません');

  if(role==='member'){
    const area=rows_(SHEETS.AREAS).find(a=>String(a.areaId)===areaId&&truth_(a.active));
    if(!area||String(area.branchId)!==branchId)throw Error('一般利用者には所属支部の活動エリアを設定してください');
  }else{
    areaId='';
  }

  const salt=uuid_();
  SpreadsheetApp.getActive().getSheetByName(SHEETS.USERS).appendRow([
    uuid_(),loginId,name,hash_(password,salt),salt,role,branchId,areaId,true,true,now_(),now_()
  ]);
  return{ok:true};
}


function changePassword_(u,p){
  const current=String(p.currentPassword||'');
  const next=String(p.newPassword||'');
  if(!current)throw Error('現在のパスワードを入力してください');
  validateNewPassword_(next);

  const target=rowsWithRow_(SHEETS.USERS).find(x=>String(x.userId)===String(u.userId));
  if(!target)throw Error('利用者が見つかりません');
  if(!passwordMatches_(current,target))throw Error('現在のパスワードが違います');

  setUserPassword_(target,next,false);
  return{ok:true};
}

function resetPassword_(u,p){
  requireAdmin_(u);
  const targetId=String(p.userId||''),temp=String(p.temporaryPassword||'');
  if(!targetId)throw Error('利用者を選択してください');
  validateNewPassword_(temp);
  const target=rowsWithRow_(SHEETS.USERS).find(x=>String(x.userId)===targetId);
  if(!target)throw Error('利用者が見つかりません');
  if(String(target.userId)===String(u.userId))throw Error('自分自身のPWリセットはできません。右上の「PW変更」を利用してください');
  if(u.role==='leader'&&(String(target.branchId)!==String(u.branchId)||target.role!=='member'))throw Error('支部管理者は自支部の一般利用者のみPWリセットできます');
  if(target.role==='system_admin'&&u.role!=='system_admin')throw Error('この利用者は変更できません');
  setUserPassword_(target,temp,true);
  deleteSessionsForUser_(target.userId,'');
  return{ok:true};
}
function validateNewPassword_(pw){
  pw=String(pw||'');
  if(pw.length<10)throw Error('パスワードは10文字以上にしてください');
  if(!/[A-Za-z]/.test(pw)||!/\d/.test(pw))throw Error('パスワードには英字と数字を両方含めてください');
}
function passwordMatches_(password,user){
  return String(hash_(String(password||''),String(user.salt||''))).trim()===String(user.passwordHash||'').trim();
}
function setUserPassword_(user,newPassword,mustChange){
  const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.USERS);
  if(!sh)throw Error('Usersシートが見つかりません');
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  const col=name=>{const i=headers.indexOf(name);if(i<0)throw Error(name+'列が見つかりません');return i+1;};
  const salt=uuid_();
  const passwordHash=hash_(newPassword,salt);
  sh.getRange(user._row,col('passwordHash')).setNumberFormat('@').setValue(passwordHash);
  sh.getRange(user._row,col('salt')).setNumberFormat('@').setValue(salt);
  sh.getRange(user._row,col('mustChangePassword')).setValue(!!mustChange);
  sh.getRange(user._row,col('updatedAt')).setValue(now_());
  SpreadsheetApp.flush();
  const savedHash=String(sh.getRange(user._row,col('passwordHash')).getDisplayValue()).trim();
  const savedSalt=String(sh.getRange(user._row,col('salt')).getDisplayValue()).trim();
  if(String(hash_(newPassword,savedSalt)).trim()!==savedHash)throw Error('パスワードの保存確認に失敗しました');
  return true;
}
function deleteSessionsForUser_(userId,keepToken){const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.SESSIONS);if(!sh||sh.getLastRow()<2)return;const vals=sh.getDataRange().getValues();for(let i=vals.length-1;i>=1;i--){if(String(vals[i][1])===String(userId)&&String(vals[i][0])!==String(keepToken||''))sh.deleteRow(i+1);}}
function canAccessAreaId_(u,areaId){try{return !!allowedArea_(u,areaId);}catch(_){return false;}}
function updateUser_(u,p){requireAdmin_(u);const targetId=String(p.userId||''),x=p.user||{};const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.USERS),target=rowsWithRow_(SHEETS.USERS).find(v=>String(v.userId)===targetId);if(!target)throw Error('利用者が見つかりません');if(target.role==='system_admin')throw Error('システム管理者はこの画面では編集できません');if(u.role==='leader'&&(String(target.branchId)!==String(u.branchId)||target.role!=='member'))throw Error('支部管理者は自支部の一般利用者のみ変更できます');let name=String(x.name||'').trim(),role=String(x.role||target.role),branchId=String(x.branchId||target.branchId),areaId=String(x.areaId||'');if(!name)throw Error('表示名を入力してください');if(u.role==='leader'){role='member';branchId=String(u.branchId)}if(!['member','leader'].includes(role))throw Error('変更できない権限です');if(!isGlobal_(u)&&String(branchId)!==String(u.branchId))throw Error('他支部には変更できません');if(role==='member'){const a=rows_(SHEETS.AREAS).find(a=>String(a.areaId)===areaId&&truth_(a.active));if(!a||String(a.branchId)!==branchId)throw Error('所属支部の活動エリアを選択してください')}else areaId='';const h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);[['name',name],['role',role],['branchId',branchId],['areaId',areaId],['updatedAt',now_()]].forEach(([k,v])=>{const c=h.indexOf(k)+1;if(c)sh.getRange(target._row,c).setValue(v)});return{ok:true};}
function setUserArea_(u,p){requireAdmin_(u);const targetId=String(p.userId||''),areaId=String(p.areaId||'');const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.USERS),all=rowsWithRow_(SHEETS.USERS),target=all.find(x=>String(x.userId)===targetId);if(!target)throw Error('利用者が見つかりません');if(target.role!=='member')throw Error('活動エリア固定は一般利用者に設定します');if(u.role==='leader'&&String(target.branchId)!==String(u.branchId))throw Error('他支部の利用者は変更できません');const a=rows_(SHEETS.AREAS).find(x=>String(x.areaId)===areaId&&truth_(x.active));if(!a||String(a.branchId)!==String(target.branchId))throw Error('所属支部の活動エリアを選択してください');if(!isGlobal_(u)&&String(a.branchId)!==String(u.branchId))throw Error('この活動エリアは設定できません');const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String),c=headers.indexOf('areaId')+1;if(!c)throw Error('UsersシートにareaId列がありません。現行ヘッダーを確認してください');sh.getRange(target._row,c).setValue(areaId);return{ok:true};}
function setUserActive_(u,p){requireAdmin_(u);const targetId=String(p.userId||''),active=!!p.active;const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.USERS),target=rowsWithRow_(SHEETS.USERS).find(x=>String(x.userId)===targetId);if(!target)throw Error('利用者が見つかりません');if(String(target.userId)===String(u.userId)&&!active)throw Error('自分自身は無効化できません');if(target.role==='system_admin')throw Error('システム管理者は無効化できません');if(u.role==='leader'&&(String(target.branchId)!==String(u.branchId)||target.role!=='member'))throw Error('支部管理者は自支部の一般利用者のみ変更できます');const h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String),c=h.indexOf('active')+1,cu=h.indexOf('updatedAt')+1;sh.getRange(target._row,c).setValue(active);if(cu)sh.getRange(target._row,cu).setValue(now_());if(!active)deleteSessionsForUser_(target.userId,'');return{ok:true};}
function deleteUser_(u,p){requireSystemAdmin_(u);const targetId=String(p.userId||''),sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.USERS),target=rowsWithRow_(SHEETS.USERS).find(x=>String(x.userId)===targetId);if(!target)throw Error('利用者が見つかりません');if(String(target.userId)===String(u.userId)||target.role==='system_admin')throw Error('この利用者は削除できません');deleteSessionsForUser_(target.userId,'');sh.deleteRow(target._row);return{ok:true};}
function cleanImportedPersonName_(v){
  return String(v||'').trim()
    .replace(/^(party_member|party|supporter|general|unknown)\s*[|｜:：\-–—]?\s*/i,'')
    .trim();
}
function normalizeMemberType_(v){const s=String(v||'').trim();if(['party_member','supporter','general','unknown'].includes(s))return s;if(/党員/.test(s))return'party_member';if(/サポ|support/i.test(s))return'supporter';if(/一般/.test(s))return'general';return'unknown';}
// ===== Privacy-minimized roster import =====
function importContacts_(u,p){
  requireSystemAdmin_(u);
  const defaultArea=allowedArea_(u,p.areaId||'');
  if(!defaultArea)throw Error('取込時の基準エリアを選択してください');
  const input=Array.isArray(p.contacts)?p.contacts:[];
  if(!input.length)throw Error('取り込む名簿がありません');
  if(input.length>200)throw Error('1回の取込は200件までです');
  const ss=SpreadsheetApp.getActive(),sh=ss.getSheetByName(SHEETS.RECORDS);ensureHeadersByName_(sh,RECORD_HEADERS);
  const existing=rowsWithRow_(SHEETS.RECORDS),allAreas=visibleAreas_(u).filter(a=>truth_(a.active)),branches=rows_(SHEETS.BRANCHES),branchNameById=Object.fromEntries(branches.map(b=>[String(b.branchId),String(b.name||'')]));
  const geocoder=Maps.newGeocoder().setLanguage('ja').setRegion('jp');
  let added=0,skipped=0,duplicateSkipped=0,geocoded=0;const failed=[];
  function detectArea_(address,sourceBranch){const a=String(address||'').replace(/\s+/g,''),sb=String(sourceBranch||'').trim();let candidates=allAreas.filter(area=>{const city=String(area.city||'').replace(/\s+/g,''),name=String(area.name||'').replace(/\s+/g,'');if(!name||!a.includes(name))return false;if(city&&!a.includes(city))return false;if(sb){const branchName=branchNameById[String(area.branchId)]||'';if(branchName&&branchName!==sb)return false;}return true;});if(candidates.length===1)return candidates[0];if(!candidates.length){candidates=allAreas.filter(area=>{const city=String(area.city||'').replace(/\s+/g,''),name=String(area.name||'').replace(/\s+/g,'');return !!name&&a.includes(name)&&(!city||a.includes(city));});if(candidates.length===1)return candidates[0];}const defaultName=String(defaultArea.name||'').replace(/\s+/g,'');if(!a||(defaultName&&a.includes(defaultName)))return defaultArea;return null;}
  const existingPartyIds=new Set(existing.map(x=>String(x.partyId||'').trim()).filter(Boolean));
  for(const raw of input){
    const partyId=String(raw.partyId||'').trim(),lastName=cleanImportedPersonName_(raw.lastName),address=String(raw.fullAddress||'').trim(),memberType=normalizeMemberType_(raw.memberType);
    if(partyId&&existingPartyIds.has(partyId)){duplicateSkipped++;skipped++;continue;}
    if(!partyId||!lastName||!address){skipped++;failed.push({partyId,lastName,address,memberType,reason:!partyId?'党員IDなし':!lastName?'苗字なし':'住所なし'});continue;}
    const targetArea=detectArea_(address,raw.sourceBranch);if(!targetArea){skipped++;failed.push({partyId,lastName,address,memberType,reason:'活動エリアを判定できません'});continue;}
    let lat='',lng='';try{const geo=geocoder.geocode(address),result=geo&&geo.results&&geo.results[0];if(result&&result.geometry&&result.geometry.location){lat=Number(result.geometry.location.lat)||'';lng=Number(result.geometry.location.lng)||'';}}catch(_){}
    if(!lat||!lng){skipped++;failed.push({partyId,lastName,address,memberType,reason:'住所を位置情報へ変換できません'});continue;}
    geocoded++;const now=now_(),item={id:uuid_(),branchId:targetArea.branchId,areaId:targetArea.areaId,active:true,inactiveAt:'',inactiveBy:'',inactiveReason:'',source:'import',memberType,partyId,lastName,firstName:'',lastNameKana:'',firstNameKana:'',postalCode:'',birthDate:'',gender:'',occupation:'',approvedAt:'',branchParticipation:'',joinReason:'',sourceBranch:'',contactId:'',lat,lng,area:'',address:'',fullAddress:'',personName:lastName,phone:'',email:'',status:'unvisited',type:'戸建て',household:'',contact:'',revisitPriority:'',referrer:'',supporter:['party_member','supporter'].includes(memberType)?'B':'',followParty:false,followSupporter:false,followDetails:false,followDone:false,followMemo:'',warning:false,warningReason:'',warningMemo:'',posterRequest:false,posterReported:false,posterRequestMemo:'',visitCount:0,signboard:false,posterParty:'',posterMemo:'',memo:'',date:'',startTime:'',endTime:'',durationMinutes:'',googleMapsUrl:'',assigneeId:u.userId,assigneeName:u.name,createdAt:now,updatedAt:now,updatedBy:u.name};
    writeRecordByHeader_(sh,null,item);added++;if(partyId)existingPartyIds.add(partyId);
  }
  return{ok:true,added,skipped,duplicateSkipped,geocoded,failed};
}
function saveImportedLocation_(u,p){
  requireSystemAdmin_(u);const area=allowedArea_(u,p.areaId||'');if(!area)throw Error('活動エリアを選択してください');const partyId=String(p.partyId||'').trim(),lastName=cleanImportedPersonName_(p.lastName),memberType=normalizeMemberType_(p.memberType),lat=Number(p.lat),lng=Number(p.lng);if(!partyId||!lastName)throw Error('党員IDと苗字が必要です');if(!Number.isFinite(lat)||!Number.isFinite(lng)||!lat||!lng)throw Error('地図上の位置を指定してください');if(rows_(SHEETS.RECORDS).some(x=>String(x.partyId||'').trim()===partyId&&String(x.active||'').toLowerCase()!=='false'))throw Error('同じ党員IDは既に登録されています');const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.RECORDS);ensureHeadersByName_(sh,RECORD_HEADERS);const now=now_(),item={id:uuid_(),branchId:area.branchId,areaId:area.areaId,active:true,inactiveAt:'',inactiveBy:'',inactiveReason:'',source:'import',memberType,partyId,lastName,firstName:'',lastNameKana:'',firstNameKana:'',postalCode:'',birthDate:'',gender:'',occupation:'',approvedAt:'',branchParticipation:'',joinReason:'',sourceBranch:'',contactId:'',lat,lng,area:'',address:'',fullAddress:'',personName:lastName,phone:'',email:'',status:'unvisited',type:'戸建て',household:'',contact:'',revisitPriority:'',referrer:'',supporter:['party_member','supporter'].includes(memberType)?'B':'',followParty:false,followSupporter:false,followDetails:false,followDone:false,followMemo:'',warning:false,warningReason:'',warningMemo:'',posterRequest:false,posterReported:false,posterRequestMemo:'',visitCount:0,signboard:false,posterParty:'',posterMemo:'',memo:'',date:'',startTime:'',endTime:'',durationMinutes:'',googleMapsUrl:'',assigneeId:u.userId,assigneeName:u.name,createdAt:now,updatedAt:now,updatedBy:u.name};writeRecordByHeader_(sh,null,item);return{ok:true};
}

function createArea_(u,x){requireAdmin_(u);let branchId=x.branchId||u.branchId;if(u.role==='leader')branchId=u.branchId;if(!branchId)throw Error('支部を選択してください');if(!x.name)throw Error('エリア名を入力してください');const areaId=x.areaId||('area_'+uuid_().slice(0,12));SpreadsheetApp.getActive().getSheetByName(SHEETS.AREAS).appendRow([areaId,branchId,x.city||'',x.name,Number(x.mapLat)||'',Number(x.mapLng)||'',true]);return{ok:true,areaId};}
function deleteArea_(u,p){requireSystemAdmin_(u);const areaId=String(p.areaId||''),sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.AREAS),target=rowsWithRow_(SHEETS.AREAS).find(x=>String(x.areaId)===areaId);if(!target)throw Error('活動エリアが見つかりません');if(rows_(SHEETS.USERS).some(x=>truth_(x.active)&&String(x.areaId)===areaId))throw Error('利用中のユーザーがいるため削除できません');if(rows_(SHEETS.RECORDS).some(x=>String(x.areaId)===areaId&&String(x.active||'true').toLowerCase()!=='false'))throw Error('訪問先データがあるため削除できません');sh.deleteRow(target._row);return{ok:true};}
function requireAdmin_(u){if(!['leader','prefecture_admin','system_admin'].includes(u.role))throw Error('管理権限がありません');}
function requireSystemAdmin_(u){if(u.role!=='system_admin')throw Error('システム管理者権限が必要です');}
function isGlobal_(u){return['prefecture_admin','system_admin'].includes(u.role);}
function canAccessRecord_(u,r){return canAccessAreaId_(u,r.areaId);}

function bool_(v){return v===true||v===1||String(v||'').toLowerCase()==='true';}


// ===== Shared utilities =====
function ensureHeadersByName_(sh,requiredHeaders){
  if(sh.getLastRow()===0){
    sh.getRange(1,1,1,requiredHeaders.length).setValues([requiredHeaders]);
    sh.setFrozenRows(1);
    return requiredHeaders.slice();
  }
  let headers=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(String);
  requiredHeaders.forEach(h=>{
    if(!headers.includes(h)){
      headers.push(h);
      sh.getRange(1,headers.length).setValue(h);
    }
  });
  sh.setFrozenRows(1);
  return headers;
}

function writeRecordByHeader_(sh,rowNumber,item){
  const headers=ensureHeadersByName_(sh,RECORD_HEADERS);
  const width=headers.length;
  let values=new Array(width).fill('');
  if(rowNumber && rowNumber<=sh.getLastRow()){
    values=sh.getRange(rowNumber,1,1,width).getValues()[0];
  }else{
    rowNumber=sh.getLastRow()+1;
  }
  RECORD_HEADERS.forEach(h=>{
    const c=headers.indexOf(h);
    if(c>=0)values[c]=item[h]??'';
  });
  // 電話番号・メール・ID等がGoogle Sheetsに自動変換されないよう文字列列を明示
  ['id','branchId','areaId','source','memberType','partyId','lastName','firstName','lastNameKana','firstNameKana','postalCode','sourceBranch','contactId','personName','phone','email','status','type',
   'household','contact','revisitPriority','referrer','supporter','followMemo','warningReason',
   'warningMemo','lastVisitResult','posterParty','posterMemo','memo','googleMapsUrl','assigneeId',
   'assigneeName','updatedBy'].forEach(h=>{
      const c=headers.indexOf(h);
      if(c>=0)sh.getRange(rowNumber,c+1).setNumberFormat('@');
  });
  sh.getRange(rowNumber,1,1,width).setValues([values]);
  return rowNumber;
}


function ensureSheet_(ss,name,headers){let sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);if(sh.getLastRow()===0)sh.appendRow(headers);sh.setFrozenRows(1);}
function rows_(name){return rowsWithRow_(name).map(x=>{delete x._row;return x;});}
function rowsWithRow_(name){const sh=SpreadsheetApp.getActive().getSheetByName(name);if(!sh||sh.getLastRow()<2)return[];const v=sh.getDataRange().getValues(),h=v.shift().map(String);return v.map((row,i)=>{const o={_row:i+2};h.forEach((k,j)=>o[k]=row[j]);return o;});}
function cleanupSessions_(){const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.SESSIONS);if(!sh||sh.getLastRow()<2)return;const vals=sh.getDataRange().getValues();for(let i=vals.length-1;i>=1;i--)if(new Date(vals[i][2])<=new Date())sh.deleteRow(i+1);}
function hash_(password,salt){const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(salt)+'|'+String(password),Utilities.Charset.UTF_8);return bytes.map(b=>(b+256)%256).map(b=>('0'+b.toString(16)).slice(-2)).join('');}
function uuid_(){return Utilities.getUuid().replace(/-/g,'');}function now_(){return new Date().toISOString();}function truth_(v){return v===true||String(v).toLowerCase()==='true'||v===1;}function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}



// Ver.2.8.32: ログイン履歴シートを追加します。1回だけ実行してください。
