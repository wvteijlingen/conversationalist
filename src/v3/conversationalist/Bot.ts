import { EventEmitter } from "events"
import Dialogue, { DialogueSnapshot, StepResult } from "./Dialogue"
import Prompt from "./Prompts"

interface BotMessage {
  id: string
  author: "bot"
  creationDate: Date
  body: string
  prompt?: Prompt,
  _meta: {
    dialogueIdentifier: string
    rewindData?: unknown
  }
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
  after?: (stepResult: StepResult, bot: Bot) => void
}

interface BotSnapshot {
  messageLog: Message[]
  dialogues: Array<DialogueSnapshot<unknown>>
}

export class Bot extends EventEmitter {
  messageLog: Message[] = []
  dialogueFromIdentifier?: (identifier: string) => Dialogue<any>
  logger?: (message: string) => void
  debugMode = false

  private dialogues: Array<Dialogue<unknown>> = []
  private middlewares: Middleware[] = []

  constructor(rootDialogue: Dialogue<any>) {
    super()
    this.pushDialogue(rootDialogue, false)
  }

  static fromSnapshot(snapshot: BotSnapshot, hydrator: (snapshot: DialogueSnapshot<any>) => Dialogue<any>) {
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

  get activePrompt(): Prompt | undefined {
    const lastMessage = this.messageLog[this.messageLog.length - 1]
    if(lastMessage.author === "bot") {
      return lastMessage.prompt
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

  undoResponse(messageId: string) {
    const index = this.messageLog.findIndex(e => e.id === messageId)
    if(index === -1) {
      throw new Error(`Message with id ${messageId} does not exist in the message log.`)
    }

    // Find the first bot message that preceded the response message
    let botMessage: BotMessage | undefined
    for(let i = index; i >= 0; i--) {
      if(this.messageLog[i].author === "bot") {
        botMessage = this.messageLog[i] as BotMessage
        break
      }
    }

    if(!botMessage || !botMessage._meta.rewindData) {
      throw new Error("No rewind data found for preceding bot message.")
    }

    if(this.activeDialogue === undefined || botMessage._meta.dialogueIdentifier !== this.activeDialogue.identifier) {
      throw new Error("Cannot undo a response that was given outside of the active dialogue.")
    }

    this.logDebug(`Undid response ${messageId}`)
    this.messageLog = this.messageLog.slice(0, index)
    this.activeDialogue.rewind(botMessage._meta.rewindData)
  }

  pushDialogueWithIdentifier(identifier: string) {
    if(!this.dialogueFromIdentifier) {
      throw new Error("`dialogueFromIdentifier` is not implemented.")
    }
    const nextDialogue = this.dialogueFromIdentifier(identifier)

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
      body: message,
      _meta: { dialogueIdentifier: "_system" }
    }) as BotMessage)

    this.addMessages(botMessages)
  }

  // Push the given dialogue to the dialogue stack, optionally running it.
  private pushDialogue(dialogue: Dialogue<unknown>, runStartStep: boolean = true) {
    this.logDebug(`Pushing dialogue: ${dialogue.identifier}`)

    this.activeDialogue && this.activeDialogue.onInterrupt()
    dialogue.onStep = (result, isFinished) => this.onDialogueStep(dialogue, result, isFinished)
    this.dialogues.push(dialogue)

    if(runStartStep) {
      dialogue.start()
    }
  }

  private onDialogueStep(dialogue: Dialogue<unknown>, result: StepResult, isFinished: boolean) {
    for(const middleware of this.middlewares.slice().reverse()) {
      if(!middleware.after) {
        continue
      }
      middleware.after(result, this)
    }

    const messages = this.messagesFromStepResult(result, dialogue.identifier)
    this.addMessages(messages)

    if(isFinished) {
      this.removeDialogue(dialogue)
    }

    if(result.nextDialogueIdentifier !== undefined) {
      if(!this.dialogueFromIdentifier) {
        throw new Error("`dialogueFromIdentifier` is not implemented.")
      }
      const nextDialogue = this.dialogueFromIdentifier(result.nextDialogueIdentifier)
      this.pushDialogue(nextDialogue, true)
    }
  }

  private addMessages(messages: Message[]) {
    this.messageLog = [...this.messageLog, ...messages]
    this.emit("messagesAdded", messages)
  }

  private removeDialogue<State>(dialogue: Dialogue<State>) {
    dialogue.onStep = undefined
    this.dialogues = this.dialogues.filter(e => e !== dialogue)

    // Repeat last bot message of the previous dialogue
    if(this.activeDialogue) {
      for(let i = this.messageLog.length - 1; i >= 0; i--) {
        const message = this.messageLog[i]
        if(message.author === "bot" && message._meta.dialogueIdentifier === this.activeDialogue.identifier) {
          this.addMessages([message])
          break
        }
      }
      this.activeDialogue.onResume()
    }

    this.logDebug(`Removed dialogue: ${dialogue.identifier}`)
  }

  private messagesFromStepResult(result: StepResult, dialogueIdentifier: string): BotMessage[] {
    if(result.body === "undefined") {
      return []
    }

    const bodies = Array.isArray(result.body) ? result.body : [result.body]
    return bodies.map((body, index, array) => ({
      id: uuidv4(),
      author: "bot",
      creationDate: new Date(),
      body,
      prompt: index === array.length - 1 ? result.prompt : undefined,
      _meta: {
        dialogueIdentifier,
        rewindData: result.rewindData
      }
    } as BotMessage))
  }

  private logDebug(message: string) {
    if(this.logger) {
      this.logger("Received response but there are no dialogues on the stack.")
    }

    if(this.debugMode) {
      this.interjectMessages([`[${message}]`])
    }
  }

  private get activeDialogue(): Dialogue<unknown> | undefined {
    return this.dialogues[this.dialogues.length - 1]
  }
}

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === "x" ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
