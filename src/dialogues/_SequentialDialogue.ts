// import Dialogue, { DialogueEvents, DialogueInput, DialogueOutput, DialogueSnapshot, RewindToken, DialogueOutputMessage } from "../Dialogue"
// import Prompt from "../Prompts"

// /**
//  * A step in a sequential dialogue. This will usually be called in response to receiving user input.
//  */
// export type Step<State> = (context: StepContext<State>) => Promise<StepOutput<State>>

// export interface StepContext<State = {}> {
//   /** The user input that triggered this step. */
//   input: DialogueInput

//   /** The prompt that was returned from the previous step. */
//   prompt?: Prompt

//   /** The current dialogue state. */
//   state: State
// }

// interface BaseOutput<State> {
//   state?: State
// }

// interface PassThroughOutput<State> extends BaseOutput<State> {
//   type: "goto"
//   nextStep: Step<State>
// }

// interface MessageOutput<State> extends BaseOutput<State> {
//   type: "message"
//   messages: DialogueOutputMessage | DialogueOutputMessage[]
//   nextStep: Step<State>
// }

// interface PromptOutput<State> extends BaseOutput<State> {
//   type: "prompt"
//   messages: DialogueOutputMessage | DialogueOutputMessage[]
//   prompt: Prompt
//   nextStep: Step<State>
// }

// interface FinishOutput<State> extends BaseOutput<State> {
//   type: "finish"
//   messages: DialogueOutputMessage | DialogueOutputMessage[]
//   with: unknown
// }

// interface TransitionToOutput<State> extends BaseOutput<State> {
//   type: "transition"
//   messages: DialogueOutputMessage | DialogueOutputMessage[]
//   to: Dialogue<unknown>
// }

// interface WaitForOutput<State> extends BaseOutput<State> {
//   type: "wait"
//   messages: DialogueOutputMessage | DialogueOutputMessage[]
//   for: Dialogue<unknown>
//   nextStep: Step<State>
// }

// export type StepOutput<S> = PassThroughOutput<S> | MessageOutput<S> | PromptOutput<S> | FinishOutput<S> | TransitionToOutput<S> | WaitForOutput<S>

// // export type StepOutput<State = {}> = {
// //   /** The new desired dialogue state. This can be omitted if you want to leave the state as is. */
// //   state?: State,

// //   /**
// //    * The step to be called when receiving the next user input.
// //    * If this step output does not contain a prompt, the next step will be called immediately.
// //    */
// //   nextStep?: Step<State>
// // } & Omit<DialogueOutput, "rewindToken">

// interface Snapshot<State> extends DialogueSnapshot<State> {
//   nextStepName?: string
//   activePrompt?: Prompt
// }

// /**
//  * A dialogue that runs by executing steps in sequence.
//  * Each step outputs a prompt to the user, and then passes the response input to the next step.
//  *
//  * Each step indicates the next step that follows it. You can use this functionality to implement
//  * simple branching, by specifying different followup-steps.
//  */
// export default abstract class SequentialDialogue<State = {}> implements Dialogue<State> {
//   abstract readonly name: string
//   protected enableSnapshots = true
//   protected steps: Record<"start" | string, Step<State>> = {
//     async start() {
//       throw new Error(`You must override the "steps" member field.`)
//     }
//   }

//   protected state: State
//   protected nextStep?: Step<State>
//   protected activePrompt?: Prompt
//   protected isProcessing = false

//   events: DialogueEvents = {}

//   constructor(params?: { state: State , snapshot?: never } | { state?: never, snapshot: Snapshot<State> }) {
//     if(params) {
//       if(params.state) {
//         this.state = { ...this.initialState?.(), ...params.state }
//       } else if(params.snapshot) {
//         this.state = params.snapshot.state
//         this.activePrompt = params.snapshot.activePrompt
//         if(params.snapshot.nextStepName) {
//           this.nextStep = this.getStepByNameOrThrow(params.snapshot.nextStepName)
//         }
//       } else {
//         throw new Error("Params must either include an initial state or a snapshot.")
//       }
//     } else if(this.initialState) {
//       this.state = this.initialState()
//     } else {
//       throw new Error("Params must either include an initial state or you must implement the intitialState method.")
//     }
//   }

//   initialState?(): State

//   get snapshot(): Snapshot<State> | undefined {
//     if(this.enableSnapshots) {
//       return undefined
//     }

//     return {
//       name: this.name,
//       state: this.state,
//       nextStepName: this.nextStep?.name,
//       activePrompt: this.activePrompt
//     }
//   }

