import { Dialogue, DialogueEvents, DialogueOutput, Attachment } from "../src"

export class TestingDialogue implements Dialogue {
  name = "testing"
  events: DialogueEvents = {}
  snapshot = undefined

  nextOutput?: [DialogueOutput, unknown?]

  onStart(): void {
    if(this.nextOutput) {
      this.events.output?.(this.nextOutput[0], this.nextOutput[1])
    }
  }

  onReceiveInput(input: unknown, attachment?: Attachment): void {
    if(this.nextOutput) {
      this.events.output?.(this.nextOutput[0], this.nextOutput[1])
    }
  }
}
