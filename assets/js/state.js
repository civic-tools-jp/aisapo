"use strict";
window.appSession = JSON.parse(localStorage.getItem("aisapo_session") || localStorage.getItem("gdbv2_session") || "null");
let records=[], contacts=[], branches=[], areas=[], users=[], map, markers={}, editing=null, editingContact=null, editStatus="unvisited", currentAreaId=localStorage.getItem("aisapo_area")||"", branchMessages=[], activitySummary=null;
let pendingImportLocations=[];
let recordLocationMap=null,recordLocationMarker=null,recordLocationEditing=false;
let importLocationMap=null,importLocationMarker=null,pendingImportIndex=-1;
