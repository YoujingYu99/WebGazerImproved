// import localforage from "localforage";
localforage = require("localforage");

var localstorageDataLabel = "webgazerGlobalData";
var localstorageSettingsLabel = "webgazerGlobalSettings";

var loadData = localforage.getItem(localstorageDataLabel);
console.log(loadData);
