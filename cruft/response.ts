
// class Response {
//   constructor(public body: string, public value?: any) {}
//
//   get text(): string | undefined {
//     if(typeof this.value === "string") {
//       return this.value
//     }
//     return this.body
//   }
//
//   get int(): number | undefined {
//     if(typeof this.value === "number") {
//       return this.value
//     }
//     const int = parseInt(this.body, 10)
//     if(!isNaN(int)) {
//       return int
//     }
//     return undefined
//   }
//
//   get float(): number | undefined {
//     if(typeof this.value === "number") {
//       return this.value
//     }
//     const float = parseFloat(this.body)
//     if(!isNaN(float)) {
//       return float
//     }
//     return undefined
//   }
// }
