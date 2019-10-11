import { AsyncStepOutput, InvalidInputError, ScriptedDialogue, StepContext } from "../../src"
import ExampleReverseDialogue from "../custom/dialogue"
import runDialogueInTerminal from "../runner"
import ExampleScriptedDialogue from "../scripted/dialogue"
import ExampleWaterfallDialogue from "../waterfall/dialogue"

class BranchingDialogue extends ScriptedDialogue {
  identifier = "branchingDialogue"
  looping = true

  script = {
    async start(): AsyncStepOutput {
      return {
        body: [`Which example dialogue would like to run?`],
        prompt: {
          type: "picker",
          choices: [
            { body: "The revers-o-bot", value: "reverse" },
            { body: "The waterfall dialogue", value: "waterfall" },
            { body: "The scripted dialogue", value: "scripted" },
          ]
        },
        nextStep: this.handleChoice
      }
    },

    async handleChoice(context: StepContext): AsyncStepOutput {
      if(context.input === "reverse") {
        return {
          nextDialogue: new ExampleReverseDialogue()
        }
      } else if(context.input === "waterfall") {
        return {
          nextDialogue: new ExampleWaterfallDialogue({ state: { username: "Bob" } })
        }
      } else if(context.input === "scripted") {
        return {
          nextDialogue: new ExampleScriptedDialogue({ state: {} })
        }
      } else {
        throw new InvalidInputError("That is not a dialogue that I know.")
      }
    }
  }

  onResume() {
    this.runStep(this.script.start)
  }
}

const dialogue = new BranchingDialogue({
  state: {}
})

runDialogueInTerminal(dialogue)
