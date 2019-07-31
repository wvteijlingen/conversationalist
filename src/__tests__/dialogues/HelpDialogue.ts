import { DialogueSnapshot } from "../../Dialogue"
import ScriptedDialogue, { Script, StepResultBuilder } from "../../ScriptedDialogue"

const script: Script<{ }> = {
  async start(response, state) {
    return StepResultBuilder.pickerPrompt("Do you need help with something?", this.handle, [
      { body: "Yes", value: true },
      { body: "No", value: false }
    ])
  },

  async handle(response, state) {
    if(response === true) {
      return StepResultBuilder.textPrompt(["No worries, I can help you!", "What is the problem?"], this.handleHelpQuery)
    } else {
      return StepResultBuilder.finish("Ok, let's get back to where we left off then. As I was saying...")
    }
  },

  async handleHelpQuery(response, state) {
    return StepResultBuilder.finish(["I cannot help you with that 🙁", "Let's get back to where we left off. As I was saying..."])
  }
}

export default class OnboardingDialogue extends ScriptedDialogue<{ }> {
  constructor(snapshot?: DialogueSnapshot<{ }>) {
    super("help", script, { }, snapshot)
  }
}
