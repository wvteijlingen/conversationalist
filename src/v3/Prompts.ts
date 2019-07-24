interface TextPrompt {
  type: "text"
}

interface SliderPrompt {
  type: "slider"
}

interface InlinePickerPrompt {
  type: "inlinePicker"
  choices: { body: string, value: unknown }[]
}

interface PickerPrompt {
  type: "picker",
  choices: { body: string, value: unknown }[]
}

type Prompt = TextPrompt | InlinePickerPrompt | SliderPrompt | PickerPrompt

export default Prompt
