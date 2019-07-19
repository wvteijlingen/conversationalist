import { EventEmitter } from "events"
import { Dialogue } from "./Dialogue"
import DialogueRunner, { DialogueRunnerSnapshot } from "./DialogueRunner"
import Prompt from "./Prompts";

export interface Message {
  author: "bot" | "user"
  body: string
  prompt?: Prompt
}

interface BotSnapshot {
  messageLog: Message[]
  dialogues: [
    { dialogue: Dialogue<any>, snapshot: DialogueRunnerSnapshot<any> }
  ]
}

export class Bot extends EventEmitter {
  messageLog: Message[] = []
  dialogueRunners: DialogueRunner<any>[] = []

  constructor(rootDialogueRunner: DialogueRunner<any>) {
    super()
    this.pushDialogueRunner(rootDialogueRunner, false)
  }

  static fromSnapshot(snapshot: BotSnapshot) {
    throw "TODO: Not implemented yet"
  }

  get snapshot(): BotSnapshot {
    throw "TODO: Not implemented yet"
  }

  start() {
    this.dialogueRunners[0].start()
  }

  onReceiveResponse(response?: any) {
    this.emit("step", {
      author: "user",
      body: response
    } as Message)

    for(let i = this.dialogueRunners.length - 1; i >= 0; i--) {
      const runner = this.dialogueRunners[i]
      if(runner.onReceiveResponse(response)) {
        break
      }
    }
  }

  pushDialogueRunner(runner: DialogueRunner<any>, start: boolean = true) {
    this.dialogueRunners.push(runner)
    runner.onStep = (result, isFinished) => {
      this.emit("step", {
        author: "bot",
        body: result.body,
        prompt: result.prompt
      } as Message)

      if(isFinished) {
        this.removeDialogueRunner(runner)
      }
    }

    if(start) {
      runner.start()
    }
  }

  // private popDialogueRunner() {
  //   if(this.dialogueRunners.length <= 1) {
  //     throw "Cannot pop root dialogue"
  //   }
  //
  //   const runner = this.dialogueRunners.pop()
  //   if(runner) {
  //     runner.onStep = undefined
  //   }
  // }

  private removeDialogueRunner(runner: DialogueRunner<any>) {
    if(this.dialogueRunners.length <= 1) {
      throw "Cannot remove root dialogue"
    }

    runner.onStep = undefined
    this.dialogueRunners = this.dialogueRunners.filter(e => e !== runner)
  }
}
