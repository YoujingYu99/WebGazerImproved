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
    sigma_one_x: 0.103,
    length_scale_x: 48.11,
    sigma_two_x: 0.000206,
    sigma_one_y: 0.0584,
    length_scale_y: 24.92,
    sigma_two_y: 0.00005,
    // RQ
    sigma_one_RQ_x: 0.662,
    length_scale_RQ_x: 305.3,
    alpha_RQ_x: 0.0053,
    sigma_two_RQ_x: 0.0000684,
    sigma_one_RQ_y: 0.410,
    length_scale_RQ_y: 173.6,
    alpha_RQ_y: 0.00712,
    sigma_two_RQ_y: 0.00000115,
    // Custom
    sigma_one_custom_x: 0.141,
    M_x: 62.08,
    l_width_x: 0.175,
    l_height_x: 1.850,
    sigma_two_custom_x: 0.001,
    sigma_one_custom_y: 0.0835,
    M_y: 43.16,
    l_width_y: 0.179,
    l_height_y: 0.846,
    sigma_two_custom_y: 0.001,

};

export default params;
