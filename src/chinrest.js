import { initJsPsych } from "jspsych";
import virtualChinrest from "@jspsych/plugin-virtual-chinrest";

// const chinrest = {};
//
// // Initialise variables
// chinrest.LPD = 0;
// chinrest.viewDistance = 0;
// chinrest.jsPsych = initJsPsych();
//
// // Define the trial
// let trial = {
//   type: virtualChinrest,
//   blindspot_reps: 3,
//   resize_units: "none",
// };
//
// /**
//  * Get LPD and Viewing Distance
//  */
// chinrest.getLPDViewingDistance = function () {
//   // Run trial
//   chinrest.jsPsych.run([trial]);
//   // Update parameters
//   // chinrest.LPD = trial["scale_factor"];
//   // chinrest.viewDistance = trial["view_dist_mm"];
// };

// chinrest.trial = {
//   type: virtualChinrest,
//   blindspot_reps: 3,
//   resize_units: "none",
// };

// chinrest.jsPsych.run([chinrest.trial]);

// export default chinrest;

const jsPsych = initJsPsych();

var trial = {
  type: virtualChinrest,
  blindspot_reps: 3,
  resize_units: "none",
};

jsPsych.run([trial]);
