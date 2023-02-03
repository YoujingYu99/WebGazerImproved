import util from './util';
import util_regression from './util_regression';
import params from './params';

const reg = {};

/**
 * Constructor of RidgeReg object,
 * this object allow to perform ridge regression
 * @constructor
 */
reg.RidgeReg = function () {
    this.init();
};

/**
 * Initialize new arrays and initialize Kalman filter.
 */
reg.RidgeReg.prototype.init = util_regression.InitRegression

/**
 * Add given data from eyes
 * @param {Object} eyes - eyes where extract data to add
 * @param {Object} screenPos - The current screen point
 * @param {Object} type - The type of performed action
 */
reg.RidgeReg.prototype.addData = util_regression.addData

/**
 * Add given data from eyes image and rotational angles
 * @param {Object} eyes - eyes where extract data to add
 * @param {Object} rotationAngles - The current rotational angles
 * @param {Object} type - The type of performed action
 */
reg.RidgeReg.prototype.addRotationData = util_regression.addRotationData

/**
 * Try to predict coordinates from pupil data
 * after apply linear regression on data set
 * @param {Object} eyesObj - The current user eyes object
 * @returns {Object}
 */
reg.RidgeReg.prototype.predict = function (eyesObj) {
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
            // console.log(i);
            // console.log(this.trailTimes.get(i));
            // console.log(acceptTime);
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
reg.RidgeReg.prototype.predictRotation = function (eyesObj) {
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
    // eyeFeaturesTrail contains eye size as grey histogram;
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
    console.log("get eye features")
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

/**
 * Try to predict eye rotation from pupil data using Gaussian Process.
 * after apply linear regression on data set.
 * @param {Object} eyesObj - The current user eyes object.
 * @returns {Object}
 */
reg.RidgeReg.prototype.predictRotationGP = function (eyesObj) {
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
    // eyeFeaturesTrail contains eye size as grey histogram;
    // screenX/YAngleArray contains the angles;
    var xAngleArray = this.screenXAngleArray.data.concat(trailXAngle);
    var yAngleArray = this.screenYAngleArray.data.concat(trailYAngle);


    // size n * 120, n varies depending on how many datapoints are accepted
    var eyeFeatures = this.eyeFeaturesClicks.data.concat(trailFeat);
    // console.log("eye feature length", eyeFeatures.length)


    // Eye grey histogram for both left and right eyes
    // length 120
    var [eyeGraysCurrent, eyeFeatsCurrent] = util.getEyeFeats(eyesObj);

    //// SE Kernel
    let [predictedXAngle, predictedXVariance] = util_regression.GPSERegressor(eyeFeatures, xAngleArray, eyeFeatsCurrent, params.sigma_one_x, params.length_scale_x, params.sigma_two_x, 120)
    let [predictedYAngle, predictedYVariance] = util_regression.GPSERegressor(eyeFeatures, yAngleArray, eyeFeatsCurrent, params.sigma_one_y, params.length_scale_y, params.sigma_two_y, 120)

    //// RQ Kernel
    // let [predictedXAngle, predictedXVariance] = util_regression.GPRQRegressor(eyeFeatures, xAngleArray, eyeFeatsCurrent, params.sigma_one_RQ_x, params.length_scale_RQ_x, params.alpha_RQ_x ,params.sigma_two_RQ_x, 120)
    // let [predictedYAngle, predictedYVariance] = util_regression.GPRQRegressor(eyeFeatures, yAngleArray, eyeFeatsCurrent, params.sigma_one_RQ_y, params.length_scale_RQ_y, params.alpha_RQ_y, params.sigma_two_RQ_y, 120)


    //// Custom Kernel
    // let [width_matrix_custom_x,
    //     height_matrix_custom_x] = util_regression.getWidthHeightMatrices(10, 12, params.l_width_x, params.l_height_x)
    //
    // let [width_matrix_custom_y,
    //     height_matrix_custom_y] = util_regression.getWidthHeightMatrices(10, 12, params.l_width_y, params.l_height_y)
    //
    //
    // let [predictedXAngle, predictedXVariance] = util_regression.GPCustomRegressor(eyeFeatures, xAngleArray, eyeFeatsCurrent, params.sigma_one_x, params.sigma_two_x, width_matrix_custom_x, height_matrix_custom_x, 120)
    // let [predictedYAngle, predictedYVariance] = util_regression.GPCustomRegressor(eyeFeatures, yAngleArray, eyeFeatsCurrent, params.sigma_one_y, params.sigma_two_y, width_matrix_custom_y, height_matrix_custom_y, 120)

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
 * Try to predict eye rotation from pupil data using Gaussian Process custom kernel.
 * after apply linear regression on data set.
 * @param {Object} eyesObj - The current user eyes object.
 * @returns {Object}
 */
reg.RidgeReg.prototype.predictRotationGPCustom = function (eyesObj) {
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
    // eyeFeaturesTrail contains eye size as grey histogram;
    // screenX/YAngleArray contains the angles;
    var xAngleArray = this.screenXAngleArray.data.concat(trailXAngle);
    var yAngleArray = this.screenYAngleArray.data.concat(trailYAngle);


    // size n * 120, n varies depending on how many datapoints are accepted
    var eyeFeatures = this.eyeFeaturesClicks.data.concat(trailFeat);
    // console.log("eye feature length", eyeFeatures.length)

    let [width_matrix_custom_x,
        height_matrix_custom_x] = util_regression.getWidthHeightMatrices(10, 12, params.l_width_x, params.l_height_x)

    let [width_matrix_custom_y,
        height_matrix_custom_y] = util_regression.getWidthHeightMatrices(10, 12, params.l_width_y, params.l_height_y)
    // Eye grey histogram for both left and right eyes
    // length 120
    var [eyeGraysCurrent, eyeFeatsCurrent] = util.getEyeFeats(eyesObj);

    let [predictedXAngle, predictedXVariance] = util_regression.GPCustomRegressor(eyeFeatures, xAngleArray, eyeFeatsCurrent, params.sigma_one_x, params.sigma_two_x, width_matrix_custom_x, height_matrix_custom_x, 120)
    let [predictedYAngle, predictedYVariance] = util_regression.GPCustomRegressor(eyeFeatures, yAngleArray, eyeFeatsCurrent, params.sigma_one_y, params.sigma_two_y, width_matrix_custom_y, height_matrix_custom_y, 120)

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

reg.RidgeReg.prototype.setData = util_regression.setData;

reg.RidgeReg.prototype.setRotationData = util_regression.setRotationData;

/**
 * Return the data
 * @returns {Array.<Object>|*}
 */
reg.RidgeReg.prototype.getData = function () {
    return this.dataClicks.data;
}

/**
 * Return the rotation data
 * @returns {Array.<Object>|*}
 */
reg.RidgeReg.prototype.getRotationData = function () {
    return this.dataRotationClicks.data;
}

/**
 * The RidgeReg object name
 * @type {string}
 */
reg.RidgeReg.prototype.name = 'ridge';

export default reg;
