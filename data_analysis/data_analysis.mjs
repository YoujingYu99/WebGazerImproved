import util from "../src/util.mjs";

// const util = require('../src/util.mjs')

// console.log(eyeData[0]);
import eyeData from "./eye_rotation_data.json" assert {type: 'json'};

console.log(eyeData[0].eyes.left.equalisedFeatures.length);

