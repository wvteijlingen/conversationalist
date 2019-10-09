import Dialogue, { DialogueSnapshot, StepResult, UserResponse } from "./Dialogue"

/**
 * A script that can be executed by a ScriptedDialogue.
 * Its `start` function will be called as soon as the dialogue becomes active.
 */
export interface Script<State = {}> {
  start: ScriptStep<State> & ThisType<this>
  [key: string]: ScriptStep<State> & ThisType<this>
}

/**
 * A step in a dialogue script.
 * This will usually be called in response to receiving a user response.
 *
 * @param response The response that triggered this step.
 * @param state The current dialogue state. This can be directly mutated.
 */
export type ScriptStep<State> = (response: UserResponse, state: State) => Promise<ScriptStepResult<State>>

interface ScriptStepResult<State> extends Omit<StepResult, "rewindData"> {
  /**
   * The step to be called when receiving the next user response.
   * If this step result does not contain a prompt, the next step will be called immediately after the current step.
   */
  nextStep?: ScriptStep<State>
}

interface ScriptedDialogueSnapshot<State> extends DialogueSnapshot<State> {
  nextStepName?: string
}

/**
 * A dialogue that runs by executing a script. Each step in the script is called when a user response is received.
 */
export default class ScriptedDialogue<State = {}> implements Dialogue<State> {
  readonly identifier: string
  readonly script: Script<State>
  onStepStart?: () => void
  onStep?: (result: StepResult, isFinished: boolean) => void
  onError?: (error: Error) => void

  protected state: State
  protected nextStep?: ScriptStep<State>

  /**
   *
   * @param identifier The identifier of this dialogue.
   * @param script The script to run.
   * @param state The intial state to start the dialogue with.
   * @param snapshot Optional dialogue snapshot for resuming the dialogue.
   */
  constructor(identifier: string, script: Script<State>, state: State, snapshot?: ScriptedDialogueSnapshot<State>) {
    this.identifier = identifier
    this.script = script
    this.state = state

    if(snapshot) {
      this.nextStep = snapshot.nextStepName ? script[snapshot.nextStepName] : undefined
      this.state = snapshot.state
    }
  }

  get snapshot(): ScriptedDialogueSnapshot<State> | undefined {
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

  /**
   * Runs the given script step, and passes the step result back to the Bot.
   * @param step The script step to run.
   * @param response The user response that triggered the next step.
   * @param state The dialogue state to pass to the script step.
   */
  protected runStep(step: ScriptStep<State>, response: unknown | undefined, state: State) {
    this.onStepStart && this.onStepStart()

    step.call(this.script, response, state).then(internalStepResult => {
      const stepResult: StepResult = { ...internalStepResult }

      if(internalStepResult.nextStep) {
        this.nextStep = internalStepResult.nextStep
      } else {
        this.nextStep = undefined
      }

      if(internalStepResult.prompt && internalStepResult.prompt.isUndoAble !== false && internalStepResult.nextStep) {
        stepResult.rewindData = { nextStepName: internalStepResult.nextStep.name }
      }

      this.onStep && this.onStep(stepResult, this.nextStep === undefined)

      // Go to the next step immediately if there is a next step and no prompt
      if(this.nextStep && !internalStepResult.prompt) {
        this.runStep(this.nextStep, undefined, this.state)
      }
    }, error => {
      this.onError && this.onError(error)
      return
    })
  }
}
