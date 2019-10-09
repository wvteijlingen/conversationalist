export interface ProgressGraphAttachment {
  type: "progressGraph",
  name: string
  minValue: number
  maxValue: number
  neutralValue: number
  data: any
}

type Attachment = ProgressGraphAttachment
export default Attachment
