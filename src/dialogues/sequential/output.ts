import { MessageDialogueOutput, PromptDialogueOutput, FinishDialogueOutput, TransitionDialogueOutput, WaitDialogueOutput } from "../../DialogueOutput"
import { Step } from "./dialogue"
import Dialogue from "../../Dialogue"

interface BaseOutput<S> {
  state?: S
}

export interface GotoOutput<S> extends BaseOutput<S> {
  action: "goto"
  nextStep: Step<S>
}

export type MessageOutput<S> = Omit<MessageDialogueOutput, "rewindToken"> & BaseOutput<S> & {
  nextStep: Step<S>
}

export type PromptOutput<S> = Omit<PromptDialogueOutput, "rewindToken"> & BaseOutput<S> & {
  nextStep: Step<S>
}

export type FinishOutput<S> = Omit<FinishDialogueOutput, "rewindToken"> & BaseOutput<S> & {
  value: unknown
}

export type TransitionOutput<S> = Omit<TransitionDialogueOutput, "rewindToken"> & BaseOutput<S> & {
  to: Dialogue<unknown>
}

export type WaitOutput<S> = Omit<WaitDialogueOutput, "rewindToken"> & BaseOutput<S> & {
  for: Dialogue<unknown>
  nextStep: Step<S>
}

export interface RepromptOutput {
  action: "reprompt"
  message: string
}

export type StepOutput<S> = GotoOutput<S> | MessageOutput<S> | PromptOutput<S> | FinishOutput<S> | TransitionOutput<S> | WaitOutput<S> | RepromptOutput
