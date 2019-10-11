import { AsyncStepOutput, DialogueInput, InvalidInputError, ScriptedDialogue, StepContext } from "../../src"
import { isNumber } from "../../src/Validator"

export function validatedInput<T>(validator: (input: DialogueInput) => input is T, input: DialogueInput, errorMessage: string): T | undefined {
  if(!validator(input)) {
    throw new InvalidInputError(errorMessage)
  }
  return input
}

export default class ExampleScriptedDialogue extends ScriptedDialogue {
  identifier = "exampleDialogue"

  script = {
    async start(): AsyncStepOutput {
      return {
        body: [`Please enter a number`],
        prompt: { type: "text" },
        nextStep: this.handleInput
      }
    },

    async handleInput(context: StepContext): AsyncStepOutput {
      const validNumber = validatedInput(isNumber, context.input, "That is not a valid number.")

      return {
        body: `Indeed, ${validNumber} is a number`,
        nextStep: this.start
      }
    }
  }
}
