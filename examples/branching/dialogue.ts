import SequentialDialogue, { InvalidInputError, StepContext, StepOutput } from "../../src/dialogues/SequentialDialogue"
import ExampleReverseDialogue from "../custom/dialogue"
import ExampleSequentialDialogue from "../sequential/dialogue"
import ExampleWaterfallDialogue from "../waterfall/dialogue"

export default class BranchingDialogue extends SequentialDialogue {
  name = "branchingDialogue"

  steps = {
    async start(): Promise<StepOutput> {
      return {
        messages: `Which example dialogue would like to run?`,
        prompt: {
          type: "picker",
          choices: [
            { body: "Revers-o-bot", value: "reverse" },
            { body: "Waterfall dialogue", value: "waterfall" },
            { body: "Sequential dialogue", value: "sequential" },
          ]
        },
        nextStep: this.handleChoice
      }
    },

    async handleChoice(context: StepContext): Promise<StepOutput> {
      if(context.input === "reverse") {
        return {
          nextDialogue: new ExampleReverseDialogue()
        }
      } else if(context.input === "waterfall") {
        return {
          nextDialogue: new ExampleWaterfallDialogue({ state: { username: "Bob" } })
        }
      } else if(context.input === "sequential") {
        return {
          nextDialogue: new ExampleSequentialDialogue({ state: {} })
        }
      } else {
        throw new InvalidInputError("That is not a dialogue that I know.")
      }
    }
  }

  onResume() {
    this.onStart()
  }
}
