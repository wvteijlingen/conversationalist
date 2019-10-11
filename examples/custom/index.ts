import { Dialogue, DialogueEvents, DialogueInput } from "../../src"
import runDialogueInTerminal from "../runner"

class ReverseDialogue implements Dialogue {
  readonly identifier = "translate"
  events: DialogueEvents = {}

  get snapshot() {
    return undefined
  }

  onStart() {
    this.events.output?.({
      body: "Hi, I am revers-o-bot! Say anything, and I will reverse it for you.",
      prompt: { type: "text" }
    }, false)
  }

  async onReceiveInput(input: DialogueInput) {
    this.events.outputStart?.()

    if(typeof input === "string") {
      this.events.output?.({
        body: input.split("").reverse().join(""),
        prompt: { type: "text" }
      }, false)
    }
  }
}

runDialogueInTerminal(new ReverseDialogue())
