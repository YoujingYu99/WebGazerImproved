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
    sigma_one_x: 0.191,
    length_scale_x: 74.1,
    sigma_two_x: 0.001,
    sigma_one_y: 0.104,
    length_scale_y: 58.5,
    sigma_two_y: 0.001,
    // RQ
    sigma_one_RQ_x: 0.241,
    length_scale_RQ_x: 90.5,
    alpha_RQ_x: 0.657,
    sigma_two_RQ_x: 0.001,
    sigma_one_RQ_y: 0.255,
    length_scale_RQ_y: 123.8,
    alpha_RQ_y: 0.342,
    sigma_two_RQ_y: 0.001,
    // Custom
    sigma_one_custom_x: 0.212,
    M_x: 63.5,
    l_width_x: 0.88,
    l_height_x: 1.28,
    sigma_two_custom_x: 0.001,
    sigma_one_custom_y: 0.171,
    M_y: 60.7,
    l_width_y: 0.86,
    l_height_y: 0.41,
    sigma_two_custom_y: 0.001,

};

export default params;
