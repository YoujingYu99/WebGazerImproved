import { initJsPsych } from "jspsych";

const jsPsych = initJsPsych();

// const trial = {
//   type: jsPsychHtmlKeyboardResponse,
//   stimulus: "Hello world!",
// };

var trial = {
  type: jsPsychVirtualChinrest,
  blindspot_reps: 3,
  resize_units: "none",
};

jsPsych.run([trial]);
