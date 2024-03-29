import SequentialDialogue, { InvalidInputError, StepContext, StepOutput } from "../../src/dialogues/SequentialDialogue"

interface State {
  username?: string
}

enum Color { Blue, Yellow }

export default class ExampleSequentialDialogue extends SequentialDialogue<State> {
  identifier = "exampleDialogue"

  steps = {
    async start(): Promise<StepOutput<State>> {
      return {
        messages: [`Hi there!`, "Welcome to this simple scripted dialogue.", "What is your name?"],
        prompt: { type: "text" },
        nextStep: this.handleUsername
      }
    },

    async handleUsername(context: StepContext<State>): Promise<StepOutput<State>> {
      if(typeof context.input !== "string" || context.input.trim().length === 0) {
        throw new InvalidInputError("Oh, that doesn't seem to be a valid name. Please enter your name")
      }

      return {
        messages: [`Nice to meet you ${context.input}.`, "Do you prefer blue or yellow?"],
        prompt: {
          type: "picker", choices: [
            { body: "Blue", value: Color.Blue },
            { body: "Yellow", value: Color.Yellow }
          ]
        },
        state: { ...context.state, username: context.input },
        nextStep: this.handleFavoriteColor
      }
    },

    async handleFavoriteColor(context: StepContext<State>): Promise<StepOutput<State>> {
      if(context.input === Color.Blue) {
        return {
          messages: "Great, blue is also my favorite color!"
        }
      } else {
        return {
          messages: "Yellow can be very pretty indeed."
        }
      }
    }
  }
}
