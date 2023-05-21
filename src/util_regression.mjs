import {all, create} from 'mathjs'
import util from './util';
import numeric from 'numeric';
import mat from './mat';
import params from './params';
import webgazer from "./index.mjs";

const math = create(all, {})

const util_regression = {};


/**
 * Initialize new arrays and initialize Kalman filter for regressions.
 */
util_regression.InitRegression = function () {
    var dataWindow = 700;
    var trailDataWindow = 10;
    this.ridgeParameter = Math.pow(10, -5);
    this.errorXArray = new util.DataWindow(dataWindow);
    this.errorYArray = new util.DataWindow(dataWindow);


    this.screenXClicksArray = new util.DataWindow(dataWindow);
    this.screenYClicksArray = new util.DataWindow(dataWindow);
    this.screenXAngleArray = new util.DataWindow(dataWindow);
    this.screenYAngleArray = new util.DataWindow(dataWindow);
    this.eyeFeaturesClicks = new util.DataWindow(dataWindow);

    // sets to one second worth of cursor trail
    this.trailTime = 1000;
    // 1000/50 = 20
    this.trailDataWindow = this.trailTime / params.moveTickSize;
    this.screenXTrailArray = new util.DataWindow(trailDataWindow);
    this.screenYTrailArray = new util.DataWindow(trailDataWindow);
    this.screenXAngleTrailArray = new util.DataWindow(trailDataWindow);
    this.screenYAngleTrailArray = new util.DataWindow(trailDataWindow);
    this.eyeFeaturesTrail = new util.DataWindow(trailDataWindow);
    this.trailTimes = new util.DataWindow(trailDataWindow);

    // dataClicks contains items which has the structure {'eyes': eyes, 'screenPos': screenPos, 'type': type}
    this.dataClicks = new util.DataWindow(dataWindow);
    this.dataTrail = new util.DataWindow(trailDataWindow);

    // dataRotationClicks contains items which has the structure {'eyes': eyes, 'rotationAngles': x/y angles, 'type': type}
    this.dataRotationClicks = new util.DataWindow(dataWindow);
    this.dataRotationTrail = new util.DataWindow(trailDataWindow);
    // Initialize Kalman filter [20200608 xk] what do we do about parameters?
    // [20200611 xk] unsure what to do w.r.t. dimensionality of these matrices. So far at least
    //               by my own anecdotal observation a 4x1 x vector seems to work alright
    var F = [[1, 0, 1, 0],
        [0, 1, 0, 1],
        [0, 0, 1, 0],
        [0, 0, 0, 1]];

    //Parameters Q and R may require some fine tuning
    var Q = [[1 / 4, 0, 1 / 2, 0],
        [0, 1 / 4, 0, 1 / 2],
        [1 / 2, 0, 1, 0],
        [0, 1 / 2, 0, 1]];// * delta_t
    var delta_t = 1 / 10; // The amount of time between frames
    Q = numeric.mul(Q, delta_t);

    var H = [[1, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 0]];
    var H = [[1, 0, 0, 0],
        [0, 1, 0, 0]];
    var pixel_error = 47; //We will need to fine tune this value [20200611 xk] I just put a random value here

    //This matrix represents the expected measurement error
    var R = numeric.mul(numeric.identity(2), pixel_error);

    var P_initial = numeric.mul(numeric.identity(4), 0.0001); //Initial covariance matrix
    var x_initial = [[500], [500], [0], [0]]; // Initial measurement matrix

    this.kalman = new util_regression.KalmanFilter(F, H, Q, R, P_initial, x_initial);
}

/**
 * Kalman Filter constructor
 * Kalman filters work by reducing the amount of noise in a models.
 * https://blog.cordiner.net/2011/05/03/object-tracking-using-a-kalman-filter-matlab/
 *
 * @param {Array.<Array.<Number>>} F - transition matrix
 * @param {Array.<Array.<Number>>} Q - process noise matrix
 * @param {Array.<Array.<Number>>} H - maps between measurement vector and noise matrix
 * @param {Array.<Array.<Number>>} R - defines measurement error of the device
 * @param {Array} P_initial - the initial state
 * @param {Array} X_initial - the initial state of the device
 */
util_regression.KalmanFilter = function (F, H, Q, R, P_initial, X_initial) {
    this.F = F; // State transition matrix
    this.Q = Q; // Process noise matrix
    this.H = H; // Transformation matrix
    this.R = R; // Measurement Noise
    this.P = P_initial; //Initial covariance matrix
    this.X = X_initial; //Initial guess of measurement
};

/**
 * Get Kalman next filtered value and update the internal state
 * @param {Array} z - the new measurement
 * @return {Array}
 */
util_regression.KalmanFilter.prototype.update = function (z) {
    // Here, we define all the different matrix operations we will need
    var add = numeric.add, sub = numeric.sub, inv = numeric.inv, identity = numeric.identity;
    var mult = mat.mult, transpose = mat.transpose;
    //TODO cache variables like the transpose of H

    // prediction: X = F * X  |  P = F * P * F' + Q
    var X_p = mult(this.F, this.X); //Update state vector
    var P_p = add(mult(mult(this.F, this.P), transpose(this.F)), this.Q); //Predicted covaraince

    //Calculate the update values
    var y = sub(z, mult(this.H, X_p)); // This is the measurement error (between what we expect and the actual value)
    var S = add(mult(mult(this.H, P_p), transpose(this.H)), this.R); //This is the residual covariance (the error in the covariance)

    // kalman multiplier: K = P * H' * (H * P * H' + R)^-1
    var K = mult(P_p, mult(transpose(this.H), inv(S))); //This is the Optimal Kalman Gain

    //We need to change Y into it's column vector form
    for (var i = 0; i < y.length; i++) {
        y[i] = [y[i]];
    }

    //Now we correct the internal values of the model
    // correction: X = X + K * (m - H * X)  |  P = (I - K * H) * P
    this.X = add(X_p, mult(K, y));
    this.P = mult(sub(identity(K.length), mult(K, this.H)), P_p);
    return transpose(mult(this.H, this.X))[0]; //Transforms the predicted state back into it's measurement form
};

