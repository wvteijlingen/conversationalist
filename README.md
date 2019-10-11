# Conversationalist

Conversationalist is a TypeScript library that allows you to easily create simple or advanced chat bots. All the conversation logic is decoupled from the user interface. This allows great flexibility, for example, a chat bot can run locally or on a server.

## Terminology

- **Conversation**: All the messages that are sent between the bot and the user. "What the user sees in the chat window".
- **(Chat) Bot**: The main structure that manages an entire conversation with a single end user. A bot does not contain any conversational logic itself. Instead, it manages a stack of dialogues to which it delegates. The dialogue that is on top of the dialogue stack is called the "active dialogue". When a chat bot receives input from a user, it passes that input on to the active dialogue. This dialogue can then act on it.
- **Dialogue**: A structure that contains the conversational logic (i.e. which messages to send, how to respond to them etc.).
- **Middleware**: Custom logic that sits between the bot and the dialogues.

## A conversation is made up of dialogues

A converstation ("What the user sees in the chat window"), is modeled using separate `Dialogues`. Dialogues are structures in your bot that contain the conversational logic. They can act like functions in your bot's program. A dialogue can receive input from the user and act on it by emitting output back to the user.

At any time there is only 1 active dialogue. This does not mean your chat bot is limited to one dialogue, a dialogue can initiate a transition to another dialogue which allows you to string together reusable blocks that make up a conversation.

## Receiving input from the user

When the user sends input to the chat bot, it is handled in the following way:

1. The user sends input to the bot.
2. The bot invokes each `before` middleware with the input, giving the middleware a change to inspect it and perform any desired side effect.
3. The bot sends the user input to the currently active dialogue.
4. The dialogue receives input as `DialogueInput`, acts on it, and emits `DialogueOutput` as as reponse.
5. The output is passed back to the bot.
6. The bot invokes each `after` middleware with the output, giving the middleware a change to inspect it and perform any desired side effect.
7. The bot transforms the output to a series of chat messages and adds those to the message log. It also emits certain events to let the developer know that the message log has changed.

## Sending output to the user

When a dialogue wants to interact with the user, it must emit `DialogueOut` by calling its `output` callback. Usually a dialogue will emit output in response to receiving input. However, it also perfectly valid to emit output without receiving input from the user.

Output can contain data such as:

- One or more messages or attachments to send to the user.
- The input UI that is available for the user to respond.
- Whether the dialogue is finished.
- A next dialogue to transition to.

### Handling longer processing by simulating typing

Sometimes creating `DialogueOutput` takes some time, for example when the dialogue needs to call a third party API or query a database. In this case you can optionally call the `outputStart` callback which will indicate to the bot that dialogue is currently in the process of creating some output. This allows the UI to react accordingly, by showing a typing indicator for example.

## Dialogue state

Each dialogue contains internal state. This state can contain things such as saved user responses (e.g. the user's name), external dependencies, and more. What you put into the state is up to you. In it's most basic form, it is an empty object.

The state is also used when persisting a snapshot of the conversation. When the chatbot is later revived from the snapshot, each dialogue that was active at the time of persisting will be revived with the state it had at that time.

## Creating a dialogue

There are generally two ways to create a dialogue:

1. Recommended: Subclassing one of the built in dialogue classes. This is ideal if your dialogue fits a common pattern
2. Create a dialogue from scratch by implenting the `Dialogue` interface. This allows you to fully customize the logic for your dialogue.

### Example: Creating a simple linear dialogue using the built in `WaterfallDialogue` class

A `WaterfallDialogue` is a simple dialogue that runs through a list of messages in a linear fashion. The dialogue will send the messages in order, advancing to the next message when the user taps one of the continue buttons. There is no custom logic, just a series of messages. This is perfect for onboardings or informational dialogues.

The following example creates a simple waterfall dialogue, and starts it using a `Bot`:

```typescript
interface State {
  username: string
}

class ExampleDialogue extends WaterfallDialogue<State> {
  identifier = "exampleDialogue"

  steps = [
    (s: State) => ({
      body: [`Hi ${s.username)}!`, "Welcome to this simple waterfall dialogue."],
      buttons: "Hello"
    }),
    (s: State) => ({
      body: "Do you prefer blue or yellow?",
      buttons: ["Blue", "Yellow"]
    }),
    (s: State) => ({
      body: ["Thank you for your answer.", "Goodbye!"],
      buttons: "Bye 👋"
    })
  ]
}

const dialogue = new ExampleDialogue({
  state: { username: "Bob" }
})

// Create a new bot with the dialogue and start it.
const bot = new Bot(dialogue)
bot.start()
```

