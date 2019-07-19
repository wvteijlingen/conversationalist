// A message send by the bot.
export interface BotMessage {
  author: "bot"

  id: string

  // The message
  body: string | (() => string)

  // The response types available to the user, or `undefined` if the user cannot respond
  responseType?: "text" | "prefab" | "slider"

  // Prefab answers in case `responseType` is `prefab`
  prefabAnswers?: { body: string, value?: string}[]

  // Optional responde handler.
  handler?: (response: string) => string | void

  // Optional id of the next message. Can be overridden by explitly returning an id in the `handler`.
  next: string
}

// An message sent by the user.
export interface UserMessage {
  author: "user"

  // The text that a user typed in response. This will be the button label in case of a prefab answer.
  body: string

  // The button value in case of a prefab answer.
  value?: string
}

export type Message = BotMessage | UserMessage

export interface Conversation {
  // All incoming and outgoing messages that were sent in the conversation
  messageLog: Message[]

  // Called when a new message has come in
  onMessageReceived: ((message: BotMessage) => void) | undefined

  // Starts the conversation from the top. This clears all messages if the conversation was already started.
  start(): void

  // Whether the conversation is finished
  isFinished: boolean

  // Respond to the last message
  answer(body: string, value?: string): void

  // Rewinds the conversation to a previous message
  rewindToMessage(id: string): void
}

// type Gender = "MALE" | "FEMALE"

export function isBotMessage(message: Message): message is BotMessage {
  return message.author === "bot"
}

export function isUserMessage(message: Message): message is UserMessage {
  return message.author === "user"
}
