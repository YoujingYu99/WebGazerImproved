let shapeTracingDisabled = false;
let blockChasingDisabled = false;
let videoPosition = 0;

window.onload = async function () {
  //start the webgazer tracker
  await webgazer
    .setRegression(
      "totalRegression",
      "GP",
      "SE"
    ) /* currently must set regression and tracker */
    //.setTracker('clmtrackr')
    .setGazeListener(function (data, clock) {
      //   console.log(data); /* data is an object containing an x and y key which are the x and y prediction coordinates (no bounds limiting) */
      //   console.log(clock); /* elapsed time in milliseconds since webgazer.begin() was called */
    })
    .saveDataAcrossSessions(false)
    .begin();
  webgazer
    .showVideoPreview(true) /* shows all video previews */
    .showPredictionPoints(
      true
    ) /* shows a square every 100 milliseconds where current prediction is */
    .applyKalmanFilter(true)
    .useTrail(
      false
    ); /* Kalman Filter defaults to on. Can be toggled by user. */

  //Set up the webgazer video feedback.
  var setup = function () {
    //Set up the main canvas. The main canvas is used to calibrate the webgazer.
    var canvas = document.getElementById("plotting_canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = "fixed";
  };
  setup();
};

// Set to true if you want to save the data even if you reload the page.
window.saveDataAcrossSessions = false;

window.onbeforeunload = function () {
  webgazer.end();
};

/**
 * Clear the canvas and the calibration button.
 */
function clearCanvas() {
  $(".Calibration").hide();
  $(".dataCollection").hide();
  var canvas = document.getElementById("plotting_canvas");
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * This function clears the calibration buttons memory
 */
function ClearCalibration() {
  // Clear data from WebGazer

  $(".Calibration").css("background-color", "red");
  $(".Calibration").css("opacity", 0.2);
  $(".Calibration").prop("disabled", false);

  CalibrationPoints = {};
  // CalibrationBlockPoints = {};
  PointCalibrate = 0;
  // PointBlockCalibrate = 0;
}

/**
 * Restart the calibration process for nine points by clearing the local storage
 *  and resetting the calibration point
 */
function Restart() {
  document.getElementById("Accuracy").innerHTML = "<a>N.A.</a>";
  clearCanvas();
  $(".lpd_bspot").hide();
  webgazer.clearData();
  ClearCalibration();
  calibrationInstructionNine();
}

/**
 * Clear the calibration points and show flickering maze
 */
function chaseFlickeringMaze() {
  clearCanvas();
  $(".lpd_bspot").hide();
  chaseRedBlockInstruction();
}

/**
 * Clear the calibration points and trace shape.
 */
function traceShapeMaze() {
  clearCanvas();
  $(".lpd_bspot").hide();
  traceShapeInstruction();
}

/**
 * Save user eye Rotation data; used in data collection process.
 */
function saveData() {
  clearCanvas();
  $(".lpd_bspot").hide();

  // retrieve data from webgazer
  let downloadData = webgazer.storeData;
  // Create a blob of the data
  var fileToSave = new Blob([JSON.stringify(downloadData)], {
    type: "application/json",
  });
  saveAs(fileToSave, "eye_rotation_data.json");
  console.log("JSON data is saved.");
}

/**
 * Start the data collection process.
 */
function dataCollection() {
  document.getElementById("Accuracy").innerHTML = "<a>N.A.</a>";
  clearCanvas();
  webgazer.clearData();
  $(".lpd_bspot").hide();
  dataCollectionRandomInstruction();
}
