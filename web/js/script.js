// Store a reference in canvas
const canvas = document.querySelector(".myCanvas");
// Set width and height to be same as window
const width = (canvas.width = window.innerWidth);
const height = (canvas.height = window.innerHeight);
// Get the context
const ctx = canvas.getContext("2d");

// Set global parameters
const strokeLineWidth = 5;
const numSquares = 4;
const squareWidth = 100;
const allowedError = squareWidth / 2;
const xMargin = (canvas.width - numSquares * squareWidth) / 2;
const yMargin = (canvas.height - numSquares * squareWidth) / 2;

function renderFrame() {
  // Specify colour of background
  ctx.fillStyle = "rgb(255,255,255)";
  // Paint the background to be white
  ctx.fillRect(0, 0, width, height);

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

// Global variables: Positions of column/row index of the new red dot
var columnIndex = 0;
var rowIndex = 0;

function renderBlockRed() {
  // Re-render frame
  renderFrame();
  console.log("New block rendered");
  // Randomly choose column/row index of the block
  columnIndex = Math.floor(Math.random() * 4);
  rowIndex = Math.floor(Math.random() * 4);

  let redSquare = {
    x: xMargin + columnIndex * squareWidth + strokeLineWidth / 2,
    y: yMargin + rowIndex * squareWidth + strokeLineWidth / 2,
    w: squareWidth - strokeLineWidth,
    h: squareWidth - strokeLineWidth,
  };
  ctx.fillStyle = "rgb(255, 0, 0)";
  ctx.fillRect(redSquare.x, redSquare.y, redSquare.w, redSquare.h);
}

function determineCorrectPosition(x, y, columnIndex, rowIndex) {
  // Determine whether the predicted x and y are acceptable
  let allowedXLeft =
    xMargin + columnIndex * squareWidth + strokeLineWidth / 2 - allowedError;
  let allowedXRight =
    xMargin + columnIndex * squareWidth + strokeLineWidth / 2 + allowedError;
  let allowedYTop =
    yMargin + rowIndex * squareWidth + strokeLineWidth / 2 - allowedError;
  let allowedYBottom =
    yMargin + rowIndex * squareWidth + strokeLineWidth / 2 + allowedError;
  // Return true if the position of the eyes within error range
  if (
    allowedXLeft <= x &&
    x <= allowedXRight &&
    allowedYTop <= y &&
    y <= allowedYBottom
  ) {
    console.log("x", allowedXLeft, x, allowedXRight);
    console.log("y", allowedYTop, y, allowedYBottom);
    return true;
  }
}

let gazePositionInfo = {
  timings: [],
  xPos: [],
  yPos: [],
};

// Initialise webgazer
webgazer.begin();
// Render block
renderBlockRed();

// Record
webgazer
  .setGazeListener(function (data, elapsedTime) {
    if (data == null) {
      console.log("No data here");
      return;
    }

    var xprediction = data.x; //these x coordinates are relative to the viewport
    var yprediction = data.y; //these y coordinates are relative to the viewport
    if (
      determineCorrectPosition(xprediction, yprediction, columnIndex, rowIndex)
    ) {
      console.log("Criteria met");
      // If gaze met the criteria, render new block
      renderBlockRed();
      // Record timings and positions in arrays
      gazePositionInfo.timings.push(elapsedTime);
      gazePositionInfo.xPos.push(xprediction);
      gazePositionInfo.yPos.push(yprediction);

      // Save json object
      let gazePositionInfoJSON = JSON.stringify(gazePositionInfo);
      localStorage.setItem("gazePositionInfo", gazePositionInfoJSON);
      console.log("Item saved");
    }
  })
  .begin();
