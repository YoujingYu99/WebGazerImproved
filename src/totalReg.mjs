import util from './util';
import util_regression from './util_regression';
import params from './params';
import webgazer from "./index.mjs";

const reg = {};

/**
 * Constructor of TotalReg object,
 * this object allow to perform ridge regression
 * @constructor
 */
reg.TotalReg = function () {
    this.init();
};

/**
 * Initialize new arrays and initialize Kalman filter.
 */
reg.TotalReg.prototype.init = util_regression.InitRegression

/**
 * Add given data from eyes
 * @param {Object} eyes - eyes where extract data to add
 * @param {Object} screenPos - The current screen point
 * @param {Object} type - The type of performed action
 */
reg.TotalReg.prototype.addData = util_regression.addData

/**
 * Add given data from eyes image and rotational angles
 * @param {Object} eyes - eyes where extract data to add
 * @param {Object} rotationAngles - The current rotational angles
 * @param {Object} type - The type of performed action
 */
reg.TotalReg.prototype.addRotationData = util_regression.addRotationData

/**
 * Try to predict coordinates from pupil data
 * after apply linear regression on data set
 * @param {Object} eyesObj - The current user eyes object
 * @returns {Object}
 */
reg.TotalReg.prototype.predict = function (eyesObj) {
    if (!eyesObj || this.eyeFeaturesClicks.length === 0) {
        return null;
    }
    // accept times is how long it has been after the trailtime, which is 1000ms
    var acceptTime = performance.now() - this.trailTime;
    var trailX = [];
    var trailY = [];
    var trailFeat = [];
    // trailDataWindow is 1000/50=20.
    for (var i = 0; i < this.trailDataWindow; i++) {
        // What is happening here?
        if (this.trailTimes.get(i) > acceptTime) {
            // Cursor trail positions
            trailX.push(this.screenXTrailArray.get(i));
            trailY.push(this.screenYTrailArray.get(i));
            trailFeat.push(this.eyeFeaturesTrail.get(i));
            // console.log("i", i);
            // console.log("trailtimes.get(i)", this.trailTimes.get(i));
            // console.log("accept time", acceptTime);
            // console.log("trailX length", trailX.length)
        }
    }
    // eyeFeaturesTrail contains eye size as grey histogram;
    // screenX/YTrailArray contains the cursor movements;
    var screenXArray = this.screenXClicksArray.data.concat(trailX);
    var screenYArray = this.screenYClicksArray.data.concat(trailY);

    // size n * 120, n varies depending on how many datapoints are accepted
    var eyeFeatures = this.eyeFeaturesClicks.data.concat(trailFeat);

    // eyeFeatures needs to be the 120 pixel eye features;
    var coefficientsX = util_regression.ridge(screenXArray, eyeFeatures, this.ridgeParameter);
    var coefficientsY = util_regression.ridge(screenYArray, eyeFeatures, this.ridgeParameter);

    // Eye grey histogram for both left and right eyes
    // length 120
    var [eyeGraysCurrent, eyeFeatsCurrent] = util.getEyeFeats(eyesObj);


    var predictedX = 0;
    for (var i = 0; i < eyeFeatsCurrent.length; i++) {
        predictedX += eyeFeatsCurrent[i] * coefficientsX[i];
    }
    var predictedY = 0;
    for (var i = 0; i < eyeFeatsCurrent.length; i++) {
        predictedY += eyeFeatsCurrent[i] * coefficientsY[i];
    }

    predictedX = Math.floor(predictedX);
    predictedY = Math.floor(predictedY);

    if (params.applyKalmanFilter) {
        // Update Kalman model, and get prediction
        var newGaze = [predictedX, predictedY]; // [20200607 xk] Should we use a 1x4 vector?
        newGaze = this.kalman.update(newGaze);

        return {
            x: newGaze[0],
            y: newGaze[1]
        };
    } else {
        return {
            x: predictedX,
            y: predictedY
        };
    }
};

/**
 * Try to predict eye rotation from pupil data
 * after apply linear regression on data set
 * @param {Object} eyesObj - The current user eyes object
 * @returns {Object}
 */
