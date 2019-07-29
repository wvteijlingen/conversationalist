import Prompt from "./Prompts"

// Each class that implements this interface can be added to a Bot.
export default interface Dialogue<State> {
  // Unique identifier of the dialogue. This must be unique within all dialogues of a Bot.
  identifier: string

  // A snapshot that reflects the current state of the dialogue.
  snapshot: DialogueSnapshot<State>

  // Callback that must be called after each dialogue step.
  // @param result The result of the dialogue step.
  // @param isFinished Whether the dialogue is finished and should be popped of the dialogue stack.
  onStep?: (result: StepResult, isFinished: boolean) => void

  // Called after the dialogue is pushed to the dialogue stack.
  // You can override this method to send an initial message for example.
  onStart(): void

  // Called when the dialogue receives a response from the user.
  onReceiveResponse(response: UserResponse): void

  // Called when the dialogue is interrupted.
  // This usually happens when it resigns as active dialogue.
  onInterrupt(): void

  // Called when the dialogue is resumed after an interruption.
  // This usually happens when it becomes the active dialogue.
  onResume(): void

  // Called when the dialogue is finished.
  onFinish(): void

  // Rewinds the dialogue using the given `rewindData`.
  // Each dialogue can decide what this means.
  rewind(rewindData: any): void
}

export interface DialogueSnapshot<State> {
  // The identifier of the dialogue.
  identifier: string

  // The state of the dialogue at the time the snapshot was created.
  state: State
}

export interface StepResult {
  // One or multiple messages that are sent from the bot.
  body?: string | string[]

  // An optional prompt to indicate the responses available to the user.
  prompt?: Prompt | undefined,

  // Opaque rewind data that will be included when the dialogue is rewound to this step.
  rewindData?: any,

  // Optional identifier of a dialogue to transition to.
  nextDialogueIdentifier?: string
}

// A response from the user.
export type UserResponse = unknown | undefined
