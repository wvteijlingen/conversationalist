// type Seconds = number
//
// interface Answer {
//   body: string
//   id: string | undefined
// }
//
// interface Message {
//   id: string | number
//   direction: "incoming" | "outgoing"
//   title: string
//   responseType?: "text" | "prefab" | "slider"
//   prefabAnswers?: Answer[]
// }
//
// interface Conversation {
//   // All incoming and outgoing messages in the conversation
//   message: Message[]
//
//   // Called when a new message has come in
//   onMessageReceived: ((message: Message) => void) | undefined
//
//   // Whether the conversation is finished
//   isFinished: boolean
//
//   // Respond to the conversation
//   respond(answer: Answer): any
//
//   // Rewinds the conversation to a previous message
//   rewindToMessage(index: number): any
// }
//
// class OnboardingConversation implements Conversation {
//   messages = []
//   onMessageReceived: ((message: Message) => void) | undefined
//
//   private username: string | undefined;
//   private userIsReadyToStart: boolean;
//
//   private allMessages = [
//     { id: 1, title: "Hi, ik ben Oki!" },
//     { id: 2, title: "Ik ga je helpen met dingen." },
//     { id: 3, title: "Wat is jouw naam", responseType: "text" },
//     { id: 4, title: "Ben je klaar om te beginnen?", responseType: "prefab", prefabAnswers: [
//       { body: "Ja", id: "Y", next: 6 },
//       { body: "Nee", id: "N", next: 5 }
//     ]},
//     { id: 5, title: "Ok, je bent nog niet klaar. Laat maar weten zodra je wil beginnen.", prefabAnswers: [
//       { body: "Ik wil beginnen", id: "Y", next: 6 },
//     ]},
//     { id: 6, title: "Mooi, laten we beginnen!" },
//     { id: 7, title: "Hoe" },
//   ]
//
//   private currentMessageIndex = 0
//
//   get lastMessage(): Message {
//     let incomingMessages = this.messages.filter(e => e.direction === "incoming")
//     return incomingMessages[incomingMessages.count - 1]
//   }
//
//   get isFinished(): boolean {
//     return this.currentMessageIndex === this.messages.length - 1
//   }
//
//   rewindToMessage(index: number): any {
//
//   }
//
//   private advanceToMessageIndex(index: number): any {
//     let message = this.allMessages[index]
//
//     if(message === undefined) {
//       throw "Index is out of bounds"
//     }
//
//     this.currentMessageIndex = index;
//     this.onMessageReceived && this.onMessageReceived(message);
//
//     if(this.currentMessage.type === "message") {
//       setTimeout(this.advanceToNextMessage, 500)
//     }
//   }
//
//   private advanceToNextMessage(response: string | undefined): any {
//     if lastMessage.id === "3" {
//       this.username = response
//     }
//
//     if (lastMessage.id === 4 && response === "Y") || (lastMessage.id === "5" && response.id === "Y") {
//       this.userIsReadyToStart = true;
//     }
//
//     this.currentMessageIndex++;
//     this.advanceToMessageIndex(this.currentMessageIndex)
//   }
// }
