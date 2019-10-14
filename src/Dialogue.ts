import { BotMessage } from "./Message"
import Prompt from "./Prompts"
import Attachment from "./Attachments"

export interface DialogueEvents {
  /**
   * Callback that must be called before each dialogue step.
   */
  outputStart?: () => void

  /**
   * Callback that must be called after each dialogue step.
   * @param result The result of the dialogue step.
   * @param isFinished Whether the dialogue is finished and should be popped of the dialogue stack.
   */
  output?: (result: DialogueOutput, isFinished: boolean) => void

  /**
   * Callback that can be called when an error occurs in a dialogue step.
   * @param error The error that occured.
   */
  error?: (error: Error) => void
}

/**
 * A Dialogue contains conversational logic to interact with the user.
 * Each implementation of this interface can be added to a Bot.
 */
export default interface Dialogue<State = {}> {
  /** Unique identifier of the dialogue. This must be unique within all dialogues of a Bot. */
  readonly identifier: string

  /**
   * A snapshot that reflects the current state of the dialogue.
   * If this is `undefined`, the dialogue will not be included in the Bot snapshot.
   */
  snapshot: DialogueSnapshot<State> | undefined

  /** All event callbacks that can be called by this dialogue. */
  events: DialogueEvents

  /**
   * Called after the dialogue is pushed to the dialogue stack.
   * You can override this method to send an initial message for example.
   */
  onStart(): void

  /**
   * Called when the dialogue receives a response from the user.
   */
  onReceiveInput(input: DialogueInput, attachment?: Attachment): void

  /**
   * Called when the dialogue is interrupted.
   */
  onInterrupt?(): void

  /**
   * Called when the dialogue is resumed after an interruption.
   */
  onResume?(): void

  /**
   * Called when the dialogue is finished.
   */
  onFinish?(): void

  /**
   * Rewinds the dialogue using the given `rewindToken`.
   * Each dialogue can decide what this means.
   */
  rewind?(rewindToken: RewindToken): void
}

export type RewindToken = string

export interface DialogueSnapshot<State> {
  /** The identifier of the dialogue. */
  identifier: string

  /** The state of the dialogue at the time the snapshot was created. */
  state: State
}

type DialogueOutputMessage = Pick<BotMessage, "body" | "attachment"> | string

/**
 * Output sent by a dialogue, received by a user.
 */
export interface DialogueOutput {
  /** One or multiple messages. */
  messages?: DialogueOutputMessage | DialogueOutputMessage[]

  /** An optional prompt to indicate the response method available to the user. */
  prompt?: Prompt

  /** Opaque rewind data that will be included when the dialogue is rewound to this step. */
  rewindToken?: RewindToken

  /** An optional dialogue to transition to. */
  nextDialogue?: Dialogue<unknown>
}

/** Input received by a dialogue, sent by a user. */
export type DialogueInput = unknown | undefined
