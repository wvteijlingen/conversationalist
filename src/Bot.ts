import { Attachment } from "."
import Dialogue, { DialogueSnapshot } from "./Dialogue"
import { BotMessage, Message, SYSTEM_DIALOGUE_IDENTIFIER, UserMessage } from "./Message"
import { Middleware } from "./Middleware"
import InputMode from "./input-mode"
import { TypedEvent } from "./TypedEvent"
import { uuidv4 } from "./utils"
import { DialogueOutput } from "./DialogueOutput"

export interface BotSnapshot {
  version: number
  id: string
  didStart: boolean
  messageLog: Message[]
  dialogues: Array<{
    snapshot: DialogueSnapshot<unknown>
    waiting: boolean
  }>
}

export type DialogueHydrator = (dialogueIdentifier: string, snapshot: DialogueSnapshot<any>) => Promise<Dialogue<any>>

interface StackedDialogue<State> {
  dialogue: Dialogue<State>,
  waitingFor?: string
}

/**
 * A chatbot that manages an entire conversation with one user.
 * A bot does not send any messages itself, but instead delegates that to `Dialogue` objects.
 */
export default class Bot {
  /** Unique ID that identifies this bot. */
  readonly id: string

  /** All messages that were sent or received by this bot. */
  messageLog: Message[] = []

  /** Optional logger that allows you to plug in your own logging backend. */
  logger?: Pick<Console, "debug" | "warn">

  /** All events that can be emitted by a Bot. */
  readonly events = {
    /**
     * Emitted after the message log has been changed.
     * The listener function is passed the added messages, removed messages, and updated messages.
     */
    messagesChanged: new TypedEvent<{ added: Message[], removed: Message[], updated: Message[] }>(),

    /**
     * Emitted after the `isActive` field has been changed.
     * The listener function is passed a boolean containing the new value of `isActive`.
     */
    activeChanged: new TypedEvent<boolean>(),

    /**
     * Emitted after an error occured in a dialogue.
     * The listener function is passed the error that occured.
     */
    dialogueError: new TypedEvent<Error>(),

    /**
     * Emitted after a dialogue is pushed to the dialogue stack.
     */
    dialoguePushed: new TypedEvent<Dialogue<unknown>>(),

    /**
     * Emitted after a dialogue is removed from the dialogue stack.
     */
    dialogueRemoved: new TypedEvent<Dialogue<unknown>>()
  }

  private dialogues: Array<StackedDialogue<unknown>> = []
  private middlewares: Middleware[] = []
  private didStart = false
  private _isActive = false

  /** Whether the bot is currently processing. */
  get isActive(): boolean {
    return this._isActive
  }

  private setIsActive(active: boolean) {
    if(this._isActive !== active) {
      this._isActive = active
      this.events.activeChanged.emit(this._isActive)
    }
  }

  /**
   * Returns a snapshot that reflects the current state of the bot.
   * You can serialize and save this snapshot, then use it later to instantiate a Bot from it.
   */
  get snapshot(): BotSnapshot {
    const dialogues = this.dialogues.map(dialogue => ({
      snapshot: dialogue.dialogue.snapshot,
      waitingFor: dialogue.waitingFor
    }))

    return {
      version: 1,
      id: this.id,
      didStart: this.didStart,
      messageLog: this.messageLog,
      dialogues: dialogues.filter(e => !!e.snapshot) as any
    }
  }

  /**
   * The active input mode, or undefined if the last bot message did not specify a input mode.
   */
  get inputMode(): InputMode | undefined {
    const lastMessage = this.messageLog[this.messageLog.length - 1]
    if(lastMessage?.author === "bot") {
      return lastMessage.inputMode
    }
  }

  private get activeDialogue(): StackedDialogue<unknown> | undefined {
    return this.dialogues[this.dialogues.length - 1]
  }

  private get lastBotMessage(): BotMessage | undefined {
    const botMessages = this.messageLog.filter(e => e.author === "bot") as BotMessage[]
    return botMessages[botMessages.length - 1]
  }

  /**
   * Instantiate a new Bot with the given root dialogue.
   * This does not automatically start the dialogue.
   */
  constructor(rootDialogue?: Dialogue<any>, id = uuidv4()) {
    this.id = id
    if(rootDialogue) {
      this.pushDialogue(rootDialogue, false)
    }
  }

  /**
   * Instantiate a new Bot from the given snapshot.
   * For each dialogue in the bot snapshot, the dialogue hydrator will be called to instantiate the dialogue.
   */
  static async fromSnapshot(snapshot: BotSnapshot, dialogueHydrator: DialogueHydrator) {
    const dialogues = await Promise.all(snapshot.dialogues.map(e => dialogueHydrator(e.snapshot.name, e.snapshot)))
    const bot = new Bot(undefined, snapshot.id)
    for(const dialogue of dialogues) {
      bot.pushDialogue(dialogue, false)
    }
    bot.didStart = snapshot.didStart
    bot.messageLog = snapshot.messageLog
    return bot
  }

