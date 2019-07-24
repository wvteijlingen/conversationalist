import Dialogue, { StepFunction, StepResult, DialogueSnapshot, ContinuingStepResult, PromptStepResult } from "./Dialogue";

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

  public onReceiveResponse(response?: unknown): boolean {
    if(this.nextStep) {
      this.runStep(this.nextStep, response, this.state)
      return true
    } else {
      return false
    }
  }

  public start() {
    this.runStep(this.script.start, undefined, this.state)
  }

  public jumpToStep(stepName: string) {
    this.nextStep = this.script[stepName]
    // TODO: Clear the message log
  }

  private async runStep(step: StepFunction<State>, response: unknown | undefined, state: State) {
    const stepResult: StepResult<State> = await step.call(this.script, response, state)

    if(isContinuingStepResult(stepResult)) {
      this.nextStep = stepResult.nextStep
    } else {
      this.nextStep = undefined
    }

    this.onStep && this.onStep(stepResult, this.nextStep === undefined)

    if(this.nextStep && !isPromptingStepResult(stepResult)) {
      this.runStep(this.nextStep, undefined, this.state)
    }
  }

  public get snapshot(): DialogueSnapshot<State> {
    return {
      identifier: this.identifier,
      state: this.state,
      nextStepName: this.nextStep && this.nextStep.name
    }
  }
}

function isContinuingStepResult(result: StepResult<any>): result is ContinuingStepResult<any> {
  return (<any>result).nextStep !== "undefined"
}

function isPromptingStepResult(result: StepResult<any>): result is PromptStepResult<any> {
  return (<any>result).prompt !== "undefined"
}