/**
 * Performs ridge regression, according to the Weka code.
 * @param {Array} y - corresponds to screen coordinates (either x or y) for each of n click events
 * @param {Array.<Array.<Number>>} X - corresponds to gray pixel features (120 pixels for both eyes) for each of n clicks
 * @param {Array} k - ridge parameter
 * @return{Array} regression coefficients
 */
util_regression.ridge = function (y, X, k) {
    var nc = X[0].length;
    var m_Coefficients = new Array(nc);
    var xt = mat.transpose(X);
    var solution = new Array();
    var success = true;
    do {
        var ss = mat.mult(xt, X);
        // Set ridge regression adjustment
        for (var i = 0; i < nc; i++) {
            ss[i][i] = ss[i][i] + k;
        }

        // Carry out the regression
        var bb = mat.mult(xt, y);
        for (var i = 0; i < nc; i++) {
            m_Coefficients[i] = bb[i][0];
        }
        try {
            // Optional Chaining
            var n = (m_Coefficients.length !== 0 ? m_Coefficients.length / m_Coefficients.length : 0);
            if (m_Coefficients.length * n !== m_Coefficients.length) {
                console.log('Array length must be a multiple of m')
            }
            solution = (ss.length === ss[0].length ? (numeric.LUsolve(numeric.LU(ss, true), bb)) : (webgazer.mat.QRDecomposition(ss, bb)));

            for (var i = 0; i < nc; i++) {
                m_Coefficients[i] = solution[i];
            }
            success = true;
        } catch (ex) {
            k *= 10;
            console.log(ex);
            success = false;
        }
    } while (!success);
    return m_Coefficients;
}

function eucDistance(a, b) {
    return a
            .map((x, i) => Math.abs(x - b[i]) ** 2) // square the difference
            .reduce((sum, now) => sum + now) // sum
        ** (1 / 2)
}

/**
 * Performs GP regression with a RBF kernel plus a white kernel.
 * @param {Array} eyeFeatures - Eye features for training.
 * @param {Array} AngleArray - Array of Angles for training.
 * @param {Array} eyeFeatsCurrent - Current eye feature.
 * @param {Number}  sigma_one - Scale factor of RBF.
 * @param {Number} length_scale - length scale of RBF.
 * @param {Number} sigma_two - Std of noise.
 * @param {Number} feature_size - Size of feature vector. 120
 * @return{Number} predicted angle and variance..
 */
util_regression.GPSERegressor = function (eyeFeatures, AngleArray, eyeFeatsCurrent, sigma_one, length_scale, sigma_two, feature_size) {
    let train_length = eyeFeatures.length
    let K_xx = new Array(train_length).fill(null).map(() => new Array(train_length).fill(null));
    let K_xxstar = new Array(train_length)

    // Calculate K_xx
    for (var i = 0; i < train_length; i++) {
        for (var j = 0; j < train_length; j++) {
            let x = eyeFeatures[i];
            let x_prime = eyeFeatures[j];
            let dist = eucDistance(x, x_prime);
            let k_value = 0;
            if (i === j) {
                k_value = (sigma_one ** 2) * Math.exp(-(dist ** 2) / (2 * (length_scale ** 2) * feature_size)) + sigma_two ** 2
            } else {
                k_value = (sigma_one ** 2) * Math.exp(-(dist ** 2) / (2 * (length_scale ** 2) * feature_size))
            }
            K_xx[i][j] = k_value
        }
    }
    let Kxx_inv = math.inv(K_xx)


    // Calculate K_xxstar
    for (var p = 0; p < train_length; p++) {
        let x = eyeFeatsCurrent;
        let x_prime = eyeFeatures[p];
        let dist = eucDistance(x, x_prime);
        let k_value = 0;
        k_value = (sigma_one ** 2) * Math.exp(-(dist ** 2) / (2 * (length_scale ** 2) * feature_size))
        K_xxstar[p] = k_value
    }

    let pred = math.multiply(K_xxstar, math.multiply(Kxx_inv, AngleArray))
    let variance = sigma_two ** 2 - math.multiply(K_xxstar, math.multiply(Kxx_inv, math.transpose(K_xxstar)))

    return [pred, variance]
}


/**
 * Performs GP regression with a rational quadratic kernel plus a white kernel.
 * @param {Array} eyeFeatures - Eye features for training.
 * @param {Array} AngleArray - Array of Angles for training.
 * @param {Array} eyeFeatsCurrent - Current eye feature.
 * @param {Number}  sigma_one - Scale factor of RQ.
 * @param {Number} length_scale - length scale of RQ.
 * @param {Number} alpha - mixture factor of RQ.
 * @param {Number} sigma_two - Std of noise.
 * @return{Number} predicted angle and variance..
 */
