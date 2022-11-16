var PointCalibrate = 0;
var CalibrationPoints = {};
const numClickPerPoint = 5;

// /**
//  * Clear the canvas and the calibration button.
//  */
// function clearCanvas() {
//   $(".Calibration").hide();
//   var canvas = document.getElementById("plotting_canvas");
//   canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
// }

/**
 * Show the instruction of using calibration at the start up screen.
 */
function calibrationInstruction() {
  // clearCanvas();
  swal({
    title: "Calibration",
    text: "Please click on each of the 16 points on the screen. You must click on each point 5 times till it goes yellow. This will calibrate your eye movements.",
    buttons: {
      cancel: false,
      confirm: true,
    },
  }).then((isConfirm) => {
    ShowCalibrationPoint();
  });
}

/**
 * Show the instruction of using chasing the red block.
 */
function chaseRedBlockInstruction() {
  if (blockChasingDisabled) return;
  clearCanvas();
  swal({
    title: "Chase Red Block",
    text: "Please look at the middle of the square that has turned red. When a new red square appears immediately look at the new red square.",
    buttons: {
      cancel: false,
      confirm: true,
    },
  }).then((isConfirm) => {
    // // Clear previous canvas
    // ClearCanvas();
    showFlickeringMaze();
  });
}

/**
 * Clear the calibration points and show maze
 */
function showFlickeringMaze() {
  if (blockChasingDisabled) return;
  // // Clear previous canvas
  // ClearCanvas();
  // Render frame first
  renderFrame();
  let gazePositionInfo = {
    timings: [],
    xPos: [],
    yPos: [],
  };

  // Render block
  renderBlockRed();

  // Record
  webgazer
    .setGazeListener(function (data, elapsedTime) {
      if (data == null) {
        console.log("No data here");
        return;
      }

      var xPrediction = data.x; //these x coordinates are relative to the viewport
      var yPrediction = data.y; //these y coordinates are relative to the viewport
      if (
        determineCorrectPosition(
          xPrediction,
          yPrediction,
          columnIndex,
          rowIndex
        )
      ) {
        console.log("Criteria met");
        // If gaze met the criteria, render new block
        renderBlockRed();
        // Record timings and positions in arrays
        gazePositionInfo.timings.push(elapsedTime);
        gazePositionInfo.xPos.push(xPrediction);
        gazePositionInfo.yPos.push(yPrediction);

        // Save json object
        let gazePositionInfoJSON = JSON.stringify(gazePositionInfo);
        localStorage.setItem("gazePositionInfo", gazePositionInfoJSON);
        console.log("Item saved");
      }
    })
    .begin();
}

/**
 * Show the instruction of using calibration at the start up screen.
 */
function traceShapeInstruction() {
  if (shapeTracingDisabled) return;
  clearCanvas();
  swal({
    title: "Trace Shape",
    text: "Please trace the shape of L, starting at the upper left square and ending at the lower right square.",
    buttons: {
      cancel: false,
      confirm: true,
    },
  }).then((isConfirm) => {
    showTraceShape();
  });
}

function showTraceShape() {
  if (shapeTracingDisabled) return;
  // // Clear previous canvas
  // ClearCanvas();
  // Render frame first
  renderFrame();
  let gazePositionInfo = {
    timings: [],
    xPos: [],
    yPos: [],
  };

  // Record
  webgazer
    .setGazeListener(function (data, elapsedTime) {
      if (data == null) {
        console.log("No data here");
        return;
      }

      var xPrediction = data.x; //these x coordinates are relative to the viewport
      var yPrediction = data.y; //these y coordinates are relative to the viewport

      determineBlockPositionPaint(xPrediction, yPrediction);

      // Record timings and positions in arrays
      gazePositionInfo.timings.push(elapsedTime);
      gazePositionInfo.xPos.push(xPrediction);
      gazePositionInfo.yPos.push(yPrediction);

      // Save json object
      let gazePositionInfoJSON = JSON.stringify(gazePositionInfo);
      localStorage.setItem("gazePositionInfo", gazePositionInfoJSON);
      console.log("Item saved");
    })
    .begin();
}

/**
 * Show the help instructions right at the start.
 */
function helpModalShow() {
  $("#helpModal").modal("show");
}

/**
 * Load this function when the index page starts.
 * This function listens for button clicks on the html page
 * checks that all buttons have been clicked 5 times each, and then goes on to measuring the precision
 */
