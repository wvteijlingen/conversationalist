import Bot from "./Bot"
import { Message } from "./Message"
import InputMode from "./input-mode"
import { Disposable as DisposableEventListener, TypedEvent } from "./TypedEvent"

const pause = (milliseconds: number) => new Promise(res => setTimeout(res, milliseconds))

export default class DelayedTypingEmitter {
  private isTyping: boolean = false
  private isActive: boolean
  private messages: Message[]
  private prompt?: InputMode

  private botListeners: DisposableEventListener[] = []
  private pendingMessages: Message[] = []
  private currentTimeout?: NodeJS.Timeout
  private isFlushing = false

  readonly readingDelay: number
  readonly typingDelay: number

  readonly events = {
    update: new TypedEvent<{ isTyping: boolean, allMessages: Message[], addedMessage?: Message, prompt?: InputMode }>()
  }

  /**
   *
   * @param bot The underlying bot for which typing behaviour is simulated.
   * @param readingDelay Time in milliseconds spent by the bot "reading" a user message.
   * @param typingDelay Time in milliseconds spent by the bot "typing" a message.
   */
  constructor(bot: Bot, { readingDelay = 500, typingDelay = 1500 }: { readingDelay?: number, typingDelay?: number } = {}) {
    this.readingDelay = readingDelay
    this.typingDelay = typingDelay

    this.isActive = bot.isActive
    this.messages = bot.messageLog
    this.prompt = bot.inputMode

    this.botListeners.push(bot.events.activeChanged.on(async active => {
      this.isActive = active
      await pause(this.readingDelay * 1.5)
      this.sendStateUpdate()
    }))

    this.botListeners.push(bot.events.messagesChanged.on(({ added, removed, updated }) => {
      if(removed.length > 0 || updated.length > 0) {
        this.setMessages(bot.messageLog)
      } else if(added.length > 0) {
        this.addMessages(added)
      }
    }))

    this.sendStateUpdate()
  }

  addMessages(messages: Message[]) {
    this.pendingMessages = [...this.pendingMessages, ...messages]
    this.flushNextPendingMessage(true)
  }

  setMessages(messages: Message[]) {
    this.cancelFlushing()
    this.messages = messages
    this.pendingMessages = []
    this.isTyping = false
    this.sendStateUpdate()
  }

  clearListeners() {
    for(const listener of this.botListeners) {
      listener.dispose()
    }
  }

  private flushNextPendingMessage(delayFirst = false) {
    if(this.isFlushing) {
      return
    }

    const message = this.pendingMessages.shift()

    if(!message) {
      return
    }

    if(message.author === "bot") {
      setTimeout(() => this.flushMessage(message), this.readingDelay)
    } else {
      this.messages = [...this.messages, message]

      if(this.pendingMessages.length === 0) {
        this.isTyping = false
        this.isFlushing = false
        this.sendStateUpdate(message)
      } else {
        this.sendStateUpdate(message)
        this.flushNextPendingMessage()
      }
    }
  }

  private flushMessage(message: Message) {
    this.isFlushing = true
    this.isTyping = true

    this.sendStateUpdate()

    this.currentTimeout = setTimeout(() => {
      this.isFlushing = false
      this.messages = [...this.messages, message]

      if(this.pendingMessages.length === 0 && message.author === "bot") {
        this.prompt = message.prompt
      } else {
        this.prompt = undefined
      }

      if(this.pendingMessages.length === 0) {
        this.isTyping = false
        this.isFlushing = false
        this.sendStateUpdate(message)
      } else {
        this.sendStateUpdate(message)
        this.flushNextPendingMessage(false)
      }
    }, this.typingDelay)
  }

  private cancelFlushing() {
    if(this.currentTimeout) {
      clearTimeout(this.currentTimeout)
    }

    this.isFlushing = false
  }

  private sendStateUpdate(addedMessage?: Message) {
    this.events.update.emit({
      isTyping: this.isFlushing ? this.isTyping : this.isActive,
      allMessages: this.messages,
      addedMessage,
      prompt: this.isActive || this.isFlushing || this.isTyping ? undefined : this.prompt
    })
  }
}