util_regression.GPRQRegressor = function (eyeFeatures, AngleArray, eyeFeatsCurrent, sigma_one, length_scale, alpha, sigma_two, feature_size) {
    let train_length = eyeFeatures.length
    let K_xx = new Array(train_length).fill(null).map(() => new Array(train_length).fill(null));
    let K_xxstar = new Array(train_length)

    // Calculate K_xx
    for (var i = 0; i < train_length; i++) {
        for (var j = 0; j < train_length; j++) {
            let x = eyeFeatures[i];
            let x_prime = eyeFeatures[j];
            let dist = eucDistance(x, x_prime);
            let k_value = 0;
            if (i === j) {
                k_value = (sigma_one ** 2) * (1 + (dist ** 2) / (2 * feature_size * alpha * (length_scale ** 2))) + sigma_two ** 2
            } else {
                k_value = (sigma_one ** 2) * (1 + (dist ** 2) / (2 * feature_size * alpha * (length_scale ** 2)))
            }
            K_xx[i][j] = k_value
        }
    }

    let Kxx_inv = math.inv(K_xx)

    // Calculate K_xxstar
    for (var p = 0; p < train_length; p++) {
        let x = eyeFeatsCurrent;
        let x_prime = eyeFeatures[p];
        let dist = eucDistance(x, x_prime);
        let k_value = 0;
        k_value = (sigma_one ** 2) * (1 + (dist ** 2) / (2 * feature_size * alpha * (length_scale ** 2)))
        K_xxstar[p] = k_value
    }

    let pred = math.multiply(K_xxstar, math.multiply(Kxx_inv, AngleArray))
    let variance = sigma_two ** 2 - math.multiply(K_xxstar, math.multiply(Kxx_inv, math.transpose(K_xxstar)))

    return [pred, variance]
}


/**
 * Get value of the custom kernel. x^T C x.
 * @param {Array} x - Eye features for one data point.
 * @param {Array} x_prime - Eye features for another data point.
 * @param {Array} height_matrix - Cy.
 * @param {Array} width_matrix - Cy.
 * @param {Number} feature_size - Feature dimension. 120.
 * @return{Number} custom kernel value.
 */
util_regression.getCustomKernelValue = function (x, x_prime, height_matrix, width_matrix, feature_size) {
    // let x_diff = x_prime.map((e, i) => e - x[i]);
    let x_diff = math.subtract(x, x_prime[0]) // (1, 60)
    let V = math.transpose(math.reshape(x_diff, [6, 10])) // (10, 6)
    let kernel_matrix = math.multiply(width_matrix, math.multiply(V, math.transpose(height_matrix))) // (10, 6)
    let kernel_vec = math.multiply(x_diff, math.reshape(math.transpose(kernel_matrix), [-1, 1]))
    return kernel_vec
}


/**
 * Performs GP regression with a kernel (product of toeplitz matrices) plus a white kernel.
 * @param {Array} eyeFeatures - Eye features for training.
 * @param {Array} AngleArray - Array of Angles for training.
 * @param {Array} eyeFeatsCurrent - Current eye feature.
 * @param {Number} pixel_scale - M.
 * @param {Number} sigma_one - Scaling Std.
 * @param {Number} sigma_two - Noise Std.
 * @param {Array} width_matrix_custom - Cx.
 * @param {Array} height_matrix_custom - Cy.
 * @param {Number} feature_size - Feature dimension. 120.
 * @return{Number} predicted angle and variance..
 */
util_regression.GPCustomRegressorLoop = function (eyeFeatures, AngleArray, eyeFeatsCurrent, pixel_scale, sigma_one, sigma_two, width_matrix_custom, height_matrix_custom, feature_size) {

    //Slice left and right eyes for training and test dataset
    var eyeFeaturesLeft = [];
    for (var i = 0; i < eyeFeatures.length; i++) {
        eyeFeaturesLeft.push(eyeFeatures[i].slice(0, 60))
    }
    var eyeFeaturesRight = [];
    for (var i = 0; i < eyeFeatures.length; i++) {
        eyeFeaturesRight.push(eyeFeatures[i].slice(-60))
    }
    var eyeFeatsCurrentLeft = [eyeFeatsCurrent.slice(0, 60)]
    var eyeFeatsCurrentRight = [eyeFeatsCurrent.slice(-60)]

    // Test features length is 1
    let K_xx = new Array(eyeFeatures.length).fill(0).map(() => new Array(eyeFeatures.length).fill(0));
    let K_xxstar = new Array(eyeFeatures.length)

    // Calculate K_xx
    for (var i = 0; i < eyeFeatures.length; i++) {
        for (var j = 0; j < eyeFeatures.length; j++) {
            // Left eye
            let x_left = eyeFeaturesLeft[i];
            let x_prime_left = eyeFeaturesLeft[j];
            let k_value_left = util_regression.getCustomKernelValue(x_left, x_prime_left, height_matrix_custom, width_matrix_custom, feature_size)

            // Right eye
            let x_right = eyeFeaturesRight[i];
            let x_prime_right = eyeFeaturesRight[j];
            let k_value_right = util_regression.getCustomKernelValue(x_right, x_prime_right, height_matrix_custom, width_matrix_custom, feature_size)
            let K_total = (k_value_left[0] + k_value_right[0]) * (-1 / (4 * 120 * (pixel_scale ** 2)))
            let K = sigma_one ** 2 * math.exp(K_total)
            if (i === j) {
                K += sigma_two ** 2
            }
            K_xx[i][j] = K
        }
    }

    let Kxx_inv = math.inv(K_xx)


    // Calculate K_xxstar
    for (var p = 0; p < eyeFeatures.length; p++) {
        // Left eye
        let x_left = eyeFeatsCurrentLeft;
        let x_prime_left = eyeFeaturesLeft[p];
        let k_value_left = util_regression.getCustomKernelValue(x_left, x_prime_left, height_matrix_custom, width_matrix_custom, feature_size)
        // Right eye
        let x_right = eyeFeatsCurrentRight;
        let x_prime_right = eyeFeaturesRight[p];
        let k_value_right = util_regression.getCustomKernelValue(x_right, x_prime_right, height_matrix_custom, width_matrix_custom, feature_size)
        let K_total = (k_value_left[0][0] + k_value_right[0][0]) * (-1 / (4 * 120 * (pixel_scale ** 2)))
        let K = sigma_one ** 2 * math.exp(K_total)
        K_xxstar[p] = K
    }


    let pred = math.multiply(K_xxstar, math.multiply(Kxx_inv, AngleArray))
    let variance = sigma_two ** 2 - math.multiply(K_xxstar, math.multiply(Kxx_inv, math.transpose(K_xxstar)))

    return [pred, variance]
}


