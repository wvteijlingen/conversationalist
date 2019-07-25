import Prompt from "./Prompts"

export default interface Dialogue<State> {
  onStep?: (result: StepResult<State>, isFinished: boolean) => void
  onFinish?: (result: State) => void
  snapshot: DialogueSnapshot<State>

  onReceiveResponse(response?: unknown): boolean
  start(): void
  jumpToStep(stepName: string): void
}

export type StepFunction<State> = (response: unknown | undefined, data: State) => StepResult<State>

export interface DialogueSnapshot<State> {
  identifier: string
  state: State
  nextStepName?: string
}

export interface StepResult<State> {
  body?: string | string[]
  prompt?: Prompt | undefined
  nextStep?: StepFunction<State>
  nextDialogueIdentifier?: string
}
