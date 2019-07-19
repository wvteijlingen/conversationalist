import { EventEmitter } from "events";

interface Attachment {
  body: string,
  value?: any
}

export interface BotMessage {
  author: "bot"
  body: string
  attachments?: Attachment[]

  // Responses
  responseType?: "text" | "prefab" | "slider"
  prefabAnswers?: { body: string, value?: any }[]
}

export interface UserMessage {
  author: "user"
  body?: string
  value?: any
  attachments?: Attachment[]
}

export type Message = BotMessage | UserMessage

// function isBotMessage(message: Message): message is BotMessage {
//   return message.author === "bot"
// }
//
// function isUserMessage(message: Message): message is UserMessage {
//   return message.author === "user"
// }

abstract class ImperativeConversation extends EventEmitter {
  protected DEFAULT_TYPING_DURATION = 500

  // Whether the bot is currently typing.
  isTyping = false

  // A log of all messages sent and received in the oconversation.
  messageLog: Message[] = []
  // onIsTypingChanged: ((isTyping: boolean) => void) | undefined
  // onMessageLogChanged: (() => void) | undefined
  // onBotMessageAdded: ((message: BotMessage) => void) | undefine

  // Whether this conversation can still go forward.
  isFinished = false

  private activeResolver: ((message: UserMessage) => void) | undefined
  private sendQueue: Array<{ message: Message, resolver?: (value: any) => void, typingDuration?: number }> = []
  private sendTimeout: NodeJS.Timeout | undefined

  private sendNextMessageFromQueue() {
    if(this.sendTimeout !== undefined) {
      return
    }

    let pendingItem = this.sendQueue.shift();

    if(pendingItem) {
      this.messageLog.push(pendingItem.message)
      this.emit('messageAdded', pendingItem.message)
      // this.onMessageLogChanged && this.onMessageLogChanged()
      this.activeResolver = pendingItem.resolver
      // if(isBotMessage(pendingItem.message)) {
      //   this.onBotMessageAdded && this.onBotMessageAdded(pendingItem.message)
      // }
    }

    // Check if there are remaining messages in the queue, and schedule a check if needed
    if(this.sendQueue.length > 0 && !this.sendTimeout) {
      this.isTyping = true
      this.emit('typingchanged', this.isTyping)
      // this.onIsTypingChanged && this.onIsTypingChanged(this.isTyping)
      const typingDuration = this.sendQueue[0].typingDuration || this.DEFAULT_TYPING_DURATION
      this.sendTimeout = setTimeout(() => this.sendNextMessageFromQueue(), typingDuration)
    } else {
      this.isTyping = false
      this.emit('typingchanged', this.isTyping)
      // this.onIsTypingChanged && this.onIsTypingChanged(this.isTyping)
    }
  }

  private async enqueueBotMessage(message: Message) {
    if(this.isFinished) {
      throw "Cannot queue message when conversation is finished."
    }

    this.sendQueue.push({ message })
    this.sendNextMessageFromQueue()
  }

  private queueResolvableMessage<ResponseType>(message: Message): Promise<ResponseType> {
    if(this.isFinished) {
      throw "Cannot queue question when conversation is finished."
    }

    let resolver;
    let promise = new Promise<ResponseType>((resolve, _reject) => {
      resolver = resolve
    });

    this.sendQueue.push({ message, resolver })
    return promise
  }

  // Send a message.
  protected send(message: string) {
    this.enqueueBotMessage({ author: "bot", body: message })
  }

  // Send a question without prefab answers.
  protected async askOpenQuestion(question: string): Promise<string> {
    const botMessage: BotMessage = {
      author: "bot",
      body: question,
      responseType: "text"
    }

    return this.queueResolvableMessage<string>(botMessage)
  }

  // Send a question that has prefab answers.
  protected async askClosedQuestion<T>(question: string, answers?: { body: string, value?: T }[]): Promise<T> {
    const botMessage: BotMessage = {
      author: "bot",
      body: question,
      responseType: "prefab",
      prefabAnswers: answers
    }

    return this.queueResolvableMessage<T>(botMessage)
  }