/**
 * Calculate width and height matrics (Cx, Cy).
 * @param {Number} image_size - width of image / height of image.
 * @param {Number} l - length scale of toeplitz matrix.
 * */
util_regression.getDistMatrix = function (image_size, l) {
    // Construct the C matrix
    let dist_matrix = new Array(image_size).fill(null).map(() => new Array(image_size).fill(null));
    for (var i = 0; i < image_size; i++) {
        for (var j = 0; j < image_size; j++) {
            dist_matrix[i][j] = math.exp(-0.5 * (i - j) ** 2 / (l ** 2))
        }
    }
    return dist_matrix
}

/**
 * Get K matrix in custom kernel.
 * @param {Array} first_features_left - First features left eye.
 * @param {Array} first_features_right - First features right eye.
 * @param {Array} second_features_left - Second features left eye.
 * @param {Array} second_features_right - Second features right eye.
 * @param {Array} width_matrix - Cx.
 * @param {Array} height_matrix - Cy.
 * @param {Number} pixel_scale - M.
 * @param {Number} sigma_one - Scaling sigma.
 * @param {Number} sigma_two - noise sigma.
 * @param {Boolean} cross_term - only true if calculating xstarx.
 * */
util_regression.getKMatrixVec = function (first_features_left,
                                          first_features_right,
                                          second_features_left,
                                          second_features_right,
                                          width_matrix,
                                          height_matrix,
                                          pixel_scale,
                                          sigma_one,
                                          sigma_two,
                                          cross_term,) {
    let K_left = util_regression.calculateQuadraticForm(first_features_left, second_features_left, height_matrix, width_matrix);
    let K_right = util_regression.calculateQuadraticForm(first_features_right, second_features_right, height_matrix, width_matrix);
    let K_total = math.multiply(math.add(K_left, K_right), -1 / (4 * 120 * (pixel_scale ** 2)))
    let K = math.multiply(math.map(K_total, math.exp), sigma_one ** 2)
    // Calculate xstarx
    if (cross_term === false) {
        // Add identity matrix if not cross term
        let id_matrix = new Array(first_features_left.length).fill(0).map(() => new Array(first_features_left.length).fill(0));
        for (var i = 0; i < first_features_left.length; i++) {
            id_matrix[i][i] = 1
        }
        let noise_term = math.multiply(id_matrix, sigma_two ** 2)
        K = math.add(K, noise_term)

    }
    return K
}


/**
 * Transpose the last two dimensions.
 * @param {Array} array - 3D array.
 * */
util_regression.transpose3DArray = function (array) {
    let transposed_array = new Array(array.length).fill(null).map(() => new Array(array[0][0].length).fill(null).map(() => new Array(array[0].length).fill(null)));
    for (var i = 0; i < array.length; i++) {
        for (var j = 0; j < array[0].length; j++) {
            for (var k = 0; k < array[0][0].length; k++) {
                transposed_array[i][k][j] = array[i][j][k]
            }
        }
    }
    return transposed_array
}

/**
 * Calculate the pairwise difference between first and second features.
 * @param {Array} first_features - 2D array.
 * @param {Array} second_features - 2D array.
 * */
util_regression.pairwiseDifference = function (first_features, second_features) {
    let first_features_3D = first_features.map(x => math.reshape(x, [6, 10]))
    let second_features_3D = second_features.map(x => math.reshape(x, [6, 10]))

    // let d = util_regression.createArray([first_features.length * second_features.length, 6, 10]);
    let d = new Array(first_features.length * second_features.length).fill(null).map(() => new Array(6).fill(null).map(() => new Array(10).fill(null)));

    for (var l = 0; l < first_features_3D.length; l++) {
        for (var i = 0; i < second_features_3D.length; i++) {
            for (var j = 0; j < 6; j++) {
                for (var k = 0; k < 10; k++) {
                    d[l * first_features_3D.length + i][j][k] = first_features_3D[l][j][k] - second_features_3D[i][j][k]
                }
            }
        }
    }
    return d
}

