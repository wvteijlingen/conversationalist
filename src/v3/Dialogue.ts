import Prompt from "./Prompts"

export type StepFunction<State> = (response: any | undefined, data: State) => StepResult<State>

export interface StepResult<State> {
  body: string | string[]
  prompt?: Prompt | undefined,
  nextStep?: StepFunction<State>
}

export interface DialogueScript<State> {
  start: StepFunction<State>
  [key: string]: StepFunction<State>
}


// JSON

// export type DialogueState = AnyJSON
// type AnyJSON =  boolean | number | string | null | JSONArray | JSONMap
// interface JSONMap { [key: string]: AnyJSON }
// interface JSONArray extends Array<AnyJSON> {}
