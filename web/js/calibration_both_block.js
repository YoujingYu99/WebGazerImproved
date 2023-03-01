var PointCalibrate = 0;
var PointBlockCalibrate = 0;
var PointDataCollection = 0;
var CalibrationPoints = {};
var CalibrationBlockPoints = {};
var DataCollectionPoints = {};
const numClickPerPoint = 3;
var buttonCount = 1;
const numDataPointsToCollect = 500;

/**
 * Clear the canvas and the calibration button.
 */
function clearCanvas() {
  $(".Calibration").hide();
  $(".CalibrationBlock").hide();
  var canvas = document.getElementById("plotting_canvas");
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Show the instruction of using calibration at the start up screen.
 */
function calibrationInstructionNine() {
  clearCanvas();
  swal({
    title: "Calibration A: Nine Points",
    text: "Please click on each of the 9 points on the screen. You must click on each point 5 times till it goes yellow. This will calibrate your eye movements.",
    buttons: {
      cancel: false,
      confirm: true,
    },
  }).then((isConfirm) => {
    ShowCalibrationPointNine();
  });
}

/**
 * Show the instruction of using calibration at the start up screen.
 */
function calibrationInstructionBlock() {
  // clearCanvas();
  swal({
    title: "Calibration B: 4 by 4 Grid",
    text: "Please click on each of the 16 points on the screen. You must click on each point 5 times till it goes yellow. This will calibrate your eye movements.",
    buttons: {
      cancel: false,
      confirm: true,
    },
  }).then((isConfirm) => {
    ShowCalibrationPointBlock();
  });
}

/**
 * Show the instruction of using calibration at the start up screen.
 */
function dataCollectionRandomInstruction() {
  clearCanvas();
  swal({
    title: "Data Collection: Random Points",
    text: "Please click five times on the red point on the screen. You must click on each point 5 times till it goes yellow.",
    buttons: {
      cancel: false,
      confirm: true,
    },
  }).then((isConfirm) => {
    dataCollectionRandomPoint(buttonCount);
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
    // clearCanvas();
    showFlickeringMaze();
  });
}

/**
 * Clear the calibration points and show maze
 */
function showFlickeringMaze() {
  if (blockChasingDisabled) return;
  // // Clear previous canvas
  // clearCanvas();
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
  // clearCanvas();
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

  // When clicking on the nine points
  $(".Calibration").click(function () {
    // click event on the calibration buttons
    var id = $(this).attr("id");

    if (!CalibrationPoints[id]) {
      // initialises if not done
      CalibrationPoints[id] = 0;
    }
    CalibrationPoints[id]++; // increments values

    if (CalibrationPoints[id] === numClickPerPoint) {
      //only turn to yellow after 5 clicks
      $(this).css("background-color", "yellow");
      $(this).prop("disabled", true); //disables the button
      PointCalibrate++;
    } else if (CalibrationPoints[id] < numClickPerPoint) {
      //Gradually increase the opacity of calibration points when click to give some indication to user.
      var opacity = 0.2 * CalibrationPoints[id] + 0.2;
      $(this).css("opacity", opacity);
    }

    //Show the middle calibration point after all other points have been clicked.
    if (PointCalibrate === 8) {
      // $(".Calibration").hide();
      clearCanvas();
      $("#Pt5").show();
    }

    if (PointCalibrate >= 9) {
      // last point is calibrated
      //using jquery to grab every element in Calibration class and hide them except the middle point.
      // $(".Calibration").hide();
      clearCanvas();
      $("#Pt5").show();

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
                // Go to the next calibration task
                // RestartBlock();
                clearCanvas();
                webgazer.calibrationPhase = false; // Stop storing datapoints after calibration
                // If we don't want the next block calibration phase, just call clearCanvas();
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

  // When clicking on the 16 points
  $(".CalibrationBlock").click(function () {
    // click event on the calibration buttons
    var id = $(this).attr("id");

    if (!CalibrationBlockPoints[id]) {
      // initialises if not done
      CalibrationBlockPoints[id] = 0;
    }
    CalibrationBlockPoints[id]++; // increments values

    if (CalibrationBlockPoints[id] === numClickPerPoint) {
      //only turn to yellow after 5 clicks
      $(this).css("background-color", "yellow");
      $(this).prop("disabled", true); //disables the button
      PointBlockCalibrate++;
    } else if (CalibrationBlockPoints[id] < numClickPerPoint) {
      //Gradually increase the opacity of calibration points when click to give some indication to user.
      var opacity = 0.2 * CalibrationBlockPoints[id] + 0.2;
      $(this).css("opacity", opacity);
    }

    //Show the middle calibration point after all other points have been clicked.
    if (PointBlockCalibrate === 16) {
      // $(".Calibration").hide();
      clearCanvas();
      $("#Pt17_block").show();
    }

    if (PointBlockCalibrate >= 17) {
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
                calibrationInstructionNine();
              }
            });
          });
        });
      });
    }
  });

  // When clicking on the randomly appearing data points.
  $(".dataCollection").click(function () {
    // click event on the calibration buttons
    var id = $(this).attr("id");
    console.log("point clicked");
    if (!DataCollectionPoints[id]) {
      // initialises if not done
      DataCollectionPoints[id] = 0;
    }
    DataCollectionPoints[id]++; // increments values

    if (DataCollectionPoints[id] === numClickPerPoint) {
      // Disable after 5 clicks
      $(this).prop("disabled", true); //disables the button
      PointDataCollection++;
      // Increase the count of a button.
      buttonCount++;
      clearCanvas();
      // If still need to collect more data
      if (buttonCount < numDataPointsToCollect) {
        // Generate new button
        generateRandomButton(buttonCount);
      } else {
      }
    } else if (DataCollectionPoints[id] < numClickPerPoint) {
      // Gradually increase the opacity of calibration points when click to give some indication to user.
      var opacity = 0.2 * DataCollectionPoints[id] + 0.2;
      $(this).css("opacity", opacity);
    }
  });
});