/**
 * Get quadratic term in the K matrix in custom kernel.
 * @param {Array} first_features - First features.
 * @param {Array} second_features - Second features.
 * @param {Array} height_matrix - Cy.
 * @param {Array} width_matrix - Cx.
 * */
util_regression.calculateQuadraticForm = function (first_features, second_features, height_matrix, width_matrix) {
    let height = 6
    let width = 10

    let d = util_regression.pairwiseDifference(first_features, second_features) // (k1k2, 6, 10)
    let d_reshaped = math.reshape(d, [-1, width]) // (6 k1k2, 10)
    let d1 = mat.mult(d_reshaped, width_matrix); // (6 k1k2, 10)
    let d2 = util_regression.transpose3DArray((math.reshape(d1, [-1, height, width]))); // (k1k2, 10, 6)
    let d3 = mat.mult(math.reshape(d2, [-1, height]), height_matrix); // (10 k1k2, 6)
    let d4 = util_regression.transpose3DArray(math.reshape(d3, [-1, width, height])); // (k1k2, 6, 10)
    let dCd = math.dotMultiply(d, d4); // (k1k2)

    let sum_arr = new Array(dCd.length).fill(0);
    for (var l = 0; l < dCd.length; l++) {
        for (var i = 0; i < dCd[0].length; i++) {
            for (var j = 0; j < dCd[0][0].length; j++) {
                sum_arr[l] += dCd[l][i][j]
            }
        }
    }
    return math.reshape(sum_arr, [first_features.length, second_features.length])

}


/**
 * Performs GP regression with a kernel (product of toeplitz matrices) plus a white kernel.
 * @param {Array} eyeFeatures - Eye features for training.
 * @param {Array} AngleArray - Array of Angles for training.
 * @param {Array} eyeFeatsCurrent - Current eye feature.
 * @param {Number} pixel_scale - Pixel scale. M in equation.
 * @param {Number} sigma_one - Scaling Std.
 * @param {Number} sigma_two - Noise Std.
 * @param {Array} width_matrix_custom - Cx.
 * @param {Array} height_matrix_custom - Cy.
 * @param {Number} feature_size - Feature dimension. 120.
 * @return{Number} predicted angle and variance..
 */
util_regression.GPCustomRegressor = function (eyeFeatures, AngleArray, eyeFeatsCurrent, pixel_scale, sigma_one, sigma_two, width_matrix_custom, height_matrix_custom, feature_size) {
    //Slice left and right eyes for training and test dataset
    var eyeFeaturesLeft = [];
    for (var i = 0; i < eyeFeatures.length; i++) {
        eyeFeaturesLeft.push(eyeFeatures[i].slice(0, 60))
    }
    var eyeFeaturesRight = [];
    for (var i = 0; i < eyeFeatures.length; i++) {
        eyeFeaturesRight.push(eyeFeatures[i].slice(-60))
    }
    var eyeFeatsCurrentLeft = [eyeFeatsCurrent.slice(0, 60)]
    var eyeFeatsCurrentRight = [eyeFeatsCurrent.slice(-60)]

    let K_xx = util_regression.getKMatrixVec(eyeFeaturesLeft,
        eyeFeaturesRight,
        eyeFeaturesLeft,
        eyeFeaturesRight,
        width_matrix_custom,
        height_matrix_custom,
        pixel_scale,
        sigma_one,
        sigma_two,
        false)

    let Kxx_inv = math.inv(K_xx)

    let K_xstarx = util_regression.getKMatrixVec(
        eyeFeatsCurrentLeft,
        eyeFeatsCurrentRight,
        eyeFeaturesLeft,
        eyeFeaturesRight,
        width_matrix_custom,
        height_matrix_custom,
        pixel_scale,
        sigma_one,
        sigma_two,
        true)

    let pred = math.multiply(K_xstarx, math.multiply(Kxx_inv, AngleArray))
    let variance = sigma_two ** 2 - math.multiply(K_xstarx, math.multiply(Kxx_inv, math.transpose(K_xstarx)))

    return [pred, variance]
}

/**
 * Performs Sparse GP regression with a RBF kernel plus a white kernel.
 * @param {Array} eyeFeatures - Predetermined eye features.
 * @param {Array} angles - Predetermined eye angles.
 * @param {Array} Kxx_inv - Inverse of K_xx
 * @param {Array} eyeFeatsCurrent - Current eye feature.
 * @param {Number}  sigma_one - Scale factor of RBF.
 * @param {Number} length_scale - length scale of RBF.
 * @param {Number} sigma_two - Std of noise.
 * @param {Number} feature_size - Size of feature vector. 120
 * @return{Number} predicted angle and variance..
 */
util_regression.GPPrecomputedSERegressor = function (eyeFeatures, angles, Kxx_inv, eyeFeatsCurrent, sigma_one, length_scale, sigma_two, feature_size) {
    let train_length = eyeFeatures.length
    let K_xxstar = new Array(train_length)

    // Calculate K_xxstar (for SE)
    for (var p = 0; p < train_length; p++) {
        let x = eyeFeatsCurrent;
        let x_prime = eyeFeatures[p];
        let dist = eucDistance(x, x_prime);
        let k_value = 0;
        k_value = (sigma_one ** 2) * Math.exp(-(dist ** 2) / (2 * (length_scale ** 2) * feature_size))
        K_xxstar[p] = k_value
    }

    let pred = math.multiply(K_xxstar, math.multiply(Kxx_inv, angles))
    // TODO: Leave variance as 0 for now

    return [pred, 0]
}