### Creating a dialogue using the built in `ScriptedDialogue` class

A `ScriptedDialogue` is a dialogue that runs through a prewritten "script". A script contains multiple steps which will be called in response to received user input. This class supports multiple branches and is the suited for most dialogues.

As you can see in the following example, a `ScriptedDialogue` allow you to execute custom logic based on input. In the `handleUsername` step, we check if the user actually entered a valid name. If not, we prompt the user again, otherwise we return the next set of messages. In the `handleFavoriteColor` step, we customize the response message based on the color the user picked.

The following example creates a simple scripted dialogue, and starts it using a `Bot`:

```typescript
interface State {
  username?: string
}

enum Color { Blue, Yellow }

class ExampleDialogue extends ScriptedDialogue<State> {
  identifier = "exampleDialogue"

  steps = {
    async start(context: StepContext<State>): AsyncStepOutput<State> {
      return {
        body: [`Hi there!`, "Welcome to this simple scripted dialogue.", "What is your name?"],
        prompt: { type: "text" }
        nextStep: this.handleUsername
      }
    },

    async handleUsername(context: StepContext<State>): AsyncStepOutput<State> {
      if(typeof context.input !== "string" || context.input.trim().length === 0) {
        throw InvalidInputError("Oh, that doesn't seem to be a valid name. Please enter your name")
      }

      return {
        body: `Nice to meet you ${context.input}.`, "Do you prefer blue or yellow?",
        prompt: { type: "inlinePicker", choices: [
          { body: "Blue", value: Color.Blue },
          { body: "Yellow", value: Color.Yellow }
        ]},
        state: { ...context.state, username: context.input }
        nextStep: this.handleFavoriteColor
      }
    },

    async handleFavoriteColor(context: StepContext<State>): AsyncStepOutput<State> {
      if(context.input === Color.Blue) {
        return {
          body: "Great, blue is also my favorite color!"
        }
      } else {
        return {
          body: "Yellow can be very pretty indeed."
        }
      }
    }
  }
}

const dialogue = new ExampleDialogue({
  state: {}
})

// Create a new bot with the dialogue and start it.
const bot = new Bot(dialogue)
bot.start()
```

### Creating a custom dialogue from scratch

Creating a dialogue is as "simple" as creating a class that implements the `Dialogue` protocol. You can handle user input via the `onReceiveInput` method, and emit outpout calling the `output` event. The way you structure the internal dialogue logic is completely up to you.

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

## Simulating human typing behaviour

```typescript
import { DelayedTypingEmitter } from "conversationalist"
import TranslatorDialogue from "./TranslatorDialogue"

const dialogue = new TranslatorDialogue()
const bot = new Bot(dialogue)

const emitter = new DelayedTypingEmitter(bot, {
  responseDelay: 500 // Simulate the bot taking 0.5 seconds to "read" a message before starting to "type".
  typingDelay: 1500 // Simulate the bot taking 1.5 seconds to "type" a message.
})

emitter.events.update.on(({ isTyping, messages, prompt } => {
  // Update your UI here
  ui.showTypingIndicator = isTyping
  ui.chatMessages = messages
  ui.userInputPrompt = prompt
})
```
