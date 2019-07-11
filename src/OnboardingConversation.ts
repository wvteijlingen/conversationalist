import { Conversation, Message, BotMessage, isBotMessage } from "./interfaces";

export default class OnboardingConversation implements Conversation {
  messageLog: Message[] = []
  onMessageReceived: ((message: BotMessage) => void) | undefined

  private username: string | undefined
  private gender: string | undefined

  private allMessages: BotMessage[] = [
    // Basic message
    { id: '1', author: "bot", body: "Hi, ik ben Oki!", next: '2' },

    // Message with a text response
    { id: '2', author: "bot", body: "Wat is jouw naam?", responseType: "text", handler: (res) => { this.username = res; return }, next: '3' },

    { id: '3', author: "bot", body: () => `Hi ${this.username}, leuk dat je mee doet.`, next: '4' },

    // Message with a buttons response
    { id: '4', author: "bot", body: "Wat is je geslacht?", responseType: "prefab", handler: (res) => { this.gender = res; return }, prefabAnswers: [
      { body: "Man", value: "MALE" },
      { body: "Vrouw", value: "FEMALE" }
    ], next: "5" },

    { id: '5', author: "bot", body: () => `Ok, je bent een ${this.gender}`, next: '6' },


    // Message with a slider response and custom branching logic
    { id: '6', author: "bot", body: "Hoe oud ben je?", responseType: "slider", next: 'foo', handler: (res) => parseInt(res, 10) < 18 ? '7' : '8' },

    { id: '7', author: "bot", body: "Helaas, le bent te jong om alcohol te kopen.", next: "999" },
    { id: '8', author: "bot", body: "Hoera, je mag lekker zuipen!", next: "999" },

    // // Message with a buttons response that branches out
    // { id: '7', body: "Ben je klaar om te beginnen?", responseType: "prefab", prefabAnswers: [
    //   { body: "Nee", value: "N", next: '8' }
    //   { body: "Ja", value: "Y", next: '9' },
    // ]},
    //
    // { id: '8', body: "Ok, je bent nog niet klaar. Laat maar weten zodra je wil beginnen.", prefabAnswers: [
    //   { body: "Ik wil beginnen", value: "Y", next: '7' },
    // ]},
    //
    // { id: '9', body: "Mooi, laten we beginnen!" },

    { id: '999', author: "bot", body: "Dit was het, chiao!", next: '-1' }
  ]

  private get lastBotMessage(): BotMessage {
    const botMessages = this.messageLog.filter(isBotMessage)
    return botMessages[botMessages.length - 1]
  }

  get isFinished(): boolean {
    return this.lastBotMessage === this.allMessages[this.allMessages.length - 1]
  }

  private goToMessageWithID(id: string): any {
    const message = this.allMessages.find(e => e.id === id)

    if(message === undefined) {
      throw "Message not found"
    }

    this.onMessageReceived && this.onMessageReceived(flattenMessageBody(message, this));

    // Add the message to the log
    this.messageLog.push(message)

    // If no response is needed, advance to the next message automatically
    if(this.lastBotMessage.responseType === undefined) {
      setTimeout(() => this.goToNextMessage(), 800)
    }
  }

  private goToNextMessage(response?: string): any {
    const lastBotMessage = this.lastBotMessage
    let nextMessageID = lastBotMessage.next

    if(response && lastBotMessage.handler !== undefined) {
      nextMessageID = lastBotMessage.handler(response) || this.lastBotMessage.next
      // lastBotMessage.handler(response)
    }

    this.goToMessageWithID(nextMessageID)
  }

  start() {
    this.messageLog = []
    this.goToMessageWithID(this.allMessages[0].id)
  }

  answer(body: string, value?: string) {
    // Add the answer to the log
    this.messageLog.push({ body, value, author: "user" })
    this.goToNextMessage(value || body)
  }

  rewindToMessage(id: string): any {
    // TODO: Find the message to jump to, clear the message log back to that question
  }
}

function flattenMessageBody(message: BotMessage, thisObject: any): BotMessage {
  if(typeof message.body === "function") {
    return {...message, body: message.body.apply(thisObject) }
  } else {
    return message
  }
}