  /**
   * Start the root dialogue. This is a noop if it is already started.
   */
  start() {
    if(this.didStart) {
      return
    }

    this.log("Starting bot")

    if(this.activeDialogue) {
      this.activeDialogue.dialogue.onStart()
      this.didStart = true
    } else {
      throw new Error("Cannot start because there are no dialogues on the stack.")
    }
  }

  /**
   * Send a user message to the bot.
   * @param body The optional text body of the message. This will be added to the message log.
   * @param value The optional value of the message. Defaults to the body if not given.
   */
  sendUserMessage({ body, value, attachment }: { body?: string; value?: unknown; attachment?: Attachment } = {}) {
    for(const middleware of this.middlewares) {
      if(!middleware.before) {
        continue
      }
      const shouldContinue = middleware.before(body, value, this)
      if(!shouldContinue) {
        return
      }
    }

    if(body) {
      const message: UserMessage = {
        id: uuidv4(),
        author: "user",
        creationDate: new Date(),
        body,
        value,
        attachment,
        isUndoAble: (this.lastBotMessage?._meta.rewindToken !== undefined) || false
      }

      this.addMessages([message])
    }

    if(this.activeDialogue) {
      this.log(`Handling input "${body}" <${value}> by dialogue "${this.activeDialogue.dialogue.name}"`)
      try {
        this.activeDialogue.dialogue.onReceiveInput(value !== undefined ? value : body, attachment)
      } catch(error) {
        this.events.dialogueError.emit(error)
      }
    } else {
      this.log(`Received input "${body}" <${value}> but there is not active dialogue.`)
    }
  }

  /**
   * Undoes a user message with the given id.
   * @param messageId The id of the message to undo.
   */
  undoUserMessage(messageId: string) {
    const indexOfUndidMessage = this.messageLog.findIndex(e => e.id === messageId && e.author === "user")
    if(indexOfUndidMessage === -1) {
      throw new Error(`User message with id ${messageId} does not exist in the message log.`)
    }

    // Find the first bot message that preceded the response message
    let botMessage: BotMessage | undefined
    for(let i = indexOfUndidMessage; i >= 0; i--) {
      if(this.messageLog[i].author === "bot") {
        botMessage = this.messageLog[i] as BotMessage
        break
      }
    }

    if(!botMessage || !botMessage._meta.rewindToken) {
      throw new Error("No rewind data found for preceding bot message.")
    }

    if(this.activeDialogue === undefined || botMessage._meta.dialogueIdentifier !== this.activeDialogue.dialogue.name) {
      throw new Error("Cannot undo a response that was given outside of the active dialogue.")
    }

    if(!this.activeDialogue?.dialogue.rewind) {
      throw new Error(`Cannot undo a response for active dialogue because the dialogue does not implement the "rewind" method.`)
    }

    this.log(`Undid response ${messageId}`)

    const removedMessages = this.messageLog.slice(indexOfUndidMessage)
    this.messageLog = this.messageLog.slice(0, indexOfUndidMessage)
    this.activeDialogue.dialogue.rewind(botMessage._meta.rewindToken)
    this.events.messagesChanged.emit({ added: [], removed: removedMessages, updated: [] })
  }

  /**
   * Pushes the given dialogue to the dialogue stack and starts it.
   * @param dialogue The dialogue to start.
   * @param clearDialogueStack Whether to clear the entire existing dialogue stack before starting the new dialogue.
   */
  startDialogue(dialogue: Dialogue<unknown>, clearDialogueStack = false) {
    if(clearDialogueStack) {
      [...this.dialogues].forEach(e => this.removeDialogue(e.dialogue))
    }
    this.pushDialogue(dialogue, true)
  }

  /**
   * Append the given middleware to the middlewares stack.
   */
  use(middleware: Middleware) {
    this.middlewares.push(middleware)
  }

  /**
   * Interjects the given messages by adding them to the message log.
   * This can be useful to send "one-off" messages from middleware or outside of a dialogue.
   * @param messages
   */
  interjectMessages(messages: string[]) {
    const botMessages: BotMessage[] = messages.map(message => ({
      id: uuidv4(),
      author: "bot",
      creationDate: new Date(),
      body: message,
      _meta: { dialogueIdentifier: SYSTEM_DIALOGUE_IDENTIFIER }
    }))

    this.addMessages(botMessages)
  }

  /**
   * Sends an `onInterrupt` call to the active dialogue.
   */
  interrupt() {
    this.log("Interrupting active dialogue")
    try {
      this.activeDialogue?.dialogue.onInterrupt?.()
    } catch(error) {
      this.events.dialogueError.emit(error)
    }
  }

  // Sends an `onResume` call to the active dialogue.
  resume() {
    this.log("Resuming active dialogue")
    try {
      this.activeDialogue?.dialogue.onResume?.()
    } catch(error) {
      this.events.dialogueError.emit(error)
    }
  }

