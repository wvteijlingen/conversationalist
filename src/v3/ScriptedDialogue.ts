import Dialogue, { DialogueSnapshot, StepFunction, StepResult } from "./Dialogue"

export interface DialogueScript<State> {
  start: StepFunction<State>
  [key: string]: StepFunction<State> & ThisType<this>
}

export default class ScriptedDialogue<State> implements Dialogue<State> {
  identifier: string
  script: DialogueScript<State>
  onStep?: (result: StepResult<State>, isFinished: boolean) => void
  onFinish?: (result: State) => void

  private state: State
  private nextStep?: StepFunction<State>

  // Creates a new dialog runner
  // @param dialogue The dialogue to run
  // @param initialSate The intial state to start the dialogue with
  // @param snapshot Optional dialogue snapshot for resuming the dialogue
  constructor(identifier: string, script: DialogueScript<State>, initialState?: State, snapshot?: DialogueSnapshot<State>) {
    this.identifier = identifier
    this.script = script
    this.state = initialState || {} as State

    if(snapshot && snapshot.nextStepName) {
      this.nextStep = script[snapshot.nextStepName]
    }
  }

  onReceiveResponse(response?: unknown): boolean {
    if(this.nextStep) {
      this.runStep(this.nextStep, response, this.state)
      return true
    } else {
      return false
    }
  }

  start() {
    this.runStep(this.script.start, undefined, this.state)
  }

  jumpToStep(stepName: string) {
    this.nextStep = this.script[stepName]
    // TODO: Clear the message log
  }

  private async runStep(step: StepFunction<State>, response: unknown | undefined, state: State) {
    const stepResult: StepResult<State> = await step.call(this.script, response, state)

    if (stepResult.nextStep) {
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
    return {
      identifier: this.identifier,
      state: this.state,
      nextStepName: this.nextStep && this.nextStep.name
    }
  }
}
