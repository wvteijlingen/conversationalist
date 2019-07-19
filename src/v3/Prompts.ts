export interface TextPrompt {
  type: "text"
}

export interface PrefabPrompt {
  type: "prefab"
  choices: { body: string, value: any }[]
}

export interface SliderPrompt {
  type: "slider"
}

export interface PickerPrompt {
  type: "picker",
  choices: { body: string, value: any }[]
}

type Prompt = TextPrompt | PrefabPrompt | SliderPrompt | PickerPrompt

export default Prompt