//   onStart() {
//     this.runStep(this.steps.start)
//   }

//   rewind(rewindToken: RewindToken) {
//     this.nextStep = this.getStepByNameOrThrow(rewindToken)
//   }

//   onReceiveInput(input: DialogueInput) {
//     if(this.nextStep && !this.isProcessing) {
//       this.runStep(this.nextStep, input)
//     }
//   }

//   /**
//    * Runs the given step and emits an approprate output event.
//    * @param step The step to run.
//    * @param input The user input that triggered the step.
//    */
//   protected async runStep(step: Step<State>, input?: DialogueInput) {
//     this.isProcessing = true

//     this.events.outputStart?.()

//     const stepContext = this.buildStepContext(input)

//     let stepOutput
//     try {
//       stepOutput = await step.call(this.steps, stepContext)
//     } catch(error) {
//       if(error instanceof InvalidInputError) {
//         this.handleInvalidInputError(error, step, stepContext)
//       } else {
//         this.handleStepError(error)
//       }
//       return
//     } finally {
//       this.isProcessing = false
//     }

//     this.handleStepOutput(stepOutput)
//     this.isProcessing = false
//   }

//   private buildStepContext(input: DialogueInput): StepContext<State> {
//     return {
//       input,
//       state: this.state,
//       prompt: this.activePrompt
//     }
//   }

//   private handleInvalidInputError(error: InvalidInputError, step: Step<State>, context: StepContext<State>) {
//     if(context.prompt) {
//       this.handleStepOutput({
//         type: "prompt",
//         messages: error.message,
//         prompt: context.prompt,
//         nextStep: step
//       })
//     }
//   }

//   private handleStepOutput(stepOutput: StepOutput<State>) {
//     if(stepOutput.state !== undefined) {
//       this.state = stepOutput.state
//     }

//     if(stepOutput.type === "goto") {
//       this.nextStep = stepOutput.nextStep
//       this.runStep(this.nextStep)

//     } else if(stepOutput.type === "message") {
//       this.nextStep = stepOutput.nextStep
//       const dialogueOutput: DialogueOutput = { messages: stepOutput.messages }
//       this.events.output?.(dialogueOutput, this.nextStep === undefined)

//     } else if(stepOutput.type === "prompt") {
//       this.nextStep = stepOutput.nextStep
//       this.activePrompt = stepOutput.prompt
//       const dialogueOutput: DialogueOutput = { messages: stepOutput.messages, prompt: stepOutput.prompt }
//       this.events.output?.(dialogueOutput, this.nextStep === undefined)

//     } else if(stepOutput.type === "transition") {
//       const dialogueOutput: DialogueOutput = { transitionTo: stepOutput.to }
//       this.events.output?.(dialogueOutput, undefined)

//     } else if(stepOutput.type === "wait") {
//       const dialogueOutput: DialogueOutput = { waitFor: stepOutput.for }
//       this.events.output?.(dialogueOutput, undefined)

//     } else if(stepOutput.type === "finish") {
//       const dialogueOutput: DialogueOutput = { finishWith: stepOutput.with }
//       this.events.output?.(dialogueOutput, undefined)
//     }

//     // this.nextStep = stepOutput.nextStep
//     // this.activePrompt = stepOutput.prompt

//     // const dialogueOutput = this.buildDialogueOutput(stepOutput)
//     // this.events.output?.(dialogueOutput, this.nextStep === undefined)

//     // Go to the next step immediately if there is no prompt.
//     // if(this.nextStep && !stepOutput.prompt) {
//     //   this.runStep(this.nextStep)
//     // }
//   }

//   private handleStepError(error: Error) {
//     this.events.error?.(error)
//   }

//   // private buildDialogueOutput(stepOutput: StepOutput<State>): DialogueOutput  {
//   //   const dialogueOutput: DialogueOutput = { ...stepOutput }

//   //   if(stepOutput.prompt && stepOutput.prompt.isUndoAble !== false && stepOutput.nextStep) {
//   //     dialogueOutput.rewindToken = stepOutput.nextStep.name
//   //   }

//   //   return dialogueOutput
//   // }

//   private getStepByNameOrThrow(name: string): Step<State> {
//     const entry = Object.entries(this.steps).find(e => e[0] === name)

//     if(!entry) {
//       throw new Error(`The step "${name}" does not exist in dialogue "${this.name}.`)
//     }

//     return entry[1]
//   }
// }

// export class InvalidInputError extends Error {
//   constructor(message: string) {
//     super(message)
//     this.name = "InvalidInputError"
//   }
// }
