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

export interface ContinuingStepResult<State> {
  nextStep: StepFunction<State>
}

// Send a message
export interface MessageStepResult<State> extends ContinuingStepResult<State> {
  body: string | string[]
}

// Send a message with a prompt
export interface PromptStepResult<State> extends ContinuingStepResult<State> {
  body: string | string[]
  prompt: Prompt | undefined
  nextStep: StepFunction<State>
}

// Transition to the next step silently
interface SilentStepResult<State> extends ContinuingStepResult<State> {
  nextStep: StepFunction<State>
}

// Finish the dialogue with a message
interface FinishStepResult {
  body: string | string[]
}

// Finish the dialogue by transtioning to another dialogue
interface TransitionStepResult {
  nextDialogueIdentifier: string
}

export type StepResult<State> = MessageStepResult<State> | FinishStepResult | SilentStepResult<State> | TransitionStepResult

// export const StepResult = {
//   message: <State>(messages: string | string[], nextStep: StepFunction<State>): StepResult<State> => {
//     return {
//       body: messages,
//       nextStep
//     }
//   },
//   prompt: <State>(messages: string | string[], prompt: Prompt, nextStep: StepFunction<State>): StepResult<State> => {
//     return {
//       body: messages,
//       prompt,
//       nextStep
//     }
//   },
//   nextStep: <State>(nextStep: StepFunction<State>): SilentStepResult<State> => {
//     return {
//       nextStep
//     }
//   },
//   finish: <State>(messages: string | string[]): FinishStepResult<State> => {
//     return {
//       body: messages
//     }
//   },
//   startDialogue: <State>(dialogue: Dialogue<State>): TransitionStepResult<State> => {
//     return {
//       dialogue
//     }
//   }
// }
