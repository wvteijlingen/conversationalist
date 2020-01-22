import Attachment from "./Attachments"
import { DialogueOutput } from "./DialogueOutput"

export interface DialogueEvents {
  /**
   * Callback that must be called before each dialogue step.
   */
  outputStart?: () => void

  /**
   * Callback that must be called after each dialogue step.
   * @param result The result of the dialogue step.
   * @param finishValue
   */
  output?: (output: DialogueOutput) => void

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
  /** Do not set this yourself. This will automatically be populated when added to a bot. */
  id?: string

  /** Unique name of the dialogue. This must be unique within all dialogues of a Bot. */
  readonly name: string

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
  onResume?(input?: unknown): void

  /**
   * Rewinds the dialogue using the given `rewindToken`.
   * Each dialogue can decide what this means.
   */
  rewind?(rewindToken: string): void
}

/** Input received by a dialogue, sent by a user. */
export type DialogueInput = unknown | undefined

export interface DialogueSnapshot<State> {
  /** The name of the dialogue. */
  name: string

  /** The state of the dialogue at the time the snapshot was created. */
  state: State
}
