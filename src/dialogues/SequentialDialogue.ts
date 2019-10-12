import Dialogue, { DialogueEvents, DialogueInput, DialogueOutput, DialogueSnapshot } from "../Dialogue"
import Prompt from "../Prompts"

/**
 * A step in a sequential dialogue. This will usually be called in response to receiving user input.
 */
export type Step<State> = (context: StepContext<State>) => Promise<StepOutput<State>>

export interface StepContext<State = {}> {
  /** The user input that triggered this step. */
  input: DialogueInput

  /** The prompt that was returned from the previous step. */
  prompt?: Prompt

  /** The current dialogue state. */
  state: State
}

export type StepOutput<State = {}> = {
  /** The new desired dialogue state. This can be omitted if you want to leave the state as is. */
  state?: State,

  /**
   * The step to be called when receiving the next user input.
   * If this step output does not contain a prompt, the next step will be called immediately.
   */
  nextStep?: Step<State>
} & Omit<DialogueOutput, "rewindData">

interface Snapshot<State> extends DialogueSnapshot<State> {
  nextStepName?: string
}

/**
 * A dialogue that runs by executing steps in sequence.
 * Each step outputs a prompt to the user, and then passes the response input to the next step.
 */
export default abstract class SequentialDialogue<State = {}> implements Dialogue<State> {
  abstract readonly identifier: string
  protected enableSnapshots = true
  protected steps: Record<"start" | string, Step<State>> = {
    async start() {
      throw new Error(`You must override the "steps" member field.`)
    }
  }

  protected state: State
  protected nextStep?: Step<State>
  events: DialogueEvents = {}

  constructor(params: { state: State, snapshot?: never } | { state?: never, snapshot: Snapshot<State> }) {
    if(params.state) {
      this.state = params.state
    } else if(params.snapshot) {
      this.state = params.snapshot.state
      if(params.snapshot.nextStepName) {
        this.nextStep = this.getStepByNameOrThrow(params.snapshot.nextStepName)
      }
    } else {
      throw new Error("Params must either include an initial state or a snapshot.")
    }
  }

  get snapshot(): Snapshot<State> | undefined {
    if(this.enableSnapshots) {
      return undefined
    }

    return {
      identifier: this.identifier,
      state: this.state,
      nextStepName: this.nextStep?.name
    }
  }

  onStart() {
    this.runStep(this.steps.start)
  }

  rewind(rewindData: any) {
    if(typeof rewindData.nextStepName !== "string") {
      throw new Error("The provided rewindData is invalid.")
    }

    this.nextStep = this.getStepByNameOrThrow(rewindData.nextStepName)
  }

  onReceiveInput(input: DialogueInput) {
    if(this.nextStep) {
      this.runStep(this.nextStep, input)
    }
  }

  /**
   * Runs the given step and emits an approprate output event.
   * @param step The step to run.
   * @param input The user input that triggered the step.
   */
  protected async runStep(step: Step<State>, input?: DialogueInput) {
    this.events.outputStart?.()

    const stepContext = this.buildStepContext(input)

    let stepOutput
    try {
      stepOutput = await step.call(this.steps, stepContext)
    } catch(error) {
      if(error instanceof InvalidInputError) {
        this.handleInvalidInputError(error, step, stepContext)
      } else {
        this.handleStepError(error)
      }
      return
    }

    this.handleStepOutput(stepOutput)
  }

  private buildStepContext(input: DialogueInput): StepContext<State> {
    return { input, state: this.state }
  }

  private handleInvalidInputError(error: InvalidInputError, step: Step<State>, context: StepContext<State>) {
    this.handleStepOutput({
      body: error.message,
      prompt: context.prompt,
      nextStep: step
    })
  }

  private handleStepOutput(stepOutput: StepOutput<State>) {
    if(stepOutput.state !== undefined) {
      this.state = stepOutput.state
    }

    if(stepOutput.nextStep) {
      this.nextStep = stepOutput.nextStep
    } else {
      this.nextStep = undefined
    }

    const dialogueOutput = this.buildDialogueOutput(stepOutput)
    this.events.output?.(dialogueOutput, this.nextStep === undefined)

    // Go to the next step immediately if there is no prompt.
    if(this.nextStep && !stepOutput.prompt) {
      this.runStep(this.nextStep)
    }
  }

  private handleStepError(error: Error) {
    this.events.error?.(error)
  }

  private buildDialogueOutput(stepOutput: StepOutput<State>): DialogueOutput  {
    const dialogueOutput: DialogueOutput = { ...stepOutput }

    if(stepOutput.prompt && stepOutput.prompt.isUndoAble !== false && stepOutput.nextStep) {
      dialogueOutput.rewindData = { nextStepName: stepOutput.nextStep.name }
    }

    return dialogueOutput
  }

  private getStepByNameOrThrow(name: string): Step<State> {
    const entry = Object.entries(this.steps).find(e => e[0] === name)

    if(!entry) {
      throw new Error(`The step "${name}" does not exist in dialogue "${this.identifier}.`)
    }

    return entry[1]
  }
}

export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "InvalidInputError"
  }
}
