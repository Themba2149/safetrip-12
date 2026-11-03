import { createContext, useContext } from 'react'

// App.tsx sets this once, so any page layout can ask "is this person an insurer?".
export const InsurerContext = createContext<boolean>(false)

export function useIsInsurer(): boolean {
  return useContext(InsurerContext)
}