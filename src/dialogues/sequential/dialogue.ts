import Dialogue, { DialogueEvents, DialogueInput, DialogueSnapshot } from "../../Dialogue"
import InputMode from "../../input-mode"
import { StepOutput } from "./output"

/**
 * A dialogue that runs by executing steps in sequence.
 * Each step outputs a prompt to the user, and then passes the response input to the next step.
 *
 * Each step indicates the next step that follows it. You can use this functionality to implement
 * simple branching, by specifying different followup-steps.
 */
export default abstract class SequentialDialogue<State = {}> implements Dialogue<State> {
  abstract readonly name: string
  protected enableSnapshots = true
  protected steps: Record<"start" | string, Step<State>> = {
    async start() {
      throw new Error(`You must override the "steps" member field.`)
    }
  }

  protected state: State
  protected nextStep?: Step<State>
  protected activePrompt?: InputMode
  protected isProcessing = false

  events: DialogueEvents = {}

  constructor(params?: { state: State, snapshot?: never } | { state?: never, snapshot: Snapshot<State> }) {
    if(params) {
      if(params.state) {
        this.state = { ...this.initialState?.(), ...params.state }
      } else if(params.snapshot) {
        this.state = params.snapshot.state
        this.activePrompt = params.snapshot.activePrompt
        if(params.snapshot.nextStepName) {
          this.nextStep = this.getStepByNameOrThrow(params.snapshot.nextStepName)
        }
      } else {
        throw new Error("Params must either include an initial state or a snapshot.")
      }
    } else if(this.initialState) {
      this.state = this.initialState()
    } else {
      throw new Error("Params must either include an initial state or you must implement the intitialState method.")
    }
  }

  initialState?(): State

  get snapshot(): Snapshot<State> | undefined {
    if(this.enableSnapshots) {
      return undefined
    }

    return {
      name: this.name,
      state: this.state,
      nextStepName: this.nextStep?.name,
      activePrompt: this.activePrompt
    }
  }

  onStart() {
    this.runStep(this.steps.start)
  }

  rewind(rewindToken: string) {
    this.nextStep = this.getStepByNameOrThrow(rewindToken)
  }

  onReceiveInput(input: DialogueInput) {
    if(this.nextStep && !this.isProcessing) {
      this.runStep(this.nextStep, input)
    }
  }

  /**
   * Runs the given step and emits an approprate output event.
   * @param step The step to run.
   * @param input The user input that triggered the step.
   */
  protected async runStep(step: Step<State>, input?: DialogueInput) {
    this.isProcessing = true

    this.events.outputStart?.()

    const stepContext = this.buildStepContext(input)

    let stepOutput
    try {
      stepOutput = await step.call(this.steps, stepContext)
    } catch(error) {
      // if(error instanceof InvalidInputError) {
        // this.handleInvalidInputError(error, step, stepContext)
      // } else {
      this.handleStepError(error)
      // }
      return
    } finally {
      this.isProcessing = false
    }

    this.handleStepOutput(stepOutput)
    this.isProcessing = false
  }

  private buildStepContext(input: DialogueInput): StepContext<State> {
    return {
      input,
      state: this.state,
      prompt: this.activePrompt
    }
  }

  private handleInvalidInputError(error: InvalidInputError, step: Step<State>, context: StepContext<State>) {
    if(context.prompt) {
      this.handleStepOutput({
        action: "prompt",
        messages: error.message,
        prompt: context.prompt,
        nextStep: step
      })
    }
  }

  private handleStepOutput(stepOutput: StepOutput<State>) {
    if(stepOutput.state !== undefined) {
      this.state = stepOutput.state
    }

    if(stepOutput.action === "reprompt") {

    } else if(stepOutput.action === "goto") {
      this.nextStep = stepOutput.nextStep
      this.runStep(this.nextStep)

    } else if(stepOutput.action === "message") {
      this.nextStep = stepOutput.nextStep
      this.events.output?.({ action: "message", messages: stepOutput.messages })

    } else if(stepOutput.action === "prompt") {
      this.nextStep = stepOutput.nextStep
      this.activePrompt = stepOutput.prompt
      this.events.output?.({ action: "prompt", messages: stepOutput.messages, prompt: stepOutput.prompt })

    } else if(stepOutput.action === "transition") {
      this.events.output?.({ action: "transition", to: stepOutput.to })

    } else if(stepOutput.action === "wait") {
      this.events.output?.({ action: "wait", for: stepOutput.for })

    } else if(stepOutput.action === "finish") {
      this.events.output?.({ action: "finish", value: stepOutput.value })
    }
  }

  private handleStepError(error: Error) {
    this.events.error?.(error)
  }

  private getStepByNameOrThrow(name: string): Step<State> {
    const entry = Object.entries(this.steps).find(e => e[0] === name)

    if(!entry) {
      throw new Error(`The step "${name}" does not exist in dialogue "${this.name}.`)
    }

    return entry[1]
  }
}

// export class InvalidInputError extends Error {
//   constructor(message: string) {
//     super(message)
//     this.name = "InvalidInputError"
//   }
// }

/**
 * A step in a sequential dialogue. This will usually be called in response to receiving user input.
 */
export type Step<State> = (context: StepContext<State>) => Promise<StepOutput<State>>

export interface StepContext<State = {}> {
  /** The user input that triggered this step. */
  input: DialogueInput

  /** The prompt that was returned from the previous step. */
  prompt?: InputMode

  /** The current dialogue state. */
  state: State
}

interface Snapshot<State> extends DialogueSnapshot<State> {
  nextStepName?: string
  activePrompt?: InputMode
}