/**
 * Show the 9 Calibration Points
 */
function ShowCalibrationPointNine() {
  $(".Calibration").show();
  $("#Pt5").hide(); // initially hides the middle button
}

/**
 * Show the 16 Calibration Points
 */
function ShowCalibrationPointBlock() {
  drawGridLines();
  $(".Calibration").hide();
  $(".CalibrationBlock").show();
  console.log("red dots should show");
  $("#Pt17_block").hide(); // initially hides the middle button
}

/**
 * Generate Random Integer.
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

/**
 * Generate Random button.
 */
function generateRandomButton(buttonCount) {
  // Get canvas element
  let canvas = document.getElementById("plotting_canvas");

  let buttonDataCollection = document.createElement("input");
  // Set attributes
  buttonDataCollection.setAttribute("type", "button");
  // buttonDataCollection.setAttribute(
  //   "class",
  //   "dataCollection" + buttonCount.toString()
  // );
  buttonDataCollection.setAttribute("class", "dataCollection");
  buttonDataCollection.setAttribute(
    "id",
    "Pt" + buttonCount.toString() + "_datacollection"
  );

  // Set CSS
  buttonDataCollection.style.width = "20px";
  buttonDataCollection.style.height = "20px";
  buttonDataCollection.style.opacity = "0.2";
  buttonDataCollection.style.position = "fixed";
  buttonDataCollection.style["-webkit-border-radius"] = "25px";
  buttonDataCollection.style["-moz-border-radius"] = "25px";
  buttonDataCollection.style["border-radius"] = "25px";
  buttonDataCollection.style["background-color"] = "red";
  buttonDataCollection.style["border-color"] = "black";
  buttonDataCollection.style["border-style"] = "solid";

  // Set position
  // let randomTop = getRandomInt(canvas.height * 0.05, canvas.height * 0.95);
  // let randomLeft = getRandomInt(canvas.width * 0.05, canvas.width * 0.95);
  // // If randomTop/Left in the video range
  // if (0 <= randomTop <= 241) {
  //   randomLeft = getRandomInt(321, canvas.width * 0.95);
  // }
  // if (0 <= randomLeft <= 321) {
  //   randomTop = getRandomInt(241, canvas.height * 0.95);
  // }

  let index = getRandomInt(0, 3);
  let randomTop;
  let randomLeft;

  if (index === 0) {
    randomTop = getRandomInt(canvas.height * 0.1, 241);
    randomLeft = getRandomInt(321, canvas.width * 0.95);
  } else if (index === 1) {
    randomTop = getRandomInt(241, canvas.height * 0.95);
    randomLeft = getRandomInt(canvas.width * 0.05, 321);
  } else {
    randomTop = getRandomInt(canvas.height * 0.05, canvas.height * 0.95);
    randomLeft = getRandomInt(canvas.width * 0.05, canvas.width * 0.95);
    // If randomTop/Left in the video range
    if (0 <= randomTop <= 241) {
      randomLeft = getRandomInt(321, canvas.width * 0.95);
    }
    if (0 <= randomLeft <= 321) {
      randomTop = getRandomInt(241, canvas.height * 0.95);
    }
  }

  buttonDataCollection.style.top = randomTop + "px";
  buttonDataCollection.style.left = randomLeft + "px";
  // buttonDataCollection.style.top = "50vh";
  // buttonDataCollection.style.left = "50vw";
  document.body.appendChild(buttonDataCollection);
}

/**
 * Show the randomly appearing data points.
 */
function dataCollectionRandomPoint(buttonCount) {
  // Generate the first button
  generateRandomButton(buttonCount);

  // let buttonPresentClass = "dataCollection" + buttonCount.toString();
  let buttonPresentID = "Pt" + buttonCount.toString() + "_datacollection";
  // var buttonPresent = document.getElementsByClassName(buttonPresentClass)[0];
  var buttonPresent = document.getElementById(buttonPresentID);
  console.log("got the button");
  buttonPresent.addEventListener(
    "click",
    function (e) {
      {
        // click event on the calibration buttons
        var id = buttonPresentID;
        console.log("point clicked here");
        if (!DataCollectionPoints[id]) {
          // initialises if not done
          DataCollectionPoints[id] = 0;
        }
        DataCollectionPoints[id]++; // increments values

        if (DataCollectionPoints[id] === numClickPerPoint) {
          // Disable after 5 clicks
          $(buttonPresent).prop("disabled", true); //disables the button
          PointDataCollection++;
          // Increase the count of a button.
          buttonCount++;
          clearCanvas();
          // If still need to collect more data
          if (buttonCount < numDataPointsToCollect) {
            // Generate new button
            // generateRandomButton(buttonCount);
            dataCollectionRandomPoint(buttonCount);
          } else {
            stopDataCollection();
          }
        } else if (DataCollectionPoints[id] < numClickPerPoint) {
          // Gradually increase the opacity of calibration points when click to give some indication to user.
          var opacity = 0.2 * DataCollectionPoints[id] + 0.2;
          $(buttonPresent).css("opacity", opacity);
        }
      }
    },
    false
  );
}

function stopDataCollection() {
  // clearCanvas();
  swal({
    title: "Finished Data Collection",
    text: "You have completed the data collection task!",
    buttons: {
      cancel: false,
      confirm: true,
    },
  }).then((isConfirm) => {
    clearCanvas();
  });
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
