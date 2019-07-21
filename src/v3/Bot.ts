import { EventEmitter } from "events"
import { StepResult } from "./Dialogue"
import { DialogueRunnerInterface, DialogueRunnerSnapshot } from "./DialogueRunner"
import Prompt from "./Prompts"

export interface Message {
  author: "bot" | "user"
  body: string
  prompt?: Prompt
}

interface BotSnapshot {
  messageLog: Message[]
  dialogues: { identifier: string, snapshot: DialogueRunnerSnapshot<any> }[]
}

export interface Middleware {
  run(response: any, bot: Bot): boolean
}

export class Bot extends EventEmitter {
  messageLog: Message[] = []
  private dialogueRunners: DialogueRunnerInterface<any>[] = []
  private middlewares: Middleware[] = []

  constructor(dialogueRunners: DialogueRunnerInterface<any>[]) {
    super()
    if(dialogueRunners.length === 0) {
      throw "A bot must be constructed with at least 1 dialog runner"
    }
    for(const runner of dialogueRunners) {
      this.pushDialogueRunner(runner, false)
    }
  }

  static fromSnapshot(snapshot: BotSnapshot, hydrator: (identifier: string, snapshot: DialogueRunnerSnapshot<any>) => DialogueRunnerInterface<any>) {
    const dialogueRunners = snapshot.dialogues.map(e => hydrator(e.identifier, e.snapshot))
    const bot = new Bot(dialogueRunners)
    bot.messageLog = snapshot.messageLog
    return bot
  }

  get snapshot(): BotSnapshot {
    return {
      messageLog: this.messageLog,
      dialogues: this.dialogueRunners.map(runner => ({
        identifier: runner.identifier, snapshot: runner.snapshot
      }))
    }
  }

  start() {
    this.dialogueRunners[0].start()
  }

  onReceiveResponse(response?: any) {
    for(const middleware of this.middlewares) {
      const shouldContinue = middleware.run(response, this)
      if(!shouldContinue) {
        return
      }
    }

    const message: Message = {
      author: "user",
      body: response
    }

    this.messageLog.push(message)
    this.emit("step", message)

    for(let i = this.dialogueRunners.length - 1; i >= 0; i--) {
      const runner = this.dialogueRunners[i]
      if(runner.onReceiveResponse(response)) {
        break
      }
    }
  }

  pushDialogueRunner(runner: DialogueRunnerInterface<any>, start: boolean = true) {
    // console.log("Pushing dialogue runner", runner.identifier)

    this.dialogueRunners.push(runner)

    runner.onStep = (result, isFinished) => {
      this.addStepResultToMessageLog(result)
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

  private addStepResultToMessageLog(result: StepResult<any>) {
    const bodies = typeof result.body === "string" ? [result.body] : result.body
    bodies.forEach((body, index, array) => {
      this.messageLog.push({
        author: "bot",
        body,
        prompt: index === array.length - 1 ? result.prompt : undefined
      })
    })
  }

  private removeDialogueRunner(runner: DialogueRunnerInterface<any>) {
    // console.log("Removing dialogue runner", runner.identifier)

    if(this.dialogueRunners.length <= 1) {
      throw "Cannot remove root dialogue"
    }

    runner.onStep = undefined
    this.dialogueRunners = this.dialogueRunners.filter(e => e !== runner)

    const currentRunner = this.dialogueRunners[this.dialogueRunners.length - 1]
    currentRunner.onReceiveResponse(undefined)
  }

  // Middleware

  use(middleware: Middleware) {
    this.middlewares.push(middleware)
  }
}