reg.TotalReg.prototype.predictRotation = function (eyesObj) {
    if (!eyesObj || this.eyeFeaturesClicks.length === 0) {
        return null;
    }
    // accept times is how long it has been after the trailtime, which is 1000ms
    var acceptTime = performance.now() - this.trailTime;
    var trailX = [];
    var trailY = [];
    var trailXAngle = [];
    var trailYAngle = [];
    var trailFeat = [];
    // trailDataWindow is 1000/50=20.
    for (var i = 0; i < this.trailDataWindow; i++) {
        // What is happening here?
        if (this.trailTimes.get(i) > acceptTime) {
            trailFeat.push(this.eyeFeaturesTrail.get(i));
            trailXAngle.push(this.screenXAngleTrailArray.get(i));
            trailYAngle.push(this.screenYAngleTrailArray.get(i));
            // console.log(i);
            // console.log(this.trailTimes.get(i));
            // console.log(acceptTime);
        }
    }

    // screenX/YTrailArray contains the cursor movements;
    var screenXArray = this.screenXClicksArray.data.concat(trailX);
    var screenYArray = this.screenYClicksArray.data.concat(trailY);
    // screenX/YAngleArray contains the angles;
    var xAngleArray = this.screenXAngleArray.data.concat(trailXAngle);
    var yAngleArray = this.screenYAngleArray.data.concat(trailYAngle);


    // size n * 120, n varies depending on how many datapoints are accepted
    var eyeFeatures = this.eyeFeaturesClicks.data.concat(trailFeat);
    // console.log("eye feature length", eyeFeatures.length)

    // eyeFeatures needs to be the 120 pixel eye features;
    // console.log(eyeFeatures)
    var coefficientsX = util_regression.ridge(xAngleArray, eyeFeatures, this.ridgeParameter);
    var coefficientsY = util_regression.ridge(yAngleArray, eyeFeatures, this.ridgeParameter);

    // Eye grey histogram for both left and right eyes
    // length 120
    // console.log("get eye features")
    var [eyeGraysCurrent, eyeFeatsCurrent] = util.getEyeFeats(eyesObj);


    var predictedXAngle = 0;
    for (var i = 0; i < eyeFeatsCurrent.length; i++) {
        predictedXAngle += eyeFeatsCurrent[i] * coefficientsX[i];
    }
    var predictedYAngle = 0;
    for (var i = 0; i < eyeFeatsCurrent.length; i++) {
        predictedYAngle += eyeFeatsCurrent[i] * coefficientsY[i];
    }

    // Convert the predicted angles (in radians) to position
    // Convert from actual to pixel density
    let predictedX = webgazer.xDist + webgazer.currentViewingDistance * Math.tan(predictedXAngle) * webgazer.LPD
    let predictedY = webgazer.yDist - webgazer.currentViewingDistance * Math.tan(predictedYAngle) * webgazer.LPD

    if (params.applyKalmanFilter) {
        // Update Kalman model, and get prediction
        var newGaze = [predictedX, predictedY]; // [20200607 xk] Should we use a 1x4 vector?
        newGaze = this.kalman.update(newGaze);

        return {
            x: newGaze[0],
            y: newGaze[1]
        };
    } else {
        return {
            x: predictedX,
            y: predictedY
        };
    }
};


// Only compute beforehand if using custom Kernel
util_regression.width_matrix_custom_x = util_regression.getDistMatrix(10, params.l_width_x)
util_regression.height_matrix_custom_x = util_regression.getDistMatrix(6, params.l_height_x)
util_regression.width_matrix_custom_y = util_regression.getDistMatrix(10, params.l_width_y)
util_regression.height_matrix_custom_y = util_regression.getDistMatrix(6, params.l_height_y)


/**
 * Try to predict eye rotation from pupil data using Gaussian Process SE kernel.
 * after apply linear regression on data set.
 * @param {Object} eyesObj - The current user eyes object.
 * @param {Boolean} useTrail - Whether to use trail data.
 * @param {String} kernel - which kernel to use. SE, RQ or custom
 * @returns {Object}
 */