  /**
   * Push the given dialogue to the dialogue stack, optionally starting it.
   * @param dialogue The dialogue to push.
   * @param start Whether to start it.
   */
  private pushDialogue<State>(dialogue: Dialogue<State>, start: boolean = true): StackedDialogue<State> {
    this.log(`Pushing dialogue: ${dialogue.name}`)

    dialogue.id = uuidv4()

    try {
      this.activeDialogue?.dialogue.onInterrupt?.()
    } catch(error) {
      this.events.dialogueError.emit(error)
    }

    dialogue.events.outputStart = () => this.handleDialogueOutputStart(dialogue)
    dialogue.events.output = output => this.handleDialogueOutput(dialogue, output)
    dialogue.events.error = error => this.handleDialogueError(dialogue, error)

    this.dialogues.push({ dialogue })

    if(start) {
      try {
        dialogue.onStart()
      } catch(error) {
        this.events.dialogueError.emit(error)
      }
    }

    this.events.dialoguePushed.emit(dialogue)

    return { dialogue }
  }

  private popActiveDialogue(finishValue: unknown) {
    const dialogueToRemove = this.activeDialogue?.dialogue

    if(!dialogueToRemove) {
      return
    }

    this.removeDialogue(dialogueToRemove)

    const next = this.activeDialogue

    if(next) {
      try {
        next.dialogue.onResume?.(next.waitingFor === dialogueToRemove.id ? finishValue : undefined)
      } catch(error) {
        this.events.dialogueError.emit(error)
      }
    }
  }

  private removeDialogue<State>(dialogue: Dialogue<State>) {
    dialogue.events = {}
    this.dialogues = this.dialogues.filter(e => e.dialogue !== dialogue)

    // Find the last prompts of the dialogue and set `isUndoAble` to false.
    for(let i = this.messageLog.length - 1; i >= 0; i--) {
      const message = this.messageLog[i]
      if(message.author === "bot" && message._meta.dialogueIdentifier === dialogue.name && message.prompt) {
        message.prompt.isUndoAble = false
        this.events.messagesChanged.emit({ added: [], removed: [], updated: [message] })
        break
      }
    }

    this.events.dialogueRemoved.emit(dialogue)
    this.log(`Removed dialogue: ${dialogue.name}`)
  }

  private handleDialogueOutputStart(dialogue: Dialogue<unknown>) {
    if(dialogue !== this.activeDialogue?.dialogue) {
      this.log(`An inactive dialogue emitted an outputStart event. This is not supported, the event will be discarded. Dialogue: ${dialogue.name}`, "warn")
      return
    }

    this.setIsActive(true)
  }

  private handleDialogueOutput(dialogue: Dialogue<unknown>, output: DialogueOutput) {
    if(dialogue !== this.activeDialogue?.dialogue) {
      this.log(`An inactive dialogue emitted an output event. This is not supported, the event will be discarded. Dialogue: ${dialogue.name}`, "warn")
      return
    }

    this.setIsActive(false)

    for(const middleware of this.middlewares.slice().reverse()) {
      if(!middleware.after) {
        continue
      }
      middleware.after(output, this)
    }

    const messages = this.buildMessagesFromDialogueOutput(output, dialogue.name)
    this.addMessages(messages)

    if(output.action === "transition") {
      this.pushDialogue(output.to, true)
      this.removeDialogue(dialogue)
    } else if(output.action === "wait") {
      const pushedDialogue = this.pushDialogue(output.to, true)
      this.activeDialogue.waitingFor = pushedDialogue.dialogue.id
    }
  }

  private handleDialogueError(dialogue: Dialogue<unknown>, error: Error) {
    if(dialogue === this.activeDialogue?.dialogue) {
      this.setIsActive(false)
    }

    this.events.dialogueError.emit(error)
  }

  private addMessages(messages: Message[]) {
    if(messages.length === 0) {
      return
    }

    this.messageLog = [...this.messageLog, ...messages]
    this.events.messagesChanged.emit({ added: messages, removed: [], updated: [] })
  }

  private buildMessagesFromDialogueOutput(output: DialogueOutput, dialogueIdentifier: string): BotMessage[] {
    if(!output.messages) {
      return []
    }

    const messages = Array.isArray(output.messages) ? output.messages : [output.messages]

    return messages.map((message, index, array): BotMessage => ({
      id: uuidv4(),
      author: "bot",
      creationDate: new Date(),
      body: typeof message === "string" ? message : message.body,
      attachment: typeof message === "string" ? undefined : message.attachment,
      inputMode: index === array.length - 1 ? output.inputMode : undefined,
      _meta: {
        dialogueIdentifier,
        rewindToken: output.rewindToken
      }
    }))
  }

  private log(message?: any, level: "debug" | "warn" = "debug") {
    this.logger?.[level](message)
  }

  logDebugInfo() {
    this.log("=== Message log ===")
    for(const message of this.messageLog) {
      this.log(message)
    }

    this.log("=== Dialogue stack ===")
    for(const dialogue of this.dialogues) {
      // @ts-ignore: We know that the dialog contains a state property.
      this.log(`${dialogue.identifier} – ${JSON.stringify(dialogue.state)}`)
    }
  }
}
