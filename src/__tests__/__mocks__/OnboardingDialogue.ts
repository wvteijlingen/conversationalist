// import { ScriptedDialogue } from "../.."
// import { DialogueInput } from "../../Dialogue"
// import { ScriptStep, ScriptStepResult } from "../../ScriptedDialogueOld"

// interface State {
//   username?: string
// }

// export default class OnboardingDialogue extends ScriptedDialogue<State> {
//   identifier = "onboarding"

//   script = {
//     async start(data: DialogueInput, state: State): ScriptStepResult<State> {
//       return {
//         body: ["Welcome!", "What is your name?"],
//         prompt: { type: "text" },
//         nextStep: this.handleUsername
//       }
//     },

//     async handleUsername(response: DialogueInput, state: State): ScriptStepResult<State> {
//       if(!response || typeof response !== "string") {
//         return {
//           body: "Please enter your name.",
//           prompt: { type: "text" },
//           nextStep: this.handleUsername
//         }
//       }

//       state.username = response

//       return {
//         body: [`Hey ${state.username}.`, "Please upload a photo so I can see you"],
//         nextStep: this.handleUserPhoto
//       }
//     },

//     handleUsername2: switchResponseType({
//       isString: (response: string, state: State) {
//         state.username = response

//         return {
//           body: [`Hey ${state.username}.`, "Please upload a photo so I can see you"],
//           nextStep: this.script.handleUserPhoto
//         }
//       },

//       default(response: DialogueInput, state: State) {
//         return {
//           body: "Please enter your name.",
//           prompt: { type: "text" },
//           nextStep: this.handleUsername
//         }
//       }
//     }),

//     // handleUsername3: validateInput(isString, "Please enter your name.", (response: string, state: State): ScriptStepResult<State> => {
//     //   state.username = response

//     //   return {
//     //     body: [`Hey ${state.username}.`, "Please upload a photo so I can see you"],
//     //     nextStep: this.handleUserPhoto
//     //   }
//     // }),

//     handleUsername4:
//       respondTo(isString).with(context => {
//         state.username = response

//         return {
//           body: [`Hey ${state.username}.`, "Please upload a photo so I can see you"],
//           nextStep: this.handleUserPhoto
//         }
//       })
//       .respondTo(empty).with(context => {
//         return {
//           body: "Please enter your name.",
//           prompt: { type: "text" },
//           nextStep: this.handleUsername
//         }
//       }),

//     handleUsername5(context, responseBuilder) {
//       if(!isString(context.response)) {
//         return responseBuilder.invalidResponse("Please enter your name.")
//       }

//       return responseBuilder.prompt({
//         body: [`Hey ${state.username}.`, "Please upload a photo so I can see you"],
//         prompt: { type: "text" },
//         nextStep: this.handleUserPhoto,
//         state: { ...context.state, username: context.response }
//       })
//     },

//     async handleUserPhoto(response: DialogueInput, state: State): ScriptStepResult<State> {
//       return {
//         body: "All done!"
//       }
//     }
//   }
// }

// type Validator<ResponseType> = (response: DialogueInput) => ResponseType | undefined

// const isString: Validator = response => {
//   return typeof response !== "string"
// }

// function switchResponseType<S>(handlers: { Validator: }): ScriptStep<S> {
//   return (response: DialogueInput, state: S) => {
//     Object.entries(handlers)
//     if(typeof response !== "string") {
//       return handlers.string(response, state)
//     }
//     return handlers.default(response, state)
//   }
// }

// function validateInput<S, ResponseType>(
//   validator: Validator<ResponseType>,
//   errorMessage: string,
//   step: (response: ResponseType, state: S) => ScriptStepResult<S>
// ): ScriptStepResult<S> {
//   const retVal: ScriptStep<S> = (response: DialogueInput, state: S) => {
//     const validatedResponse = validator(response)
//     if(validatedResponse) {
//       return step(validatedResponse, state)
//     }
//     return Promise.resolve({
//       body: errorMessage,
//       nextStep: retVal
//     })
//   }

//   return retVal
// }