/**
 * Performs Sparse GP regression with a RBF kernel plus a white kernel.
 * @param {Array} eyeFeatures - Inducing points eye features.
 * @param {Array} Kxx_inv - Inverse of K_xx
 * @param {Array} eyeFeatsCurrent - Current eye feature.
 * @param {Number}  sigma_one - Scale factor of RBF.
 * @param {Number} length_scale - length scale of RBF.
 * @param {Number} sigma_two - Std of noise.
 * @param {Number} feature_size - Size of feature vector. 120
 * @param {Array} m - Mean of the posterior q(u). Same length of eyeFeatures.
 * @param {Number} S - Covariance function of the posterior q(u). Size of eyeFeatures.
 * @return{Number} predicted angle and variance..
 */
util_regression.GPSparseSERegressor = function (eyeFeatures, Kxx_inv, eyeFeatsCurrent, sigma_one, length_scale, sigma_two, feature_size, m, S) {
    let train_length = eyeFeatures.length
    let K_xxstar = new Array(train_length)

    // Calculate K_xxstar (for SE)
    for (var p = 0; p < train_length; p++) {
        let x = eyeFeatsCurrent;
        let x_prime = eyeFeatures[p];
        let dist = eucDistance(x, x_prime);
        let k_value = 0;
        k_value = (sigma_one ** 2) * Math.exp(-(dist ** 2) / (2 * (length_scale ** 2) * feature_size))
        K_xxstar[p] = k_value
    }

    let variance_1 = sigma_two ** 2 - math.multiply(K_xxstar, math.multiply(Kxx_inv, math.transpose(K_xxstar))) // sigma^2 in report
    let variance_2 = math.multiply(K_xxstar, math.multiply(Kxx_inv, math.multiply(S, math.multiply(Kxx_inv, math.transpose(K_xxstar)))))

    let pred = math.multiply(K_xxstar, math.multiply(Kxx_inv, m))
    let variance = variance_1 + variance_2

    return [pred, variance]
}


/**
 * Performs Sparse GP regression with an RQ kernel plus a white kernel.
 * @param {Array} eyeFeatures - Predetermined eye features.
 * @param {Array} angles - Predetermined eye angles.
 * @param {Array} Kxx_inv - Inverse of K_xx
 * @param {Array} eyeFeatsCurrent - Current eye feature.
 * @param {Number}  sigma_one - Scale factor of RQ.
 * @param {Number} length_scale - length scale of RQ.
 * @param {Number} alpha - mixture factor of RQ.
 * @param {Number} sigma_two - Std of noise.
 * @param {Number} feature_size - Size of feature vector. 120
 * @return {Number} predicted angle and variance.
 */
util_regression.GPPrecomputedRQRegressor = function (eyeFeatures, angles, Kxx_inv, eyeFeatsCurrent, sigma_one, length_scale, alpha, sigma_two, feature_size) {
    let train_length = eyeFeatures.length
    let K_xxstar = new Array(train_length)

    // Calculate K_xxstar (for SE)
    for (var p = 0; p < train_length; p++) {
        let x = eyeFeatsCurrent;
        let x_prime = eyeFeatures[p];
        let dist = eucDistance(x, x_prime);
        let k_value = 0;
        k_value = (sigma_one ** 2) * (1 + (dist ** 2) / (2 * feature_size * alpha * (length_scale ** 2)))
        K_xxstar[p] = k_value
    }

    let pred = math.multiply(K_xxstar, math.multiply(Kxx_inv, angles))

    return [pred, 0]
}


/**
 * Performs Sparse GP regression with an RQ kernel plus a white kernel.
 * @param {Array} eyeFeatures - Inducing points eye features.
 * @param {Array} Kxx_inv - Inverse of K_xx
 * @param {Array} eyeFeatsCurrent - Current eye feature.
 * @param {Number}  sigma_one - Scale factor of RQ.
 * @param {Number} length_scale - length scale of RQ.
 * @param {Number} alpha - mixture factor of RQ.
 * @param {Number} sigma_two - Std of noise.
 * @param {Number} feature_size - Size of feature vector. 120
 * @param {Array} m - Mean of the posterior q(u). Same length of eyeFeatures.
 * @param {Number} S - Covariance function of the posterior q(u). Size of eyeFeatures.
 * @return {Number} predicted angle and variance..
 */
util_regression.GPSparseRQRegressor = function (eyeFeatures, Kxx_inv, eyeFeatsCurrent, sigma_one, length_scale, alpha, sigma_two, feature_size, m, S) {
    let train_length = eyeFeatures.length
    let K_xxstar = new Array(train_length)

    // Calculate K_xxstar (for SE)
    for (var p = 0; p < train_length; p++) {
        let x = eyeFeatsCurrent;
        let x_prime = eyeFeatures[p];
        let dist = eucDistance(x, x_prime);
        let k_value = 0;
        k_value = (sigma_one ** 2) * (1 + (dist ** 2) / (2 * feature_size * alpha * (length_scale ** 2)))
        K_xxstar[p] = k_value
    }

    let variance_1 = sigma_two ** 2 - math.multiply(K_xxstar, math.multiply(Kxx_inv, math.transpose(K_xxstar))) // sigma^2 in report
    let variance_2 = math.multiply(K_xxstar, math.multiply(Kxx_inv, math.multiply(S, math.multiply(Kxx_inv, math.transpose(K_xxstar)))))

    let pred = math.multiply(K_xxstar, math.multiply(Kxx_inv, m))
    let variance = variance_1 + variance_2

    return [pred, variance]
}


