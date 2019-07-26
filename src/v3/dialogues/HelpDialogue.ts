import { DialogueSnapshot } from "../conversationalist/Dialogue"
import ScriptedDialogue, { Script } from "../conversationalist/ScriptedDialogue"

const script: Script<{ }> = {
  start(response, state) {
    return {
      body: ["Do you need help with something?"],
      prompt: { type: "inlinePicker", choices: [
        { body: "Yes", value: "TRUE" },
        { body: "No", value: "FALSE" }
      ]},
      nextStep: this.handle
    }
  },

  handle(response, state) {
    if(response === "TRUE") {
      return {
        body: ["No worries, I can help you!", "What is the problem?"],
        prompt: { type: "text" },
        nextStep: this.handleHelp
      }
    } else {
      return {
        body: "Ok, let's get back to where we left off then. As I was saying..."
      }
    }
  },

  handleHelp(response, state) {
    return {
      body: ["I cannot help you with that 🙁", "let's get back to where we left off. As I was saying..."]
    }
  }
}

export default class OnboardingDialogue extends ScriptedDialogue<{ }> {
  constructor(snapshot?: DialogueSnapshot<{ }>) {
    super("help", script, { }, snapshot)
  }
}
