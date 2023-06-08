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

    if (Math.abs(xDiff) < allowedError && Math.abs(yDiff) < allowedError) {
      // console.log("x diff", xDiff);
      // console.log("y diff", yDiff);
      precision = 100;
    } else {
      precision = 0;
    }

    // Store the precision and x/y errors
    precisionPercentages[i] = precision;
    xErrors[i] = Math.abs(xDiff);
    yErrors[i] = Math.abs(yDiff);
  }
}

/**
 * Calculates the average of all precision percentages, x errors and y errors calculated
 */
function calculateAverage(dataArray) {
  // let data = 0;
  // for (i = 0; i < 50; i++) {
  //   data += dataArray[i];
  // }
  // data = data / 50;

  // Remove NaN values
  let dataArrayNoNan = dataArray.filter(function (value) {
    return !Number.isNaN(value);
  });

  if (dataArrayNoNan.length < 50) {
    last50Points = dataArrayNoNan;
  } else {
    last50Points = dataArrayNoNan.slice(-50);
  }
  // let last50Points = dataArrayNoNan; // TODO: change back to 50 if not custom kernel
  let dataSum = last50Points.reduce((a, b) => a + b, 0);
  return dataSum / last50Points.length || 0;
}

/**
 * Sets store_points to true, so all the occuring prediction
 * points are stored
 */
function storePointsVariable() {
  webgazer.params.storingPoints = true;
}

/**
 * Sets store_points to false, so prediction points aren't
 * stored any more
 */
function stopStoringPointsVariable() {
  webgazer.params.storingPoints = false;
}
