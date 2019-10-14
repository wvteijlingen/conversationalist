export interface ImageAttachment {
  type: "image"
  href: string
}

interface CustomAttachment {
  type: "custom"
  customType: string
}

type Attachment = ImageAttachment | CustomAttachment

export default Attachment