/**
 * Performs Sparse GP regression with an Custom kernel plus a white kernel.
 * @param {Array} eyeFeatures - Predetermined eye features.
 * @param {Array} angles - Predetermined eye angles.
 * @param {Array} Kxx_inv - Inverse of K_xx
 * @param {Array} eyeFeatsCurrent - Current eye feature.
 * @param {Number} pixel_scale - Pixel scale. M in equation.
 * @param {Number} sigma_one - Scaling Std.
 * @param {Number} sigma_two - Noise Std.
 * @param {Array} width_matrix_custom - Cx.
 * @param {Array} height_matrix_custom - Cy.
 * @param {Number} feature_size - Size of feature vector. 120
 * @return {Number} predicted angle and variance.
 */
util_regression.GPPrecomputedCustomRegressor = function (eyeFeatures, angles, Kxx_inv, eyeFeatsCurrent, pixel_scale, sigma_one, sigma_two, width_matrix_custom, height_matrix_custom, feature_size) {

    //Slice left and right eyes for training and test dataset
    var eyeFeaturesLeft = [];
    for (var i = 0; i < eyeFeatures.length; i++) {
        eyeFeaturesLeft.push(eyeFeatures[i].slice(0, 60))
    }
    var eyeFeaturesRight = [];
    for (var i = 0; i < eyeFeatures.length; i++) {
        eyeFeaturesRight.push(eyeFeatures[i].slice(-60))
    }
    var eyeFeatsCurrentLeft = [eyeFeatsCurrent.slice(0, 60)]
    var eyeFeatsCurrentRight = [eyeFeatsCurrent.slice(-60)]

    let K_xxstar = util_regression.getKMatrixVec(
        eyeFeatsCurrentLeft,
        eyeFeatsCurrentRight,
        eyeFeaturesLeft,
        eyeFeaturesRight,
        width_matrix_custom,
        height_matrix_custom,
        pixel_scale,
        sigma_one,
        sigma_two,
        true)

    let pred = math.multiply(K_xxstar, math.multiply(Kxx_inv, angles))

    return [pred, 0]
}


/**
 * Performs Sparse GP regression with an Custom kernel plus a white kernel.
 * @param {Array} eyeFeatures - Inducing points eye features.
 * @param {Array} Kxx_inv - Inverse of K_xx
 * @param {Array} eyeFeatsCurrent - Current eye feature.
 * @param {Number} pixel_scale - Pixel scale. M in equation.
 * @param {Number} sigma_one - Scaling Std.
 * @param {Number} sigma_two - Noise Std.
 * @param {Array} width_matrix_custom - Cx.
 * @param {Array} height_matrix_custom - Cy.
 * @param {Number} feature_size - Size of feature vector. 120
 * @param {Array} m - Mean of the posterior q(u). Same length of eyeFeatures.
 * @param {Number} S - Covariance function of the posterior q(u). Size of eyeFeatures.
 * @return {Number} predicted angle and variance.
 */
util_regression.GPSparseCustomRegressor = function (eyeFeatures, Kxx_inv, eyeFeatsCurrent, pixel_scale, sigma_one, sigma_two, width_matrix_custom, height_matrix_custom, feature_size, m, S) {

    //Slice left and right eyes for training and test dataset
    var eyeFeaturesLeft = [];
    for (var i = 0; i < eyeFeatures.length; i++) {
        eyeFeaturesLeft.push(eyeFeatures[i].slice(0, 60))
    }
    var eyeFeaturesRight = [];
    for (var i = 0; i < eyeFeatures.length; i++) {
        eyeFeaturesRight.push(eyeFeatures[i].slice(-60))
    }
    var eyeFeatsCurrentLeft = [eyeFeatsCurrent.slice(0, 60)]
    var eyeFeatsCurrentRight = [eyeFeatsCurrent.slice(-60)]

    let K_xxstar = util_regression.getKMatrixVec(
        eyeFeatsCurrentLeft,
        eyeFeatsCurrentRight,
        eyeFeaturesLeft,
        eyeFeaturesRight,
        width_matrix_custom,
        height_matrix_custom,
        pixel_scale,
        sigma_one,
        sigma_two,
        true)

    let variance_1 = sigma_two ** 2 - math.multiply(K_xxstar, math.multiply(Kxx_inv, math.transpose(K_xxstar))) // sigma^2 in report
    let variance_2 = math.multiply(K_xxstar, math.multiply(Kxx_inv, math.multiply(S, math.multiply(Kxx_inv, math.transpose(K_xxstar)))))

    let pred = math.multiply(K_xxstar, math.multiply(Kxx_inv, m))
    let variance = variance_1 + variance_2

    return [pred, variance]
}


/**
 * Add given data to current data set then,
 * replace current data member with given data
 * @param {Array.<Object>} data - The data to set
 */
util_regression.setData = function (data) {
    for (var i = 0; i < data.length; i++) {
        // Clone data array
        var leftData = new Uint8ClampedArray(data[i].eyes.left.patch.data);
        var rightData = new Uint8ClampedArray(data[i].eyes.right.patch.data);
        // Duplicate ImageData object
        data[i].eyes.left.patch = new ImageData(leftData, data[i].eyes.left.width, data[i].eyes.left.height);
        data[i].eyes.right.patch = new ImageData(rightData, data[i].eyes.right.width, data[i].eyes.right.height);

        // Add those data objects to model
        this.addData(data[i].eyes, data[i].screenPos, data[i].type);
    }
};

