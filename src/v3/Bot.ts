import { EventEmitter } from "events"
import Dialogue, { DialogueSnapshot, StepResult } from "./Dialogue"
import Prompt from "./Prompts"

interface BotMessage {
  id: string
  author: "bot"
  creationDate: Date
  body: string
  prompt?: Prompt
}

interface UserMessage {
  id: string
  author: "user"
  creationDate: Date
  body: string
  value?: unknown
}

export type Message = BotMessage | UserMessage

export interface Middleware {
  before?: (body: string, value: unknown | undefined, bot: Bot) => boolean
  after?: (stepResult: StepResult<any>, bot: Bot) => void
}

interface BotSnapshot {
  messageLog: Message[]
  dialogues: Array<DialogueSnapshot<unknown>>
}

export class Bot extends EventEmitter {
  messageLog: Message[] = []
  initDialogue?: (identifier: string) => Dialogue<any>
  logger?: (message: string) => void
  debugMode = false

  private dialogues: Array<Dialogue<any>> = []
  private middlewares: Middleware[] = []

  constructor(rootDialogue: Dialogue<any>) {
    super()
    // const dialogues = Array.isArray(dialogue) ? dialogue : [dialogue]
    // if(dialogues.length === 0) {
    //   throw new Error("A bot must be constructed with at least 1 dialog dialogue")
    // }
    // for(const dialogue of dialogues) {
    this.pushDialogue(rootDialogue, false)
    // }
  }

  static fromSnapshot(snapshot: BotSnapshot, hydrator: <S>(snapshot: DialogueSnapshot<S>) => Dialogue<S>) {
    const dialogues = snapshot.dialogues.map(e => hydrator(e))
    const bot = new Bot(dialogues[0])
    for(const dialogue of dialogues) {
      bot.pushDialogue(dialogue, false)
    }
    bot.messageLog = snapshot.messageLog
    return bot
  }

  get snapshot(): BotSnapshot {
    return {
      messageLog: this.messageLog,
      dialogues: this.dialogues.map(e => e.snapshot)
    }
  }

  // Start the root dialogue.
  start() {
    if(!this.dialogues[0]) {
      throw new Error("Cannot start because there are no dialogues on the stack.")
    }

    this.dialogues[0].start()
  }

  // Send a user response to the bot.
  respond(body: string, value?: unknown) {
    for(const middleware of this.middlewares) {
      if(!middleware.before) {
        continue
      }
      const shouldContinue = middleware.before(body, value, this)
      if(!shouldContinue) {
        return
      }
    }

    const message: UserMessage = {
      id: uuidv4(),
      author: "user",
      creationDate: new Date(),
      body,
      value
    }

    this.addMessages([message])

    if(this.dialogues.length === 0) {
      this.logDebug("Received response but there are no dialogues on the stack.")
    }

    for(let i = this.dialogues.length - 1; i >= 0; i--) {
      const dialogue = this.dialogues[i]
      if(dialogue.onReceiveResponse(value !== undefined ? value : body)) {
        break
      }
    }
  }

  pushDialogueWithIdentifier<State>(identifier: string) {
    if(!this.initDialogue) {
      throw new Error("`initDialogue` is not implemented.")
    }
    const nextDialogue = this.initDialogue(identifier)

    this.pushDialogue(nextDialogue, true)
  }

  // Append the given middleware to the middlewares stack.
  use(middleware: Middleware) {
    this.middlewares.push(middleware)
  }

  // Interjects the given messages without handling them.
  // This can be useful to send "one-off" messages from middleware or outside of a dialogue.
  interjectMessages(messages: string[]) {
    const botMessages = messages.map(message => ({
      id: uuidv4(),
      author: "bot",
      creationDate: new Date(),
      body: message
    }) as BotMessage)

    this.addMessages(botMessages)
  }

  // Push the given dialogue to the dialogue stack, optionally running it.
  private pushDialogue<State>(dialogue: Dialogue<State>, runStartStep: boolean = true) {
    // console.log("Pushing dialogue dialogue", dialogue.identifier)

    this.logDebug(`Pushing dialogue: ${dialogue}`)

    this.dialogues.push(dialogue)

    dialogue.onStep = (result, isFinished) => {
      for(const middleware of this.middlewares.slice().reverse()) {
        if(!middleware.after) {
          continue
        }
        middleware.after(result, this)
      }

      const messages = this.messagesFromStepResult(result)
      this.addMessages(messages)

      if(isFinished) {
        this.removeDialogue(dialogue)
      }

      if(result.nextDialogueIdentifier !== undefined) {
        if(!this.initDialogue) {
          throw new Error("`initDialogue` is not implemented.")
        }
        const nextDialogue = this.initDialogue(result.nextDialogueIdentifier)
        this.pushDialogue(nextDialogue, true)
      }
    }

    if(runStartStep) {
      dialogue.start()
    }
  }

  private addMessages(messages: Message[]) {
    this.messageLog = [...this.messageLog, ...messages]
    this.emit("messagesAdded", messages)
  }

  private removeDialogue<State>(dialogue: Dialogue<State>) {
    // console.log("Removing dialogue dialogue", dialogue.identifier)

    // if(this.dialogues.length <= 1) {
    //   throw new Error("Cannot remove root dialogue")
    // }

    dialogue.onStep = undefined
    this.dialogues = this.dialogues.filter(e => e !== dialogue)

    this.logDebug(`Removed dialogue: ${dialogue}`)

    // const currentRunner = this.dialogues[this.dialogues.length - 1]
    // currentRunner.onReceiveResponse(undefined)
  }

  private messagesFromStepResult<State>(result: StepResult<State>): BotMessage[] {
    if(result.body === "undefined") {
      return []
    }

    const bodies = Array.isArray(result.body) ? result.body : [result.body]
    return bodies.map((body, index, array) => ({
      id: uuidv4(),
      author: "bot",
      creationDate: new Date(),
      body,
      prompt: index === array.length - 1 ? result.prompt : undefined
    } as BotMessage))
  }

  private logDebug(message: string) {
    if(this.logger) {
      this.logger("Received response but there are no dialogues on the stack.")
    }

    if (this.debugMode) {
      this.interjectMessages([message])
    }
  }
}

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === "x" ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
