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

function isContinuingStepResult(result: StepResult<any>): result is ContinuingStepResult<any> {
  return (result as any).nextStep !== undefined
}

function isPromptingStepResult(result: StepResult<any>): result is PromptStepResult<any> {
  return (result as any).prompt !== undefined
}

function isTransitionStepResult(result: StepResult<any>): result is PromptStepResult<any> {
  return (result as any).nextDialogueIdentifier !== undefined
}

function isMessagingStepResult(result: StepResult<any>): result is PromptStepResult<any> {
  return (result as any).body !== undefined
}

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