reg.TotalReg.prototype.predictRotationGP = function (eyesObj, useTrail, kernel) {
    if (!eyesObj || this.eyeFeaturesClicks.length === 0) {
        return null;
    }

    if (useTrail) {
        // accept times is how long it has been after the trail time, the trail time is 1000ms.
        // This is so we accept trails during th 1000ms window
        var acceptTime = performance.now() - this.trailTime;
        var trailXAngle = [];
        var trailYAngle = [];
        var trailFeat = [];
        // trailDataWindow is 1000/50=20. There are 20 data points in the 1000ms window.
        for (var i = 0; i < this.trailDataWindow; i++) {
            // If the trail time is within the 1000ms window after the click
            if (this.trailTimes.get(i) > acceptTime) {
                trailFeat.push(this.eyeFeaturesTrail.get(i));
                trailXAngle.push(this.screenXAngleTrailArray.get(i));
                trailYAngle.push(this.screenYAngleTrailArray.get(i));
                // console.log("trailtimes.get(i)", this.trailTimes.get(i));
                // console.log("accept time", acceptTime);
                // console.log("trailX length", trailXAngle.length)
            }

            // eyeFeaturesTrail contains eye size as grey histogram;
            // screenX/YAngleArray contains the angles;
            var xAngleArray = this.screenXAngleArray.data.concat(trailXAngle);
            var yAngleArray = this.screenYAngleArray.data.concat(trailYAngle);


            // size n * 120, n varies depending on how many datapoints are accepted
            var eyeFeatures = this.eyeFeaturesClicks.data.concat(trailFeat);
        }
    } else {
        var xAngleArray = this.screenXAngleArray.data;
        var yAngleArray = this.screenYAngleArray.data;


        // size n * 120, n varies depending on how many datapoints are accepted
        var eyeFeatures = this.eyeFeaturesClicks.data;
    }

    // Eye grey histogram for both left and right eyes
    // length 120
    var [eyeGraysCurrent, eyeFeatsCurrent] = util.getEyeFeats(eyesObj);


    // SE Kernel
    // let [predictedXAngle, predictedXVariance] = util_regression.GPSERegressor(eyeFeatures, xAngleArray, eyeFeatsCurrent, params.sigma_one_x, params.length_scale_x, params.sigma_two_x, 120, "horizontal")
    // let [predictedYAngle, predictedYVariance] = util_regression.GPSERegressor(eyeFeatures, yAngleArray, eyeFeatsCurrent, params.sigma_one_y, params.length_scale_y, params.sigma_two_y, 120, "vertical")


    let predictedXAngle = null
    let predictedXVariance = null
    let predictedYAngle = null
    let predictedYVariance = null

    if (kernel === "SE") {
        // SE kernel
        // Only stop updating if both not using trail and not in calibration phase
        if (!useTrail && !webgazer.calibrationPhase) {
            [predictedXAngle, predictedXVariance] = util_regression.GPSERegressorFixed(eyeFeatsCurrent, params.sigma_one_x, params.length_scale_x, params.sigma_two_x, 120, "horizontal");
            [predictedYAngle, predictedYVariance] = util_regression.GPSERegressorFixed(eyeFeatsCurrent, params.sigma_one_y, params.length_scale_y, params.sigma_two_y, 120, "vertical");

        } else {
            [predictedXAngle, predictedXVariance] = util_regression.GPSERegressor(eyeFeatures, xAngleArray, eyeFeatsCurrent, params.sigma_one_x, params.length_scale_x, params.sigma_two_x, 120, "horizontal");
            [predictedYAngle, predictedYVariance] = util_regression.GPSERegressor(eyeFeatures, yAngleArray, eyeFeatsCurrent, params.sigma_one_y, params.length_scale_y, params.sigma_two_y, 120, "vertical");
        }
    } else if (kernel === "RQ") {
        // RQ Kernel
        if (!useTrail && !webgazer.calibrationPhase) {

            [predictedXAngle, predictedXVariance] = util_regression.GPRQRegressorFixed(eyeFeatsCurrent, params.sigma_one_RQ_x, params.length_scale_RQ_x, params.alpha_RQ_x, params.sigma_two_RQ_x, 120, "horizontal");
            [predictedYAngle, predictedYVariance] = util_regression.GPRQRegressorFixed(eyeFeatsCurrent, params.sigma_one_RQ_y, params.length_scale_RQ_y, params.alpha_RQ_y, params.sigma_two_RQ_y, 120, "vertical");
        } else {
            [predictedXAngle, predictedXVariance] = util_regression.GPRQRegressor(eyeFeatures, xAngleArray, eyeFeatsCurrent, params.sigma_one_RQ_x, params.length_scale_RQ_x, params.alpha_RQ_x, params.sigma_two_RQ_x, 120, "horizontal");
            [predictedYAngle, predictedYVariance] = util_regression.GPRQRegressor(eyeFeatures, yAngleArray, eyeFeatsCurrent, params.sigma_one_RQ_y, params.length_scale_RQ_y, params.alpha_RQ_y, params.sigma_two_RQ_y, 120, "vertical");
        }
    } else {
        // Custom Kernel
        if (!useTrail && !webgazer.calibrationPhase) {
            console.log("using fixed");
            [predictedXAngle, predictedXVariance] = util_regression.GPCustomRegressorLoopFixed(eyeFeatsCurrent, params.M_x, params.sigma_one_custom_x, params.sigma_two_custom_x, width_matrix_custom_x, height_matrix_custom_x, 120, "horizontal");
            [predictedYAngle, predictedYVariance] = util_regression.GPCustomRegressorLoopFixed(eyeFeatsCurrent, params.M_y, params.sigma_one_custom_y, params.sigma_two_custom_y, width_matrix_custom_y, height_matrix_custom_y, 120, "horizontal");
            // let [predictedXAngle, predictedXVariance] = util_regression.GPCustomRegressorFixed(eyeFeatsCurrent, params.M_x, params.sigma_one_custom_x, params.sigma_two_custom_x, util_regression.width_matrix_custom_x, util_regression.height_matrix_custom_x, 120, "horizontal");
            // let [predictedYAngle, predictedYVariance] = util_regression.GPCustomRegressorFixed(eyeFeatsCurrent, params.M_y, params.sigma_one_custom_y, params.sigma_two_custom_y, util_regression.width_matrix_custom_y, util_regression.height_matrix_custom_y, 120, "vertical");
        } else {
            console.log("adding predictions");
            [predictedXAngle, predictedXVariance] = util_regression.GPCustomRegressorLoop(eyeFeatures, xAngleArray, eyeFeatsCurrent, params.M_x, params.sigma_one_custom_x, params.sigma_two_custom_x, util_regression.width_matrix_custom_x, util_regression.height_matrix_custom_x, 120, "horizontal");
            [predictedYAngle, predictedYVariance] = util_regression.GPCustomRegressorLoop(eyeFeatures, yAngleArray, eyeFeatsCurrent, params.M_y, params.sigma_one_custom_y, params.sigma_two_custom_y, util_regression.width_matrix_custom_y, util_regression.height_matrix_custom_y, 120, "vertical");
            // let [predictedXAngle, predictedXVariance] = util_regression.GPCustomRegressor(eyeFeatures, xAngleArray, eyeFeatsCurrent, params.M_x, params.sigma_one_custom_x, params.sigma_two_custom_x, util_regression.width_matrix_custom_x, util_regression.height_matrix_custom_x, 120, "horizontal");
            // let [predictedYAngle, predictedYVariance] = util_regression.GPCustomRegressor(eyeFeatures, yAngleArray, eyeFeatsCurrent, params.M_y, params.sigma_one_custom_y, params.sigma_two_custom_y, util_regression.width_matrix_custom_y, util_regression.height_matrix_custom_y, 120, "vertical");
        }
    }

    // Convert the predicted angles (in radians) to position
    // Convert from actual to pixel density
    let predictedX = webgazer.xDist + webgazer.currentViewingDistance * Math.tan(predictedXAngle) * webgazer.LPD
    let predictedY = webgazer.yDist - webgazer.currentViewingDistance * Math.tan(predictedYAngle) * webgazer.LPD

    if (params.applyKalmanFilter) {
        // Update Kalman model, and get prediction
        var newGaze = [predictedX, predictedY]; // [20200607 xk] Should we use a 1x4 vector?
        newGaze = this.kalman.update(newGaze);

        return {
            x: newGaze[0],
            y: newGaze[1]
        };
    } else {
        return {
            x: predictedX,
            y: predictedY
        };
    }
};


