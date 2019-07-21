import { Dialogue } from "../Dialogue"

interface Params {
  startMessage: string
  endMessage: string
  questions: string[]
  answers:{ value: number, body: string }[]
}

export default function generateAssessmentDialogue(data: Params) {
  let dialogue: Dialogue<{ totalPoints: number }> = {
    start() {
      return { body: data.startMessage, nextStep: dialogue["prompt_0"] }
    },

    end() {
      return { body: data.endMessage }
    }
  }

  data.questions.forEach((question, index, array) => {
    dialogue[`prompt_${index}`] = function(response, state) {
      if(typeof response === "number") {
        state.totalPoints = state.totalPoints + response
      }
      return {
        body: question,
        prompt: { type: "prefab", choices: data.answers },
        nextStep: index === array.length - 1 ? dialogue.endMessage : dialogue[`prompt_${index + 1}`]
      }
    }
  })
}
