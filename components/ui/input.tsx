import { Input as InputPrimitive } from '@base-ui/react/input'

import { cn } from '@/lib/utils'

/**
 * Unified project input: @base-ui/react primitive with project styling.
 * Visual appearance unchanged — inputs inherit global input styles.
 */
function Input({ className, ...props }: InputPrimitive.Props) {
  return <InputPrimitive data-slot="input" className={cn(className)} {...props} />
}

export { Input }
