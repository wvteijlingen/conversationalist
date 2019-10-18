import { DialogueInput } from "../../src"
import SequentialDialogue, { InvalidInputError, StepContext, StepOutput } from "../../src/dialogues/SequentialDialogue"
import { isNumber } from "../../src/Validator"

export function validatedInput<T>(validator: (input: DialogueInput) => input is T, input: DialogueInput, errorMessage: string): T | undefined {
  if(!validator(input)) {
    throw new InvalidInputError(errorMessage)
  }
  return input
}

export default class ExampleSequentialDialogue extends SequentialDialogue {
  identifier = "exampleDialogue"

  steps = {
    async start(): Promise<StepOutput> {
      return {
        messages: `Please enter a number`,
        prompt: { type: "text" },
        nextStep: this.handleInput
      }
    },

    async handleInput(context: StepContext): Promise<StepOutput> {
      const validNumber = validatedInput(isNumber, context.input, "That is not a valid number.")

      return {
        messages: `Indeed, ${validNumber} is a number`,
        nextStep: this.start
      }
    }
  }
}