/**
 * Add given data to current data set then,
 * replace current data member with given data
 * @param {Array.<Object>} data - The data to set
 */
util_regression.setRotationData = function (data) {
    for (var i = 0; i < data.length; i++) {
        // Clone data array
        var leftData = new Uint8ClampedArray(data[i].eyes.left.patch.data);
        var rightData = new Uint8ClampedArray(data[i].eyes.right.patch.data);
        // Duplicate ImageData object
        data[i].eyes.left.patch = new ImageData(leftData, data[i].eyes.left.width, data[i].eyes.left.height);
        data[i].eyes.right.patch = new ImageData(rightData, data[i].eyes.right.width, data[i].eyes.right.height);

        // Add those data objects to model
        this.addRotationData(data[i].eyes, data[i].rotationAngles, data[i].type);
    }
};


//not used ?!
//TODO: still usefull ???
/**
 *
 * @returns {Number}
 */
util_regression.getCurrentFixationIndex = function () {
    var index = 0;
    var recentX = this.screenXTrailArray.get(0);
    var recentY = this.screenYTrailArray.get(0);
    for (var i = this.screenXTrailArray.length - 1; i >= 0; i--) {
        var currX = this.screenXTrailArray.get(i);
        var currY = this.screenYTrailArray.get(i);
        var euclideanDistance = Math.sqrt(Math.pow((currX - recentX), 2) + Math.pow((currY - recentY), 2));
        if (euclideanDistance > 72) {
            return i + 1;
        }
    }
    return i;
}

util_regression.addData = function (eyes, screenPos, type) {
    if (!eyes) {
        return;
    }
    //not doing anything with blink at present
    // if (eyes.left.blink || eyes.right.blink) {
    //     return;
    // }
    if (type === 'click') {
        this.screenXClicksArray.push([screenPos[0]]);
        this.screenYClicksArray.push([screenPos[1]]);
        this.eyeFeaturesClicks.push(util.getEyeFeats(eyes)[1]);
        this.dataClicks.push({'eyes': eyes, 'screenPos': screenPos, 'type': type});
    } else if (type === 'move') {
        this.screenXTrailArray.push([screenPos[0]]);
        this.screenYTrailArray.push([screenPos[1]]);

        this.eyeFeaturesTrail.push(util.getEyeFeats(eyes)[1]);
        this.trailTimes.push(performance.now());
        this.dataTrail.push({'eyes': eyes, 'screenPos': screenPos, 'type': type});
    }

    // [20180730 JT] Why do we do this? It doesn't return anything...
    // But as JS is pass by reference, it still affects it.
    //
    // Causes problems for when we want to call 'addData' twice in a row on the same object, but perhaps with different screenPos or types (think multiple interactions within one video frame)
    //eyes.left.patch = Array.from(eyes.left.patch.data);
    //eyes.right.patch = Array.from(eyes.right.patch.data);
};

/**
 * Add rotation data.
 * @param {Object} eyes - JS object.
 * @param {Array} screenPos - [x, y] screen positions.
 * @param {Array} rotationAngles - [horizontal angle, vertical angle] rotation angles.
 * @param {String} type - type of movement.
 */
util_regression.addRotationData = function (eyes, screenPos, rotationAngles, type) {

    if (!eyes) {
        return;
    }
    //not doing anything with blink at present
    // if (eyes.left.blink || eyes.right.blink) {
    //     return;
    // }
    if (type === 'click') {
        this.screenXAngleArray.push([rotationAngles[0]]);
        this.screenYAngleArray.push([rotationAngles[1]]);
        this.eyeFeaturesClicks.push(util.getEyeFeats(eyes)[1]);
        this.dataRotationClicks.push({
            'eyes': eyes,
            'screenPositions': screenPos,
            'screenDistances': [webgazer.xDist, webgazer.yDist],
            'viewingDistance': webgazer.currentViewingDistance,
            'LPD': webgazer.LPD,
            'rotationAngles': [rotationAngles[0], rotationAngles[1]],
            'type': type
        });
    } else if (type === 'move') {
        this.screenXAngleTrailArray.push([rotationAngles[0]]);
        this.screenYAngleTrailArray.push([rotationAngles[1]]);

        this.eyeFeaturesTrail.push(util.getEyeFeats(eyes)[1]);
        this.trailTimes.push(performance.now());
        this.dataRotationTrail.push({
            'eyes': eyes,
            'screenPositions': screenPos,
            'screenDistances': [webgazer.xDist, webgazer.yDist],
            'viewingDistance': webgazer.currentViewingDistance,
            'LPD': webgazer.LPD,
            'rotationAngles': [rotationAngles[0], rotationAngles[1]],
            'type': type
        });
    }

    // [20180730 JT] Why do we do this? It doesn't return anything...
    // But as JS is pass by reference, it still affects it.
    //
    // Causes problems for when we want to call 'addData' twice in a row on the same object, but perhaps with different screenPos or types (think multiple interactions within one video frame)
    //eyes.left.patch = Array.from(eyes.left.patch.data);
    //eyes.right.patch = Array.from(eyes.right.patch.data);
};

export default util_regression;