export interface BotMessage {
  author: "bot"
  body: string
  data?: any

  // Responses
  responseType?: "text" | "prefab" | "slider"
  prefabAnswers?: { body: string, value?: any }[]
}

export interface UserMessage {
  author: "user"
  value: any
}

export type Message = BotMessage | UserMessage

function isBotMessage(message: Message): message is BotMessage {
  return message.author === "bot"
}

function isUserMessage(message: Message): message is UserMessage {
  return message.author === "user"
}

abstract class ImperativeConversation {
  protected DEFAULT_TYPING_DURATION = 500

  isTyping: boolean = false
  messageLog: Message[] = []
  onIsTypingChanged: ((isTyping: boolean) => void) | undefined
  onMessageLogChanged: (() => void) | undefined
  onBotMessageAdded: ((message: BotMessage) => void) | undefined
  isFinished = false

  private activeResolver: ((value: any) => void) | undefined
  private sendQueue: Array<{ message: Message, resolver?: (value: any) => void, typingDuration?: number }> = []
  private sendTimeout: NodeJS.Timeout | undefined

  private sendNextMessageFromQueue() {
    if(this.sendTimeout !== undefined) {
      return
    }

    let pendingItem = this.sendQueue.shift();

    if(pendingItem) {
      this.messageLog.push(pendingItem.message)
      this.onMessageLogChanged && this.onMessageLogChanged()
      this.activeResolver = pendingItem.resolver
      if(isBotMessage(pendingItem.message)) {
        this.onBotMessageAdded && this.onBotMessageAdded(pendingItem.message)
      }
    }

    // Check if there are remaining messages in the queue, and schedule a check if needed
    if(this.sendQueue.length > 0 && !this.sendTimeout) {
      this.isTyping = true
      this.onIsTypingChanged && this.onIsTypingChanged(this.isTyping)
      const typingDuration = this.sendQueue[0].typingDuration || this.DEFAULT_TYPING_DURATION
      this.sendTimeout = setTimeout(() => this.sendNextMessageFromQueue(), typingDuration)
    } else {
      this.isTyping = false
      this.onIsTypingChanged && this.onIsTypingChanged(this.isTyping)
    }
  }

  private async queueMessage(message: Message) {
    if(this.isFinished) {
      throw "Cannot queue message when conversation is finished."
    }

    this.sendQueue.push({ message })
    this.sendNextMessageFromQueue()
  }

  private queueResolvableMessage<T>(message: Message): Promise<T> {
    if(this.isFinished) {
      throw "Cannot queue question when conversation is finished."
    }

    let resolver;
    let promise = new Promise<T>((resolve, _reject) => {
      resolver = resolve
    });

    this.sendQueue.push({ message, resolver })
    return promise
  }

  protected send(message: string) {
    this.queueMessage({ author: "bot", body: message })
  }

  protected async askOpenQuestion(question: string): Promise<string> {
    const botMessage: BotMessage = {
      author: "bot",
      body: question,
      responseType: "text"
    }

    return this.queueResolvableMessage<string>(botMessage)
  }

  protected async askClosedQuestion<T>(question: string, answers?: { body: string, value?: T }[]): Promise<T> {
    const botMessage: BotMessage = {
      author: "bot",
      body: question,
      responseType: "prefab",
      prefabAnswers: answers
    }

    return this.queueResolvableMessage<T>(botMessage)
  }

  protected setCheckpoint(id: string) {
    this.reachedCheckpoint(id)
  }

  protected finish() {
    this.isFinished = true
  }

  protected async shouldResume(checkpoint: string): Promise<boolean> {
    this.send("It seems we were in the middle of a conversation.")
    return this.askClosedQuestion("Do you want to pick up where we left?", [
      { body: 'Yep', value: true },
      { body: 'No thanks', value: false }
    ])
  }

  // Start the conversation
  start() {
    this.messageLog = []
    this.isFinished = false
  }

  async resume(checkpoint: string) {
    if(await this.shouldResume(checkpoint)) {
      this.resume(checkpoint)
    } else {
      this.start()
    }
  }

  answer(value: any) {
    this.queueMessage({ author: "user", value })
    if(this.activeResolver) {
      this.activeResolver(value)
    } else {
      this.handleFreeInput(value)
    }
  }

  protected abstract reachedCheckpoint(checkpoint: string): void
  protected abstract continueFromCheckpoint(checkpoint: string): void
  protected abstract handleFreeInput(value: void): any
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


enum Gender { Male, Female }

export default class OnboardingConversation extends ImperativeConversation {
  private username: string | undefined
  private gender: Gender | undefined

  protected handleFreeInput(value: any): any {
    this.send(`You just said: "${value}"`)
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
