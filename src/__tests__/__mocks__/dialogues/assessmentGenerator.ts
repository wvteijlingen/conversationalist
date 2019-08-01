import { DialogueSnapshot } from "../../../Dialogue"
import ScriptedDialogue, { Script } from "../../../ScriptedDialogue"

interface Params {
  identifier: string
  startMessage: string
  endMessage: string
  questions: string[]
  answers: Array<{ value: number, body: string }>
}

interface State {
  totalPoints: number
}

export default function generateAssessmentDialogue(data: Params) {
  const script: Script<State> = {
    async start() {
      // tslint:disable-next-line: no-string-literal
      return { body: data.startMessage, nextStep: script["prompt_0"] }
    },

    async end() {
      return { body: data.endMessage }
    }
  }

  data.questions.forEach((question, index, array) => {
    // tslint:disable-next-line: only-arrow-functions
    script[`prompt_${index}`] = async function(response, state) {
      if(typeof response === "number") {
        state.totalPoints = state.totalPoints + response
      }
      return {
        body: question,
        prompt: { type: "inlinePicker", choices: data.answers },
        nextStep: index === array.length - 1 ? script.endMessage : script[`prompt_${index + 1}`]
      }
    }
  })

  return class extends ScriptedDialogue<State> {
    constructor(snapshot?: DialogueSnapshot<State>) {
      super("help", script, { totalPoints: 0 }, snapshot)
    }
  }
}
