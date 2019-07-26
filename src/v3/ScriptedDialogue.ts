import Dialogue, { DialogueSnapshot, StepResult, UserResponse } from "./Dialogue"

interface ScriptStepResult<State> extends StepResult {
  nextStep?: StepFunction<State>
}
export type StepFunction<State> = (response: UserResponse, data: State) => ScriptStepResult<State>

export interface Script<State> {
  start: StepFunction<State>
  [key: string]: StepFunction<State> & ThisType<this>
}

export default class ScriptedDialogue<State> implements Dialogue<State> {
  identifier: string
  script: Script<State>
  onStep?: (result: StepResult, isFinished: boolean) => void
  onFinish?: (result: State) => void

  private state: State
  private previousStep?: { function: StepFunction<State>, response?: UserResponse }
  private nextStep?: StepFunction<State>

  // @param dialogue The dialogue to run.
  // @param initialState The intial state to start the dialogue with.
  // @param snapshot Optional dialogue snapshot for resuming the dialogue.
  constructor(identifier: string, script: Script<State>, initialState?: State, snapshot?: DialogueSnapshot<State>) {
    this.identifier = identifier
    this.script = script
    this.state = initialState || {} as State
    if (snapshot && snapshot.nextStepName) {
      this.nextStep = script[snapshot.nextStepName]
    }
  }

  start() {
    this.runStep(this.script.start, undefined, this.state)
  }

  jumpToStep(stepName: string) {
    this.nextStep = this.script[stepName]
  }

  onReceiveResponse(response?: unknown): boolean {
    if(this.nextStep) {
      this.runStep(this.nextStep, response, this.state)
      return true
    } else {
      return false
    }
  }

  onInterrupt(): void {
    //
  }

  onResume(): void {
    //
  }

  private async runStep(step: StepFunction<State>, response: unknown | undefined, state: State) {
    const stepResult: ScriptStepResult<State> = await step.call(this.script, response, state)

    if(stepResult.nextStep) {
      this.nextStep = stepResult.nextStep
    } else {
      this.nextStep = undefined
    }

    if(this.onStep) {
      this.onStep(stepResult, this.nextStep === undefined)
    }

    // Go to the next step immediately if there is a next step and no prompt
    if(this.nextStep && !stepResult.prompt) {
      this.runStep(this.nextStep, undefined, this.state)
    }
  }

  get snapshot(): DialogueSnapshot<State> {
    const previousStep = this.previousStep
    return {
      identifier: this.identifier,
      state: this.state,
      previousStep: previousStep ? { name: previousStep.function.name, response: previousStep.response } : undefined,
      nextStepName: this.nextStep && this.nextStep.name
    }
  }
}
