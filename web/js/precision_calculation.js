/**
 * This function calculates a measurement for how precise
 * the eye tracker currently is which is displayed to the user
 */
function calculatePrecisionErrors(past50Array) {
  var windowHeight = $(window).height();
  var windowWidth = $(window).width();

  // Retrieve the last 50 gaze prediction points
  var x50 = past50Array[0];
  var y50 = past50Array[1];

  // Calculate the position of the point the user is staring at
  var staringPointX = windowWidth / 2;
  var staringPointY = windowHeight / 2;

  var precisionPercentages = new Array(50);
  var xErrors = new Array(50);
  var yErrors = new Array(50);

  calculatePrecisionPercentages(
    precisionPercentages,
    xErrors,
    yErrors,
    windowHeight,
    x50,
    y50,
    staringPointX,
    staringPointY
  );
  var precision = calculateAverage(precisionPercentages);
  let xAverageError = calculateAverage(xErrors);
  let yAverageError = calculateAverage(yErrors);

  // Return the precision measurement as a rounded percentage
  return [Math.round(precision), xAverageError, yAverageError];
}

/**
 * Calculate percentage accuracy for each prediction based on distance of
 * the prediction point from the centre point (uses the window height as
 * lower threshold 0%)
 */
function calculatePrecisionPercentages(
  precisionPercentages,
  xErrors,
  yErrors,
  windowHeight,
  x50,
  y50,
  staringPointX,
  staringPointY
) {
  for (i = 0; i < 50; i++) {
    // Calculate distance between each prediction and staring point
    var xDiff = staringPointX - x50[i];
    var yDiff = staringPointY - y50[i];
    var distance = Math.sqrt(xDiff * xDiff + yDiff * yDiff);

    // // Calculate precision percentage
    // var halfWindowHeight = windowHeight / 2;
    // var precision = 0;
    // if (distance <= halfWindowHeight && distance > -1) {
    //   precision = 100 - (distance / halfWindowHeight) * 100;
    // } else if (distance > halfWindowHeight) {
    //   precision = 0;
    // } else if (distance > -1) {
    //   precision = 100;
    // }

    // New accuracy measure for the square box detection
    let allowedError = 50;
    if (xDiff <= allowedError && yDiff <= allowedError) {
      console.log("x diff", xDiff);
      console.log("y diff", yDiff);
      precision = 100;
    } else {
      precision = 0;
    }

    // console.log("x diff", xDiff);
    // console.log("y diff", yDiff);
    // console.log("Half window height", halfWindowHeight);
    // console.log("Precision", precision);

    // Store the precision and x/y errors
    precisionPercentages[i] = precision;
    xErrors[i] = xDiff;
    yErrors[i] = yDiff;
  }
}

/**
 * Calculates the average of all precision percentages, x errors and y errors calculated
 */
function calculateAverage(dataArray) {
  let data = 0;
  for (i = 0; i < 50; i++) {
    data += dataArray[i];
  }
  data = data / 50;
  return data;
}

function determineBlockPosition(xPrediction, yPrediction) {
  // For loop to determine the boundaries of each block.
  for (let columnCount = 0; columnCount < numSquares; columnCount += 1) {
    for (let rowCount = 0; rowCount < numSquares; rowCount += 1) {
      let square = {
        xLeft: xMargin + columnCount * squareWidth,
        xRight: xMargin + columnCount * squareWidth + squareWidth,
        yTop: yMargin + rowCount * squareWidth,
        yBottom: yMargin + rowCount * squareWidth + squareWidth,
        w: squareWidth - strokeLineWidth,
        h: squareWidth - strokeLineWidth,
      };
      if (
        square.xLeft <= xPrediction &&
        xPrediction <= square.xRight &&
        square.yTop <= yPrediction &&
        yPrediction <= square.yBottom
      ) {
        // Paint the calculated blocks grey
        ctx.fillStyle = "rgb(178, 190, 181)";
        ctx.fillRect(
          square.xLeft + strokeLineWidth / 2,
          square.yTop + strokeLineWidth / 2,
          square.w,
          square.h
        );
      }
    }
  }
}