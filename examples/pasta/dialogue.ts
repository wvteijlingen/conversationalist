import SequentialDialogue, { InvalidInputError, StepContext, StepOutput } from "../../src/dialogues/SequentialDialogue"

interface Order {
  pastaType?: string
  sauce?: string
}

interface State {
  orders: Order[]
  currentOrder: Order
}

export default class PastaOrderDialogue extends SequentialDialogue<State> {
  identifier = "pastaOrder"

  initialState() {
    return {
      orders: [],
      currentOrder: {}
    }
  }

  steps = {
    // The start method gets called automatically once the dialogue becomes active.
    // This is the entry point of your dialogue.
    async start(context: StepContext<State>): Promise<StepOutput<State>> {
      return {
        // The messages to send to the user.
        messages: "What kind of pasta would you like?",

        // Include a prompt that allows the user to pick from a predefined set of pastas.
        // The result of this prompt will be passed into the `handlePastaType` method, as indicated by the
        // `nextStep` field.
        prompt: {
          type: "picker",
          choices: [
            { body: "Spaghetti", value: "spaghetti" },
            { body: "Tagliatelle", value: "tagliatelle" },
            { body: "Fusilli", value: "fusilli" }
          ]
        },

        // We can update the dialogue state by including a merged state in the step return value.
        // Here we store a new pasta order in the state so we can populate it in subsequent steps.
        state: { ...context.state, currentOrder: {} },

        // Specify that `handlePastaType` is the next step that should be called with the result of the prompt.
        nextStep: this.handlePastaType
      }
    },

    async handlePastaType(context: StepContext<State>): Promise<StepOutput<State>> {
      const pastaType = context.input

      // We validate the user input to see if it is a valid string.
      // If not, throw an `InvalidInputError` which will automatically reprompt the user for input.
      if(typeof pastaType !== "string" || pastaType.trim().length === 0) {
        throw new InvalidInputError("🤔 It doesn't seem we have that kind of pasta. Please select a pasta from our menu.")
      }

      return {
        messages: "What sauce would you like with that?",
        prompt: {
          type: "picker", choices: [
            { body: "Bolognaise", value: "bolognaise" },
            { body: "Carbonara", value: "carbonara" },
            { body: "Marinara", value: "marinara" }
          ]
        },
        state: { ...context.state, currentOrder: { ...context.state.currentOrder, pastaType } },
        nextStep: this.handleSauce
      }
    },

    async handleSauce(context: StepContext<State>): Promise<StepOutput<State>> {
      const sauce = context.input

      if(typeof sauce !== "string" || sauce.trim().length === 0) {
        throw new InvalidInputError("Sorry, we don't have that sauce. Please select a sauce from our menu.")
      }

      return {
        messages: [
          `Got it! One ${context.state.currentOrder?.pastaType} ${sauce}.`,
          "Would you like to add another pasta to your order?"
        ],
        prompt: {
          type: "picker",
          choices: [
            { body: "Yes", value: true },
            { body: "No, I want to finish ordering", value: false },
          ]
        },
        state: { ...context.state, currentOrder: { ...context.state.currentOrder, sauce } },
        nextStep: this.handleAnotherOrder
      }
    },

    async handleAnotherOrder(context: StepContext<State>): Promise<StepOutput<State>> {
      // Add the current order to the state.
      const newState = {
        ...context.state,
        orders: [
          ...context.state.orders,
          context.state.currentOrder
        ]
      }

      // If the user wants to add another pasta, we go back to the start step.
      if(context.input === true) {
        return {
          state: newState,
          nextStep: this.start
        }
      }

      return {
        messages: [
          "Great, I just need your address so I know where to send your delicious pasta.",
        ],
        prompt: { type: "text" },
        state: newState,
        nextStep: this.finishOrder
      }
    },

    async finishOrder(context: StepContext<State>): Promise<StepOutput<State>> {
      const address = context.input

      if(typeof address !== "string" || address.trim().length === 0) {
        throw new InvalidInputError("Hmm, I cannot find that address. Please enter a valid address.")
      }

      // Initiate the pasta delivery in the back-end.
      // await DeliveryService.deliver({
      //   orders: context.state.orders
      //   address,
      // })

      let receipt = "Here is your receipt:\n"
      for(const order of context.state.orders) {
        receipt += `1x ${order.pastaType} ${order.sauce}\n`
      }

      receipt += "----------------------\n"
      receipt += "Total price: free 🎉"
      receipt += "\n"
      receipt += `Delivery to: ${address}`

      return {
        messages: [
          "Your pasta is on its way! Thank you for ordering with pasta-bot.",
          receipt
        ]
      }
    }
  }
}
