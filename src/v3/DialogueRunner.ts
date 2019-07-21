import { Dialogue, StepFunction, StepResult } from "./Dialogue"

export interface DialogueRunnerSnapshot<State> {
  nextStepName?: string,
  state: State
}

export interface DialogueRunnerInterface<State> {
  identifier: string
  onStep?: (result: StepResult<State>, isFinished: boolean) => void
  snapshot: DialogueRunnerSnapshot<State>

  onReceiveResponse(response?: any): boolean
  start(): void
  jumpToStep(stepName: string): void
}

export default class DialogueRunner<State> implements DialogueRunnerInterface<State> {
  identifier!: string // TODO
  dialogue: Dialogue<State>
  onStep?: (result: StepResult<State>, isFinished: boolean) => void

  private state: State
  private nextStep?: StepFunction<State>

  // Creates a new dialog runner
  // @param dialogue The dialogue to run
  // @param initialSate The intial state to start the dialogue with
  // @param snapshot Optional dialogue snapshot for resuming the dialogue
  constructor(dialogue: Dialogue<State>, initialState?: State, snapshot?: DialogueRunnerSnapshot<State>) {
    this.dialogue = dialogue
    this.state = initialState || {} as State

    if(snapshot && snapshot.nextStepName) {
      this.nextStep = dialogue[snapshot.nextStepName]
    }
  }

  public onReceiveResponse(response?: any): boolean {
    if(this.nextStep) {
      this.runStep(this.nextStep, response, this.state)
      return true
    } else {
      return false
    }
  }

  public start() {
    this.runStep(this.dialogue.start, undefined, this.state)
  }

  public jumpToStep(stepName: string) {
    this.nextStep = this.dialogue[stepName]
    // TODO: Clear the message log
  }

  // private async runStepWithName(stepName: string, response: any | undefined, state: State) {
  //   this.runStep(this.dialogue[stepName], response, state)
  // }

  private async runStep(step: StepFunction<State>, response: any | undefined, state: State) {
    const stepResult: StepResult<State> = await step.call(this.dialogue, response, state)

    if(stepResult.nextStep) {
      this.nextStep = stepResult.nextStep
    } else {
      this.nextStep = undefined
    }

    this.onStep && this.onStep(stepResult, this.nextStep === undefined)

    if(this.nextStep && !stepResult.prompt) {
      this.runStep(this.nextStep, undefined, this.state)
    }
  }

  public get snapshot(): DialogueRunnerSnapshot<State> {
    return { state: this.state, nextStepName: this.nextStep && this.nextStep.name }
  }
}
