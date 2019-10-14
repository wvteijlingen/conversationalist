import Attachment from "./Attachments"
import Prompt from "./Prompts"
import { RewindToken } from "./Dialogue"

export const SYSTEM_DIALOGUE_IDENTIFIER = "_system"

/**
 * A message sent by the bot.
 */
export interface BotMessage {
  id: string
  author: "bot"
  creationDate: Date
  body?: string
  prompt?: Prompt
  attachment?: Attachment
  _meta: {
    dialogueIdentifier: string | typeof SYSTEM_DIALOGUE_IDENTIFIER
    rewindToken?: RewindToken
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
  attachment?: Attachment
  isUndoAble: boolean
}

export type Message = BotMessage | UserMessage