  // Marks the given `checkpoint` as reached.
  protected setCheckpoint(checkpoint: string) {
    this.reachedCheckpoint(checkpoint)
  }

  // Finish the conversation.
  protected finish() {
    this.isFinished = true
  }

  // Asks the user if he wants to resume the previous conversation.
  // By default, this will ask a generic question whether the user wants to continue.
  // You can override this method to customize the message or explicitly return a value.
  // @return Whether the conversation should resume.
  protected async shouldResume(_checkpoint: string): Promise<boolean> {
    this.send("It seems we were in the middle of a conversation.")
    return this.askClosedQuestion("Do you want to pick up where we left?", [
      { body: 'Yes', value: true },
      { body: 'No thanks', value: false }
    ])
  }

  // Start the conversation from the beginning.
  start() {
    this.messageLog = []
    this.isFinished = false
  }

  // Attempt to resume the conversation from the given `checkpoint`.
  async resume(checkpoint: string) {
    if(await this.shouldResume(checkpoint)) {
      this.resume(checkpoint)
    } else {
      this.start()
    }
  }

  // Answer the last question.
  // @param {body} A response message.
  // @param {value} A value that can represent various things. E.g. a prefab answer id, a slider value, etc.
  // @param {attachments} Optional attachments that are added to the message.
  answer(body?: string, value?: any, attachments?: Attachment[]) {
    const userMessage: UserMessage = { author: "user", body, value, attachments }

    this.messageLog.push(userMessage)
    this.emit('messageAdded', userMessage)

    if(this.activeResolver) {
      this.activeResolver(userMessage)
    } else {
      this.handleFreeInput(userMessage)
    }
  }

  // Called when a message is received outside of a response to a question.
  // You can use this methods to handle general messages such as "help", "hi", etc.
  protected abstract handleFreeInput(message: UserMessage): any

  // Called when a certain `checkpoint` is reached.
  // You can use this method to store the checkpoint and any related date.
  protected abstract reachedCheckpoint(checkpoint: string): void

  // Called when the conversation should resume from a checkpoint.
  // You can check the passed `checkpoint` and jump to a suitable point in the conversation.
  protected abstract continueFromCheckpoint(checkpoint: string): void
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


enum Gender { Male, Female }

export default class OnboardingConversation extends ImperativeConversation {
  private username: string | undefined
  private gender: Gender | undefined

  protected handleFreeInput(value: any): any {
    this.send(`I didn't ask you anything, but you just said: "${value}."`)
  }

  protected async continueFromCheckpoint(checkpoint: string) {
    if(checkpoint === "askForUserName") {
      this.askForGender()
    }
  }

  protected reachedCheckpoint(checkpoint: string): void {
    // TODO
  }


  // Dialog sections

  start() {
    super.start()

    this.send("Hi, ik ben Oki!")
    this.send("We gaan lekker lullen met z'n 2en.")

    this.setCheckpoint("introduction")
    this.askForUserName()
  }

  async askForUserName() {
    this.username = await this.askOpenQuestion("Wat is jouw naam?")
    this.send(`Hi ${this.username}, leuk dat je mee doet.`)

    this.setCheckpoint("askForUserName")
    this.askForGender()
  }

  async askForGender() {
    this.gender = await this.askClosedQuestion(`Wat is je geslacht?`, [
      { body: 'Man', value: Gender.Male },
      { body: 'Vrouw', value: Gender.Female }
    ])

    this.send(`Ok, je bent een ${this.gender}`);

    this.setCheckpoint("askForGender")
    this.checkForLegalDrinkingAge()
  }

  async checkForLegalDrinkingAge() {
    let age = parseInt(await this.askOpenQuestion("Hoe oud ben je?"), 10)
    if(age < 18) {
      this.send("Helaas, le bent te jong om alcohol te kopen")
    } else {
      this.send("Hoera, je mag lekker zuipen!")
    }

    this.finish()
  }
}