/**
 * Try to predict eye rotation from pupil data using Gaussian Process SE kernel.
 * after apply linear regression on data set.
 * @param {Object} eyesObj - The current user eyes object.
 * @returns {Object}
 */
reg.TotalReg.prototype.predictRotationGPPrecomputed = function (eyesObj) {
    if (!eyesObj || this.eyeFeaturesClicks.length === 0) {
        return null;
    }

    // Eye grey histogram for both left and right eyes
    // length 120
    var [eyeGraysCurrent, eyeFeatsCurrent] = util.getEyeFeats(eyesObj);

    let predictedXAngle = null
    let predictedXVariance = null
    let predictedYAngle = null
    let predictedYVariance = null


    if (kernel === "SE") {
        // SE Kernel
        [predictedXAngle, predictedXVariance] = util_regression.GPPrecomputedSERegressor(webgazer.eyeFeaturesPrecomputed, webgazer.horizontalAnglesPrecomputed, webgazer.KxxinverseHorizontalSEPrecomputed, eyeFeatsCurrent, params.sigma_one_x, params.length_scale_x, params.sigma_two_x, 120);
        [predictedYAngle, predictedYVariance] = util_regression.GPPrecomputedSERegressor(webgazer.eyeFeaturesPrecomputed, webgazer.verticalAnglesPrecomputed, webgazer.KxxinverseVerticalSEPrecomputed, eyeFeatsCurrent, params.sigma_one_y, params.length_scale_y, params.sigma_two_y, 120);
    } else if (kernel === "RQ") {
        // RQ Kernel
        [predictedXAngle, predictedXVariance] = util_regression.GPPrecomputedRQRegressor(webgazer.eyeFeaturesPrecomputed, webgazer.horizontalAnglesPrecomputed, webgazer.KxxinverseHorizontalRQPrecomputed, eyeFeatsCurrent, params.sigma_one_RQ_x, params.length_scale_RQ_x, params.alpha_RQ_x, params.sigma_two_RQ_x, 120);
        [predictedYAngle, predictedYVariance] = util_regression.GPPrecomputedRQRegressor(webgazer.eyeFeaturesPrecomputed, webgazer.verticalAnglesPrecomputed, webgazer.KxxinverseVerticalRQPrecomputed, eyeFeatsCurrent, params.sigma_one_RQ_y, params.length_scale_RQ_y, params.alpha_RQ_y, params.sigma_two_RQ_y, 120);
    } else {
        // Custom Kernel
        [predictedXAngle, predictedXVariance] = util_regression.GPPrecomputedCustomRegressor(webgazer.eyeFeaturesPrecomputed, webgazer.horizontalAnglesPrecomputed, webgazer.KxxinverseHorizontalCustomPrecomputed, eyeFeatsCurrent, params.M_x, params.sigma_one_custom_x, params.sigma_two_custom_x, width_matrix_custom_x, height_matrix_custom_x, 120);
        [predictedYAngle, predictedYVariance] = util_regression.GPPrecomputedCustomRegressor(webgazer.eyeFeaturesPrecomputed, webgazer.verticalAnglesPrecomputed, webgazer.KxxinverseVerticalCustomPrecomputed, eyeFeatsCurrent, params.M_y, params.sigma_one_custom_y, params.sigma_two_custom_y, width_matrix_custom_y, height_matrix_custom_y, 120);
    }

    console.log("x and y angles", predictedXAngle, predictedYAngle)
    // Convert the predicted angles (in radians) to position
    // Convert from actual to pixel density
    let predictedX = webgazer.xDist + webgazer.currentViewingDistance * Math.tan(predictedXAngle) * webgazer.LPD
    let predictedY = webgazer.yDist - webgazer.currentViewingDistance * Math.tan(predictedYAngle) * webgazer.LPD

    if (params.applyKalmanFilter) {
        // Update Kalman model, and get prediction
        var newGaze = [predictedX, predictedY]; // [20200607 xk] Should we use a 1x4 vector?
        newGaze = this.kalman.update(newGaze);

        return {
            x: newGaze[0],
            y: newGaze[1]
        };
    } else {
        return {
            x: predictedX,
            y: predictedY
        };
    }
};


reg.TotalReg.prototype.setData = util_regression.setData;

reg.TotalReg.prototype.setRotationData = util_regression.setRotationData;

/**
 * Return the data
 * @returns {Array.<Object>|*}
 */
reg.TotalReg.prototype.getData = function () {
    return this.dataClicks.data;
}

/**
 * Return the rotation data
 * @returns {Array.<Object>|*}
 */
reg.TotalReg.prototype.getRotationData = function () {
    return this.dataRotationClicks.data;
}

/**
 * The TotalReg object name
 * @type {string}
 */
reg.TotalReg.prototype.name = 'ridge';

export default reg;
