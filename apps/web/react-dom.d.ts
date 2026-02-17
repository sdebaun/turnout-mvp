// Type declaration workaround for Next.js 14 + React 18.3
// useFormStatus exists in the React 18.3 canary that Next.js 14 uses,
// but @types/react-dom@18.3.2+ removed it (since it's officially a React 19 feature)
// We pin to @types/react-dom@18.3.1 locally, but CI is somehow getting wrong types

declare module 'react-dom' {
  export interface FormStatusNotPending {
    pending: false
    data: null
    method: null
    action: null
  }

  export interface FormStatusPending {
    pending: true
    data: FormData
    method: string
    action: string | ((formData: FormData) => void | Promise<void>)
  }

  export type FormStatus = FormStatusNotPending | FormStatusPending

  export function useFormStatus(): FormStatus
}
