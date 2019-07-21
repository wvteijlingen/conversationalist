import generateAssessmentDialogue from "./assessmentGenerator"

const gad7 = {
  startMessage: "Over the last 2 weeks, how often have you been bothered by the following problems?",
  endMessage: "Thank you!",
  questions: [
    "Feeling nervous, anxious or on edge?",
    "Not being able to stop or control worrying?",
    "Worrying too much about different things?",
    "Trouble relaxing?",
    "Being so restless that it is hard to sit still?",
    "Becoming easily annoyed or irritable?",
    "Feeling afraid as if something awful might happen?"
  ],
  answers: [
    { value: 0, body: "Not at all" },
    { value: 1, body: "Several days" },
    { value: 2, body: "More than half the days" },
    { value: 3, body: "Nearly every day" }
  ]
}

export default generateAssessmentDialogue(gad7)
