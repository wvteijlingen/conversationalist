export interface ImageAttachment {
  type: "image"
  src: string
}

interface CustomAttachment {
  customType: string
}

type Attachment = ImageAttachment | CustomAttachment

export default Attachment
