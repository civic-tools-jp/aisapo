"use strict";
const SCRIPT_URL="https://script.google.com/macros/s/AKfycbw7-S6rVIB7vShXDlR_b93ec771ewFje8XwnSmIexeTcInrkMXc4sYVeuOlwEtfsXCasw/exec";
const STATUS={unvisited:{label:"未訪問",icon:"⌂",color:"#94a3b8"},visited:{label:"訪問済",icon:"✓",color:"#3b82f6"},good:{label:"手応え",icon:"♥",color:"#22c55e"},absent:{label:"不在",icon:"🚪",color:"#f59e0b"},revisit:{label:"再訪予定",icon:"↻",color:"#ef4444"},refused:{label:"断られた",icon:"×",color:"#6b7280"}};
const STATUS_ALIASES={
  "未訪問":"unvisited",
  "訪問済":"visited",
  "訪問済み":"visited",
  "手応えあり":"good",
  "不在":"absent",
  "要再訪":"revisit",
  "再訪予定":"revisit",
  "断られた":"refused"
};
function statusKey(value){
  const v=String(value||"").trim();
  const k=STATUS[v] ? v : (STATUS_ALIASES[v] || "unvisited");
  return k==="good" ? "visited" : k;
}

