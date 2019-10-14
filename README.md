# Conversationalist

Conversationalist is a TypeScript framework that allows you to easily create simple or advanced chat bots using reusable dialogues.

## Notable features

- Interface based approach allows great flexibility.
- Built in dialogue classes to cover most common conversation patterns.
- Fully UI and platform agnostic. You can run this locally on a device, your own server, or in "the cloud".
- No dependencies!

## Table of contents

* [Terminology](#terminology)
* [Building blocks of a conversation](#building-blocks-of-a-conversation)
* [Example: Pasta-bot](#example--pasta-bot)
* [Dialogue state](#dialogue-state)
* [Advanced](#advanced)
  + [Simulating human behaviour](#simulating-human-behaviour)
  + [Message flow](#message-flow)
  + [Creating custom dialogue subclasses](#creating-custom-dialogue-subclasses)
    - [Sending output to the user](#sending-output-to-the-user)
    - [Example: Translator-bot](#example--translator-bot)
    - [Showing processing state](#showing-processing-state)

## Terminology

- **Conversation**: All the messages that are sent between the bot and the user. "What the user sees in the chat window".
- **(Chat) Bot**: The main structure that manages an entire conversation with a single end user. A bot does not contain any conversational logic itself. Instead, it manages a stack of dialogues to which it delegates. The dialogue that is on top of the dialogue stack is called the "active dialogue". When a chat bot receives input from a user, it passes that input on to the active dialogue. This dialogue can then act on it.
- **Dialogue**: A structure that contains the conversational logic (i.e. which messages to send, how to respond to them etc.).
- **Middleware**: Custom logic that sits between the bot and the dialogues.

## Building blocks of a conversation

Each instance of a `Bot` handles a single conversation with a single end user. A conversation is "What the user sees in the chat window".

A conversation itself is made up of separate `Dialogues`. Dialogues are structures in your bot that contain the conversational logic. They can act like functions in your bot's program. A dialogue can receive input from the user and act on it by emitting output back to the user.

At any time there is only 1 active dialogue. This does not mean your chat bot is limited to one dialogue, a dialogue can initiate a transition to another dialogue which allows you to string them together as reusable blocks to make up a conversation.

## Example: Pasta-bot

The following example dialogue is a bot that takes orders for pasta:

```typescript
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
        messages: [
          "Great!",
          "What sauce would you like with that?"
        ],
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
      // If the user wants to add another pasta, we add the current order to
      // the array of completed orders and go back to the start step.
      if(context.input === true) {
        return {
          state: { ...context.state, orders: [...context.state.orders, context.state.currentOrder] },
          nextStep: this.start
        }
      }

      return {
        messages: [
          "Great, I just need your address so I know where to send your delicious pasta.",
        ],
        prompt: { type: "text" },
        nextStep: this.finishOrder
      }
    },

    async finishOrder(context: StepContext<State>): Promise<StepOutput<State>> {
      const address = context.input

      if(typeof address !== "string" || address.trim().length === 0) {
        throw new InvalidInputError("Hmm, I cannot find that address. Please enter a valid address.")
      }

      // Initiate the pasta delivery in the back-end.
      await DeliveryService.deliver({
        orders: context.state.orders
        address,
      })

      return {
        messages: "Your pasta is on its way! Thank you for ordering with pasta-bot."
      }
    }
  }
}

// Create a new bot with the dialogue and start it.
const dialogue = new PastaOrderDialogue({
  state: { orders: [] }
})
const bot = new Bot(dialogue)
bot.start()
```

## Dialogue state

Each dialogue contains internal state. This state can contain things such as saved user responses (e.g. the user's name), external dependencies, and more. What you put into the state is up to you. In it's most basic form, it is an empty object.

The state is also used when persisting a snapshot of the dialogue. See advanced usage > persistence.

## Advanced

### Simulating human behaviour

No human can instantaneously respond to incoming messages. They require some time to read the message, think of a response, and type the response. Conversationalist comes with the tools to easily simulate this behaviour and make your bot feel much more human.

You can funnel messages through a `DelayedTypingEmitter` instance to simulate reading and typing delay. A `DelayedTypingEmitter` coalesces all bot events into a single callback, allowing you to update your UI in one place:

```typescript
import { DelayedTypingEmitter } from "conversationalist"
import TranslatorDialogue from "./TranslatorDialogue"

const dialogue = new TranslatorDialogue()
const bot = new Bot(dialogue)

const emitter = new DelayedTypingEmitter(bot, {
  readingDelay: 500 // Simulate the bot taking 0.5 seconds to "read" a message before starting to "type".
  typingDelay: 1500 // Simulate the bot taking 1.5 seconds to "type" a message.
})

emitter.events.update.on(({ isTyping, allMessages, addedMessages, prompt } => {
  // Update your UI here
  ui.showTypingIndicator = isTyping
  ui.chatMessages = allMessages
  ui.userInputPrompt = prompt
})
```

### Message flow

When the user sends input to a chat bot, it is handled in the following way:

1. The user sends input to the bot.
2. The bot invokes each `before` middleware with the input, giving the middleware a change to inspect it and perform any desired side effect.
3. The bot sends the user input to the currently active dialogue.
4. The dialogue receives input as `DialogueInput`, acts on it, and emits `DialogueOutput` as as reponse.
5. The output is passed back to the bot.
6. The bot invokes each `after` middleware with the output, giving the middleware a change to inspect it and perform any desired side effect.
7. The bot transforms the output to a series of chat messages and adds those to the message log. It also emits certain events to let the developer know that the message log has changed.

### Creating custom dialogue subclasses

The easiest way to start with Conversationalist is to use the built-in `SequentialDialogue` class. This style of dialogue fits most use cases, and allows you to quickly get started.

If you need more control over the dialogue logic, you can also create your own dialogue classes by implementing the `Dialogue` interface. This allows you to fully customize the logic for your dialogue.

Creating a custom dialogue is as "simple" as creating a class that implements the `Dialogue` protocol. You can handle user input via the `onReceiveInput` method, and emit outpout calling the `output` event. The way you structure the internal dialogue logic is completely up to you.

#### Sending output to the user

When a dialogue wants to interact with the user, it must emit `DialogueOut` by calling its `output` callback. Usually a dialogue will emit output in response to receiving input. However, it also perfectly valid to emit output without receiving input from the user.

Output can contain data such as:

- One or more messages or attachments to send to the user.
- The input UI that is available for the user to respond.
- Whether the dialogue is finished.
- A next dialogue to transition to.

#### Example: Translator-bot

The following example is a never-ending dialogue that translates user input using an async call to a third party:

```typescript
class TranslatorDialogue implements Dialogue<{}> {
  readonly identifier = "translate"
  events: DialogueEvents = {}

  get snapshot() {
    return undefined
  }

  onStart() {
    this.events.output?.({
      body: [
        "Hi, I am translate-o-bot!",
        "Say anything, and I will translate it for you."
      ]
    }, false)
  }

  async onReceiveInput(input: DialogueInput) {
    this.events.outputStart?.()

    const translation = await ThirdPartyTranslator.translate(input)

    this.events.output?.({
      body: translation
    }, false)
  }
}

const dialogue = new TranslatorDialogue()

// Create a new bot with the dialogue and start it.
const bot = new Bot(dialogue)
bot.start()
```

#### Showing processing state

Sometimes creating `DialogueOutput` takes some time, for example when the dialogue needs to call a third party API or query a database. In this case you can call the `outputStart` callback which will indicate to the bot that the dialogue is currently in the process of creating some output. This allows the UI to react accordingly, by showing a typing indicator for example.
