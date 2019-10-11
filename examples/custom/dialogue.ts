import { Dialogue, DialogueEvents, DialogueInput } from "../../src"

export default class ReverseDialogue implements Dialogue {
  readonly identifier = "reverse"
  events: DialogueEvents = {}

  get snapshot() {
    return undefined
  }

  onStart() {
    this.events.output?.({
      body: [
        "Hi, I am revers-o-bot! Say anything, and I will reverse it for you.",
        "You can say 'stop' to stop the dialogue."
      ],
      prompt: { type: "text" }
    }, false)
  }

  async onReceiveInput(input: DialogueInput) {
    if(input === "stop") {
      this.events.output?.({}, true)
      return
    }

    this.events.outputStart?.()

    if(typeof input === "string") {
      this.events.output?.({
        body: input.split("").reverse().join(""),
        prompt: { type: "text" }
      }, false)
    }
  }
}
