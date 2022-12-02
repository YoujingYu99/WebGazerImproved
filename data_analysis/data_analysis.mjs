import util from "../src/util.mjs";

// What the eyes look like

// const util = require('../src/util.mjs')

// console.log(eyeData[0]);
import eyeData from "./eye_rotation_data_(3).json" assert {type: 'json'};

console.log(eyeData.length);

/**
 * Saves the imagedata to image
 * Requires that getEyePatches() was called previously, else returns null.
 */
function imageDataToImage(imageData, imageNumber) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);


    var image = new Image();
    image.src = canvas.toDataURL();
    return image;
}


console.log(eyeData[0].eyes.left.patch);
console.log(eyeData[0].eyes.left.width);
console.log(eyeData[0].eyes.left.height);
console.log(eyeData[0].eyes.left.grayImage);
console.log(eyeData[0].eyes.left.equalisedFeatures);

