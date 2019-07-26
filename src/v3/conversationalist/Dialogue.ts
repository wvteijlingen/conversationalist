import Prompt from "./Prompts"

export default interface Dialogue<State> {
  identifier: string

  onStep?: (result: StepResult, isFinished: boolean) => void
  onFinish?: (result: State) => void
  snapshot: DialogueSnapshot<State>

  start(): void
  // jumpToStep(stepName: string): void
  rewind(rewindData: any): void

  // Called when the dialogue receives a response from the user.
  onReceiveResponse(response: UserResponse): boolean

  // Called when the dialogue is interrupted.
  onInterrupt(): void

  // Called when the dialogue is resumed after an interruption.
  onResume(): void
}

export interface DialogueSnapshot<State> {
  identifier: string
  state: State
  previousStep?: { name: string, response?: UserResponse }
  nextStepName?: string
}

export interface StepResult {
  body?: string | string[]
  prompt?: Prompt | undefined,
  rewindData?: any,
  nextDialogueIdentifier?: string
}

export type UserResponse = unknown | undefined
