// import { Bot, Script, ScriptedDialogue } from ".."

// describe("A bot with middleware", () => {
//   const dialogue: Script = {
//     async start() {
//       return {
//         body: "The result",
//         prompt: { type: "text" },
//         nextStep: this.handler
//       }
//     },
//     async handler() {
//       return {
//         body: "The response"
//       }
//     }
//   }

//   it("calls each middleware before running the dialogue step", done => {
//     const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
//     chatBot.use({
//       before: (body, value, bot) => {
//         expect(body).toBe("The body")
//         expect(value).toBe("The value")
//         done()
//         return true
//       }
//     })

//     chatBot.start()
//     chatBot.respond("The body", "The value")
//   })

//   it("calls each middleware after running the dialogue step", done => {
//     const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
//     chatBot.use({
//       after: (result, bot) => {
//         expect(result.body).toBe("The result")
//         done()
//         return true
//       }
//     })

//     chatBot.start()
//     chatBot.respond("The body", "The value")
//   })
// })
