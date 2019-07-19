import { Dialogue, StepFunction, StepResult } from "./Dialogue";

export interface DialogueRunnerSnapshot<State> {
  nextStepName?: string,
  state: State
}

export default class DialogueRunner<State>{
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

  public jumpToStep(stepName: string) {
    this.nextStep = this.dialogue[stepName]
    // TODO: Clear the message log
  }

  public start() {
    this.runStep(this.dialogue.start, undefined, this.state)
  }

  // private async runStepWithName(stepName: string, response: any | undefined, state: State) {
  //   this.runStep(this.dialogue[stepName], response, state)
  // }

  private async runStep(step: StepFunction<State>, response: any | undefined, state: State) {
    const stepResult = await step(response, state)

    if(stepResult.nextStep) {
      this.nextStep = stepResult.nextStep
    } else {
      console.log("The dialogue is finished.")
    }

    this.onStep && this.onStep(stepResult, this.nextStep !== undefined)
  }

  public get snapshot(): DialogueRunnerSnapshot<State> {
    return { state: this.state, nextStepName: this.nextStep && this.nextStep.name }
  }
}
