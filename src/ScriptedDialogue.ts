import { EventEmitter } from "events"
import Dialogue, { DialogueSnapshot, StepResult, UserResponse } from "./Dialogue"
import { Choice } from "./Prompts"

export interface Script<State = { }> {
  start: ScriptStep<State> & ThisType<this>
  [key: string]: ScriptStep<State> & ThisType<this>
}

export type ScriptStep<State> = (response: UserResponse, data: State) => Promise<ScriptStepResult<State>>

interface ScriptStepResult<State> extends Omit<StepResult, "rewindData"> {
  emitEvent?: [string, ...any[]]
  nextStep?: ScriptStep<State>
}

interface ScriptedDialogueSnapshot<State> extends DialogueSnapshot<State> {
  nextStepName?: string
}

export default class ScriptedDialogue<State = { }> extends EventEmitter implements Dialogue<State> {
  readonly identifier: string
  readonly script: Script<State>
  onStep?: (result: StepResult, isFinished: boolean) => void
  onError?: (error: Error) => void

  private state: State
  private nextStep?: ScriptStep<State>

  // @param dialogue The dialogue to run.
  // @param initialState The intial state to start the dialogue with.
  // @param snapshot Optional dialogue snapshot for resuming the dialogue.
  constructor(identifier: string, script: Script<State>, initialState?: State, snapshot?: ScriptedDialogueSnapshot<State>) {
    super()
    this.identifier = identifier
    this.script = script
    this.state = initialState || { } as State
    if (snapshot && snapshot.nextStepName) {
      this.nextStep = script[snapshot.nextStepName]
    }
  }

  get snapshot(): ScriptedDialogueSnapshot<State> {
    return {
      identifier: this.identifier,
      state: this.state,
      nextStepName: this.nextStep && this.nextStep.name
    }
  }

  onStart() {
    this.runStep(this.script.start, undefined, this.state)
  }

  rewind(rewindData: any) {
    this.nextStep = this.script[rewindData.nextStepName]
  }

  onReceiveResponse(response?: unknown) {
    if(this.nextStep) {
      this.runStep(this.nextStep, response, this.state)
    }
  }

  onInterrupt() {
    //
  }

  onResume() {
    //
  }

  onFinish() {
    this.emit("finish", this.state)
  }

  private async runStep(step: ScriptStep<State>, response: unknown | undefined, state: State) {
    let internalStepResult
    try {
      internalStepResult = await step.call(this.script, response, state)
    } catch(error) {
      this.onError && this.onError(error)
      return
    }

    const stepResult: StepResult = { ...internalStepResult }

    if(internalStepResult.nextStep) {
      this.nextStep = internalStepResult.nextStep
    } else {
      this.nextStep = undefined
    }

    if(internalStepResult.prompt && internalStepResult.nextStep) {
      stepResult.rewindData = { nextStepName: internalStepResult.nextStep.name }
    }

    if(internalStepResult.emitEvent) {
      const [event, ...args] = internalStepResult.emitEvent
      this.emit(event, ...args)
    }

    this.onStep && this.onStep(stepResult, this.nextStep === undefined)

    // Go to the next step immediately if there is a next step and no prompt
    if(this.nextStep && !internalStepResult.prompt) {
      this.runStep(this.nextStep, undefined, this.state)
    }
  }
}

export const StepResultBuilder = {
  next: <S>(nextStep?: ScriptStep<S>): ScriptStepResult<S> => {
    return {
      nextStep
    }
  },
  message: <S>(messages: string | string[], nextStep: ScriptStep<S>): ScriptStepResult<S> => {
    return {
      body: messages,
      nextStep
    }
  },
  textPrompt: <S>(messages: string | string[], nextStep: ScriptStep<S>): ScriptStepResult<S> => {
    return {
      body: messages,
      prompt: { type: "text" },
      nextStep
    }
  },
  sliderPrompt: <S>(messages: string | string[], nextStep: ScriptStep<S>): ScriptStepResult<S> => {
    return {
      body: messages,
      prompt: { type: "slider" },
      nextStep
    }
  },
  inlinePickerPrompt: <S>(messages: string | string[], nextStep: ScriptStep<S>, choices: Choice[]): ScriptStepResult<S> => {
    return {
      body: messages,
      prompt: { type: "inlinePicker", choices },
      nextStep
    }
  },
  pickerPrompt: <S>(messages: string | string[], nextStep: ScriptStep<S>, choices: Choice[]): ScriptStepResult<S> => {
    return {
      body: messages,
      prompt: { type: "picker", choices },
      nextStep
    }
  },
  nextStep: <S>(nextStep: ScriptStep<S>): ScriptStepResult<S> => {
    return {
      nextStep
    }
  },
  finish: <S>(messages: string | string[]): ScriptStepResult<S> => {
    return {
      body: messages
    }
  },
  dialogue: <S>(dialogueIdentifier: string): ScriptStepResult<S> => {
    return {
      nextDialogueIdentifier: dialogueIdentifier
    }
  }
}
