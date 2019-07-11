import { Conversation, Message, BotMessage, isBotMessage } from "./interfaces";

export default class OnboardingConversation implements Conversation {
  messageLog: Message[] = []
  onMessageReceived: ((message: BotMessage) => void) | undefined

  private username: string | undefined
  // private gender: Gender | undefined

  private allMessages: BotMessage[] = [
    // Basic message
    { id: '1', author: "bot", body: "Hi, ik ben Oki!", next: '2' },

    // Message with a text response
    { id: '2', author: "bot", body: "Wat is jouw naam?", responseType: "text", handler: (res) => this.username = res, next: '3' },

    { id: '3', author: "bot", body: () => `Hi ${this.username}, leuk dat je mee doet.`, next: '4' },

    { id: '4', author: "bot", body: "End", next: '-1' },

    // Message with a buttons response
    // { id: '3', body: "Wat is je geslacht?", responseType: "prefab", handler: (res: Gender) => this.gender = res }, prefabAnswers: [
    //   { body: "Man", value: "MALE" },
    //   { body: "Vrouw", value: "FEMALE" }
    // ]},
    //
    // // Message with a slider response and custom branching logic
    // { id: '4', body: "Hoe oud ben je?", responseType: "slider", handler: (res) => return (res < 18) ? '5' : '6' }
    //
    // { id: '5', body: "Helaas, le bent te jong om alcohol te kopen." }
    // { id: '6', body: "Hoera, je mag lekker zuipen!" }
    //
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
  ]

  private get lastBotMessage(): BotMessage {
    let botMessages = this.messageLog.filter(isBotMessage)
    return botMessages[botMessages.length - 1]
  }

  get isFinished(): boolean {
    return this.lastBotMessage === this.allMessages[this.allMessages.length - 1]
  }

  private goToMessageWithID(id: string): any {
    let message = this.allMessages.find(e => e.id === id)

    if(message === undefined) {
      throw "Message not found"
    }

    this.onMessageReceived && this.onMessageReceived(message);

    // Add the message to the log
    this.messageLog.push(message)

    // If no response is needed, advance to the next message automatically
    if(this.lastBotMessage.responseType === undefined) {
      setTimeout(this.goToNextMessage, 500)
    }
  }

  private goToNextMessage(response: string | undefined): any {
    let lastBotMessage = this.lastBotMessage
    var nextMessageID = lastBotMessage.next

    if(response && lastBotMessage.handler !== undefined) {
      nextMessageID = lastBotMessage.handler(response) || this.lastBotMessage.next
    }

    this.goToMessageWithID(nextMessageID)
  }

  start() {
    this.allMessages = []
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
