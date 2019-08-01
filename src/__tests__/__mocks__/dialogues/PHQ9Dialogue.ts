import generateAssessmentDialogue from "./assessmentGenerator"

const phq9 = {
  identifier: "phq9",
  startMessage: "Over the last 2 weeks, how often have you been bothered by the following problems?",
  endMessage: "Thank you!",
  questions: [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble falling/staying asleep, sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeating"
  ],
  answers: [
    { value: 0, body: "Not at all" },
    { value: 1, body: "Several days" },
    { value: 2, body: "More than half the days" },
    { value: 3, body: "Nearly every day" }
  ]
}

export default generateAssessmentDialogue(phq9)
