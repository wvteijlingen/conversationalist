import { Bot, InputMode } from "../src"
import { TestingDialogue } from "./helpers"

describe("Sending a user message to a bot", () => {
  it("passes the response value to the active dialogue", done => {
    const dialogue = new TestingDialogue()
    dialogue.onReceiveInput = (input, attachment) => {
      expect(input).toBe("Value")
      expect(attachment).toBeUndefined()
      done()
    }

    const chatBot = new Bot(dialogue)
    chatBot.start()
    chatBot.sendUserMessage({ body: "Body", value: "Value" })
  })

  it("passes the response body to the active dialogue if there is not explicit value", done => {
    const dialogue = new TestingDialogue()
    dialogue.onReceiveInput = (input, attachment) => {
      expect(input).toBe("Body")
      expect(attachment).toBeUndefined()
      done()
    }

    const chatBot = new Bot(dialogue)
    chatBot.start()
    chatBot.sendUserMessage({ body: "Body" })
  })

  it("emits a messagesChanged event containing the added message", done => {
    const chatBot = new Bot()
    chatBot.events.messagesChanged.on(changeSet => {
      expect(changeSet.added.length).toBe(1)
      expect(changeSet.added[0].body).toBe("Body")
      expect(changeSet.added[0].author).toBe("user")
      done()
    })
    chatBot.sendUserMessage({ body: "Body", value: "Value" })
  })
})

describe("A bot that sends a message", () => {
  const dialogue = new TestingDialogue()
  dialogue.nextOutput = [{
    messages: "Body"
  }]

  it("emits a messagesChanged event containing an added message", done => {
    const chatBot = new Bot(dialogue)
    chatBot.events.messagesChanged.on(changeSet => {
      expect(changeSet.added.length).toBe(1)
      expect(changeSet.added[0].body).toBe("Body")
      expect(changeSet.added[0].author).toBe("bot")
      done()
    })
    chatBot.start()
  })

  it("appends the message to the messageLog", done => {
    const chatBot = new Bot(dialogue)
    chatBot.events.messagesChanged.on(changeSet => {
      expect(chatBot.messageLog.length).toBe(1)
      expect(chatBot.messageLog[0].body).toBe("Body")
      expect(chatBot.messageLog[0].author).toBe("bot")
      done()
    })
    chatBot.start()
  })
})

describe("A bot that interjects a message", () => {
  it("emits a messagesChanged event containing the added message", done => {
    const chatBot = new Bot()
    chatBot.events.messagesChanged.on(changeSet => {
      expect(changeSet.added.length).toBe(1)
      expect(changeSet.added[0].body).toBe("Body")
      expect(chatBot.messageLog[0].author).toBe("bot")
      done()
    })

    chatBot.interjectMessages(["Body"])
  })

  it("emits a messagesChanged", done => {
    const chatBot = new Bot()
    chatBot.events.messagesChanged.on(changeSet => {
      done()
    })
    chatBot.interjectMessages(["Interjected message"])
  })

  it("appends the message to the messageLog", done => {
    const chatBot = new Bot()
    chatBot.events.messagesChanged.on(changeSet => {
      expect(chatBot.messageLog.length).toBe(1)
      expect(chatBot.messageLog[0].body).toBe("Body")
      expect(chatBot.messageLog[0].author).toBe("bot")
      done()
    })

    chatBot.interjectMessages(["Body"])
  })
})

describe("A bot that sends a prompt", () => {
  const prompt: InputMode = { type: "text" }
  const dialogue = new TestingDialogue()
  dialogue.nextOutput = [{
    messages: "Body",
    prompt
  }]

  it("updates the activePrompt property", done => {
    const chatBot = new Bot(dialogue)
    chatBot.events.messagesChanged.once(changeSet => {
      expect(chatBot.inputMode).toMatchObject(prompt)
      done()
    })
    chatBot.start()
  })
})

describe("Receiving a finishValue", () => {
  const subDialogue = new TestingDialogue()
  subDialogue.nextOutput = [{}, "Finish value"]

  const rootDialogue = new TestingDialogue()
  rootDialogue.nextOutput = [{
    nextDialogue: subDialogue
  }, undefined]
  it("works", done => {
    rootDialogue.onReceiveInput = (input, attachment) => {
      expect(input).toBe("Finish value")
      done()
    }

    const chatBot = new Bot(rootDialogue)
    chatBot.start()
  })
})