$(document).ready(function () {
  clearCanvas();
  helpModalShow();
  $(".Calibration").click(function () {
    // click event on the calibration buttons
    var id = $(this).attr("id");

    if (!CalibrationPoints[id]) {
      // initialises if not done
      CalibrationPoints[id] = 0;
    }
    CalibrationPoints[id]++; // increments values

    if (CalibrationPoints[id] === 5) {
      //only turn to yellow after 5 clicks
      $(this).css("background-color", "yellow");
      $(this).prop("disabled", true); //disables the button
      PointCalibrate++;
    } else if (CalibrationPoints[id] < 5) {
      //Gradually increase the opacity of calibration points when click to give some indication to user.
      var opacity = 0.2 * CalibrationPoints[id] + 0.2;
      $(this).css("opacity", opacity);
    }

    //Show the middle calibration point after all other points have been clicked.
    if (PointCalibrate === 16) {
      // $(".Calibration").hide();
      clearCanvas();
      $("#Pt17_block").show();
    }

    if (PointCalibrate >= 17) {
      // last point is calibrated
      //using jquery to grab every element in Calibration class and hide them except the middle point.
      // $(".Calibration").hide();
      clearCanvas();
      $("#Pt17_block").show();

      // clears the canvas
      var canvas = document.getElementById("plotting_canvas");
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

      // notification for the measurement process
      swal({
        title: "Calculating measurement",
        text: "Please don't move your mouse & stare at the middle dot for the next 5 seconds. This will allow us to calculate the accuracy of our predictions.",
        closeOnEsc: false,
        allowOutsideClick: false,
        closeModal: true,
      }).then((isConfirm) => {
        // makes the variables true for 5 seconds & plots the points
        $(document).ready(function () {
          storePointsVariable(); // start storing the prediction points

          sleep(5000).then(() => {
            stopStoringPointsVariable(); // stop storing the prediction points
            var past50 = webgazer.getStoredPoints(); // retrieve the stored points
            // Access precision, x and y errors
            var accuracyMeasurement = calculatePrecisionErrors(past50)[0];
            var xAverageError = calculatePrecisionErrors(past50)[1];
            var yAverageError = calculatePrecisionErrors(past50)[2];
            document.getElementById("Accuracy").innerHTML =
              "<a>Accuracy | " + accuracyMeasurement.toPrecision(3) + "%</a>"; // Show the accuracy in the nav bar.
            // document.getElementById("xError").innerHTML =
            //   "<a>X Error | " + xAverageError.toPrecision(3) + "%</a>"; // Show the x error in the nav bar.
            // document.getElementById("yError").innerHTML =
            //   "<a>Y Error | " + yAverageError.toPrecision(3) + "%</a>"; // Show the x error in the nav bar.
            swal({
              title:
                "Your accuracy and x/y errors are " +
                accuracyMeasurement +
                "%, " +
                xAverageError +
                "px, " +
                yAverageError +
                "px.",
              allowOutsideClick: false,
              buttons: {
                cancel: "Recalibrate",
                confirm: true,
              },
            }).then((isConfirm) => {
              if (isConfirm) {
                //clear the calibration & hide the last middle button
                clearCanvas();
              } else {
                //use restart function to restart the calibration
                document.getElementById("Accuracy").innerHTML = "<a>N.A.</a>";
                // document.getElementById("xError").innerHTML = "<a>N.A.</a>";
                // document.getElementById("yError").innerHTML = "<a>N.A.</a>";
                webgazer.clearData();
                clearCalibration();
                clearCanvas();
                ShowCalibrationPoint();
              }
            });
          });
        });
      });
    }
  });
});

/**
 * Show the Calibration Points
 */
function ShowCalibrationPoint() {
  drawGridLines();
  $(".Calibration").show();
  $("#Pt17_block").hide(); // initially hides the middle button
}

function drawGridLines() {
  // Set global parameters
  let canvas = document.getElementById("plotting_canvas");
  const strokeLineWidth = 5;
  const numSquares = 4;
  const squareWidth = 100;
  const xMargin = (canvas.width - numSquares * squareWidth) / 2;
  const yMargin = (canvas.height - numSquares * squareWidth) / 2 + 50;

  // Stroke
  ctx.lineWidth = strokeLineWidth;
  // Set colour of strokes to be black
  ctx.strokeStyle = "rgb(0, 0, 0)";

  // For loop to create the 4 columns in one row then 4 rows in one column
  for (let columnCount = 0; columnCount < numSquares; columnCount += 1) {
    for (let rowCount = 0; rowCount < numSquares; rowCount += 1) {
      let square = {
        x: xMargin + columnCount * squareWidth,
        y: yMargin + rowCount * squareWidth,
        w: squareWidth,
        h: squareWidth,
      };
      // Draw the square
      ctx.strokeRect(square.x, square.y, square.w, square.h);
    }
  }
}

/**
 * This function clears the calibration buttons memory
 */
function clearCalibration() {
  // Clear data from WebGazer

  $(".Calibration").css("background-color", "red");
  $(".Calibration").css("opacity", 0.2);
  $(".Calibration").prop("disabled", false);

  CalibrationPoints = {};
  PointCalibrate = 0;
}

// sleep function because java doesn't have one, sourced from http://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
