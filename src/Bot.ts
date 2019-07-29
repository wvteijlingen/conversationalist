import { EventEmitter } from "events"
import Dialogue, { DialogueSnapshot, StepResult } from "./Dialogue"
import Prompt from "./Prompts"
import { uuidv4 } from "./utils"

// A message sent by the bot.
interface BotMessage {
  id: string
  author: "bot"
  creationDate: Date
  body: string
  prompt?: Prompt,
  _meta: {
    dialogueIdentifier: string | "_system"
    rewindData?: unknown
  }
}

// A message sent by the user.
interface UserMessage {
  id: string
  author: "user"
  creationDate: Date
  body: string
  value?: unknown
}

export type Message = BotMessage | UserMessage

export interface Middleware {
  // Called after a response is received by the bot, but before it is dispatched
  // to the active dialogue.
  // If you return false, processing is halted and the response will not be passed
  // to subsequent middleware and dialogues.
  before?: (body: string, value: unknown | undefined, bot: Bot) => boolean

  // Called after the active dialogue returned its step result, but before the result
  // is processed by the bot.
  after?: (stepResult: StepResult, bot: Bot) => void
}

interface BotSnapshot {
  didStart: boolean
  messageLog: Message[]
  dialogues: Array<DialogueSnapshot<unknown>>
}

export type DialogueHydrator = (dialogueIdentifier: string, snapshot?: DialogueSnapshot<any>) => Dialogue<any>

export default class Bot extends EventEmitter {
  // All messages that were sent or received by this bot.
  messageLog: Message[] = []

  // Used to instantiate a dialogue from a dialogue identifier, optionally with a snapshot.
  readonly dialogueHydrator?: DialogueHydrator

  // Optional logger that allows you to plug in your own logging backend.
  logger?: (message: string) => void

  // Whether to output debug messages as chat messages.
  debugMode = false

  private dialogues: Array<Dialogue<unknown>> = []
  private middlewares: Middleware[] = []
  private didStart = false

  // Instantiate a new Bot with the given root dialogue and dialogue hydrator.
  // This does not automatically start the root dialogue.
  constructor(rootDialogue: Dialogue<any>, dialogueHydrator?: DialogueHydrator) {
    super()
    this.dialogueHydrator = dialogueHydrator
    this.pushDialogue(rootDialogue, false)
  }

  // Instantiate a new Bot from the given snapshot.
  // For each dialogue in the bot snapshot, the dialogue hydrator will be called to instantiate the dialogue.
  static fromSnapshot(snapshot: BotSnapshot, dialogueHydrator: DialogueHydrator) {
    const dialogues = snapshot.dialogues.map(e => dialogueHydrator(e.identifier, e))
    const bot = new Bot(dialogues[0], dialogueHydrator)
    for(const dialogue of dialogues) {
      bot.pushDialogue(dialogue, false)
    }
    bot.didStart = snapshot.didStart
    bot.messageLog = snapshot.messageLog
    return bot
  }

  // Returns a snapshot that reflects the current state of the bot.
  // You can serialize and save this snapshot, then use it later to instantiate a Bot from it.
  get snapshot(): BotSnapshot {
    return {
      didStart: this.didStart,
      messageLog: this.messageLog,
      dialogues: this.dialogues.map(e => e.snapshot)
    }
  }

  // The active prompt mode, or undefined if the last bot message did not specify a prompt.
  get activePrompt(): Prompt | undefined {
    const lastMessage = this.messageLog[this.messageLog.length - 1]
    if(lastMessage.author === "bot") {
      return lastMessage.prompt
    }
  }

  private get activeDialogue(): Dialogue<unknown> | undefined {
    return this.dialogues[this.dialogues.length - 1]
  }

  // Start the root dialogue.
  // @throws if didStart was already called.
  start() {
    if(this.didStart) {
      throw new Error("Cannot start because the bot has already started.")
    }

    if(this.activeDialogue) {
      this.activeDialogue.onStart()
      this.didStart = true
    } else {
      throw new Error("Cannot start because there are no dialogues on the stack.")
    }
  }

  // Send a user response to the bot.
  // @param body The text body of the response.
  // @param value The optional value of the response. Will default to the body.
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

    if(this.activeDialogue) {
      this.activeDialogue.onReceiveResponse(value !== undefined ? value : body)
    } else {
      this.logDebug("Received response but there is not active dialogue.")
    }
  }

  // Undoes a user response with the given id.
  // @param messageId The id of the response message to undo.
  undoResponse(messageId: string) {
    const index = this.messageLog.findIndex(e => e.id === messageId && e.author === "user")
    if(index === -1) {
      throw new Error(`User message with id ${messageId} does not exist in the message log.`)
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

  // Pushes a dialogue with the given identifier and starts it.
  // This will use the `dialogueHydrator` property to hydrate the dialogue.
  pushDialogueWithIdentifier(identifier: string) {
    if(!this.dialogueHydrator) {
      throw new Error("You pushed or transitioned to a dialogue, but did not provide a `dialogueHydrator`.")
    }
    const nextDialogue = this.dialogueHydrator(identifier)

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
      dialogue.onStart()
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
      this.pushDialogueWithIdentifier(result.nextDialogueIdentifier)
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
}
