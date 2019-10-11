import Attachment from "./Attachments"
import Prompt from "./Prompts"

/**
 * A message sent by the bot.
 */
export interface BotMessage {
  id: string
  author: "bot"
  creationDate: Date
  body: string
  prompt?: Prompt,
  attachment?: Attachment
  _meta: {
    dialogueIdentifier: string | "_system"
    rewindData?: unknown
  }
}

/**
 * A message sent by the user.
 */
export interface UserMessage {
  id: string
  author: "user"
  creationDate: Date
  body: string
  value?: unknown
  isUndoAble: boolean
}

export type Message = BotMessage | UserMessage
