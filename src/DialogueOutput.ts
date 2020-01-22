import { BotMessage } from "./Message"
import InputMode from "./input-mode"
import Dialogue from "./Dialogue"

export type DialogueOutputMessage = Pick<BotMessage, "body" | "attachment"> | string

interface BaseDialogueOutput {
  messages?: DialogueOutputMessage | DialogueOutputMessage[]
  inputMode?: InputMode
  rewindToken?: string
}

/**
 * Sends the given messages to the user.
 */
export interface MessageDialogueOutput extends BaseDialogueOutput {
  action: "message"
}

// /**
//  * Prompts the user using the indicated prompt.
//  */
// export interface PromptDialogueOutput extends BaseDialogueOutput {
//   action: "prompt"
//   prompt: Prompt
// }

/**
 * Finish the dialogue, with an optional return value.
 */
export interface FinishDialogueOutput extends BaseDialogueOutput {
  action: "finish"
  value?: unknown
}

/**
 * Finish the dialogue and transition to another dialogue.
 */
export interface TransitionDialogueOutput extends BaseDialogueOutput {
  action: "transition"
  to: Dialogue<unknown>
}

/**
 * Wait for another dialogue to return a value. This value will
 * be passed to the `onReceiveInput` handler.
 */
export interface WaitDialogueOutput extends BaseDialogueOutput {
  action: "wait"
  for: Dialogue<unknown>
}

export type DialogueOutput = MessageDialogueOutput | TransitionDialogueOutput | WaitDialogueOutput | FinishDialogueOutput
