export interface Choice {
  body: string
  value: unknown
}

// A prompt that shows a textfield for the user to type a response.
interface TextPrompt {
  type: "text"
}

// A prompt that displays a slider so the user can select a numerical value.
interface SliderPrompt {
  type: "slider"
}

// A prompt that displays one or multiple prefab responses in a picker.
// Use this type over `InlinePickerPrompt` if the amount of responses is too great
// to be displayed inline.
interface PickerPrompt {
  type: "picker",
  choices: Choice[]
}

// A prompt that displays one or multiple prefab responses inline.
// Use this type over `PickerPrompt` if there is a small number of responses
// that can be displayed inline.
interface InlinePickerPrompt {
  type: "inlinePicker"
  choices: Choice[]
}

type Prompt = TextPrompt | SliderPrompt | PickerPrompt | InlinePickerPrompt

export default Prompt
