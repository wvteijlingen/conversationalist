import { Dialogue, DialogueEvents, DialogueOutput, Attachment } from "../src"

export class TestingDialogue implements Dialogue {
  identifier = "testing"
  events: DialogueEvents = {}
  snapshot = undefined

  nextOutput?: DialogueOutput

  onStart(): void {
    if(this.nextOutput) {
      this.events.output?.(this.nextOutput, false)
    }
  }

  onReceiveInput(input: unknown, attachment?: Attachment): void {
    if(this.nextOutput) {
      this.events.output?.(this.nextOutput, false)
    }
  }

  sendOuput(output: DialogueOutput) {
    this.events.output?.(output, false)
  }
}
