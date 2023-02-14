const params = {
    moveTickSize: 50,
    videoContainerId: 'webgazerVideoContainer',
    videoElementId: 'webgazerVideoFeed',
    videoElementCanvasId: 'webgazerVideoCanvas',
    faceOverlayId: 'webgazerFaceOverlay',
    faceFeedbackBoxId: 'webgazerFaceFeedbackBox',
    gazeDotId: 'webgazerGazeDot',
    videoViewerWidth: 320,
    videoViewerHeight: 240,
    faceFeedbackBoxRatio: 0.66,
    // View options
    showVideo: true,
    mirrorVideo: true,
    showFaceOverlay: true,
    showFaceFeedbackBox: true,
    showGazeDot: true,
    camConstraints: {
        video: {
            width: {min: 320, ideal: 640, max: 1920},
            height: {min: 240, ideal: 480, max: 1080},
            facingMode: "user"
        }
    },
    dataTimestep: 50,
    showVideoPreview: true,
    applyKalmanFilter: true,
    saveDataAcrossSessions: true,
    // Whether or not to store accuracy eigenValues, used by the calibration example file
    storingPoints: false,
    // SE
    sigma_one_x: 0.105,
    length_scale_x: 5,
    sigma_two_x: 0.000285,
    sigma_one_y: 0.0542,
    length_scale_y: 25.28,
    sigma_two_y: 0.00005,
    // RQ
    sigma_one_RQ_x: 0.249,
    length_scale_RQ_x: 141.4,
    alpha_RQ_x: 0.0815,
    sigma_two_RQ_x: 0.000239,
    sigma_one_RQ_y: 0.281,
    length_scale_RQ_y: 134.6,
    alpha_RQ_y: 0.0157,
    sigma_two_RQ_y: 0.00000753,
    // Custom
    sigma_one_custom_x: 0,
    M_x: 0,
    l_width_x: 0,
    l_height_x: 0,
    sigma_two_custom_x: 0.0,
    sigma_one_custom_y: 0.0,
    M_y: 0,
    l_width_y: 0,
    l_height_y: 0,
    sigma_two_custom_y: 0.0,

};

export default params;
