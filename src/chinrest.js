import { initJsPsych } from "jspsych";
import virtualChinrest from "@jspsych/plugin-virtual-chinrest";

const jsPsych = initJsPsych();

// const trial = {
//   type: jsPsychHtmlKeyboardResponse,
//   stimulus: "Hello world!",
// };

var trial = {
  type: virtualChinrest,
  blindspot_reps: 3,
  resize_units: "none",
};

jsPsych.run([trial]);
