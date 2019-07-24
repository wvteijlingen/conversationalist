import { EventEmitter } from "events"
import Dialogue, { StepResult, DialogueSnapshot } from "./Dialogue"
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

interface BotSnapshot {
  messageLog: Message[]
  dialogues: DialogueSnapshot<unknown>[]
}

export interface Middleware {
  (body: string, value: unknown | undefined, bot: Bot): boolean
}

export class Bot extends EventEmitter {
  messageLog: Message[] = []
  private dialogues: Dialogue<any>[] = []
  private middlewares: Middleware[] = []

  constructor(dialogue: Dialogue<any> | Dialogue<any>[]) {
    super()
    const dialogues = Array.isArray(dialogue) ? dialogue : [dialogue]
    if(dialogues.length === 0) {
      throw "A bot must be constructed with at least 1 dialog dialogue"
    }
    for(const dialogue of dialogues) {
      this.pushDialogue(dialogue, false)
    }
  }

  static fromSnapshot(snapshot: BotSnapshot, hydrator: <S>(snapshot: DialogueSnapshot<S>) => Dialogue<S>) {
    const dialogues = snapshot.dialogues.map(e => hydrator(e))
    const bot = new Bot(dialogues)
    bot.messageLog = snapshot.messageLog
    return bot
  }

  get snapshot(): BotSnapshot {
    return {
      messageLog: this.messageLog,
      dialogues: this.dialogues.map(e => e.snapshot)
    }
  }

  start() {
    this.dialogues[0].start()
  }

  respond(body: string, value?: unknown) {
    for(const middleware of this.middlewares) {
      const shouldContinue = middleware(body, value, this)
      if(!shouldContinue) {
        return
      }
    }

    const message: UserMessage = {
      id: uuidv4(),
      author: "user",
      creationDate: new Date(),
      body: body,
      value: value
    }

    this.messageLog.push(message)
    this.emit("messagesAdded", [message])

    for(let i = this.dialogues.length - 1; i >= 0; i--) {
      const dialogue = this.dialogues[i]
      if(dialogue.onReceiveResponse(value !== undefined ? value : body)) {
        break
      }
    }
  }

  pushDialogue<State>(dialogue: Dialogue<State>, start: boolean = true) {
    // console.log("Pushing dialogue dialogue", dialogue.identifier)

    this.dialogues.push(dialogue)

    dialogue.onStep = (result, isFinished) => {
      const messages = this.messagesFromStepResult(result)
      this.addBotMessages(messages)
      if(isFinished) {
        this.removeDialogue(dialogue)
      }
    }

    if(start) {
      dialogue.start()
    }
  }

  use(middleware: Middleware) {
    this.middlewares.push(middleware)
  }

  interjectMessages(messages: string[]) {
    const botMessages = messages.map(message => ({
      id: uuidv4(),
      author: "bot",
      creationDate: new Date(),
      body: message
    }) as BotMessage)

    this.addBotMessages(botMessages)
  }

  private addBotMessages(messages: BotMessage[]) {
    this.messageLog = [...this.messageLog, ...messages]
    this.emit("messagesAdded", messages)
  }

  private removeDialogue<State>(dialogue: Dialogue<State>) {
    // console.log("Removing dialogue dialogue", dialogue.identifier)

    if(this.dialogues.length <= 1) {
      throw "Cannot remove root dialogue"
    }

    dialogue.onStep = undefined
    this.dialogues = this.dialogues.filter(e => e !== dialogue)

    const currentRunner = this.dialogues[this.dialogues.length - 1]
    currentRunner.onReceiveResponse(undefined)
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
}


function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
