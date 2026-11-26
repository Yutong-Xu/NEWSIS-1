import { Button as ButtonPrimitive } from '@base-ui/react/button'

import { cn } from '@/lib/utils'

/**
 * Unified project button.
 *
 * Built on the @base-ui/react button primitive (consistent focus, keyboard
 * and disabled semantics) but styled with the project's design classes, so
 * the visual appearance is identical to the legacy `.btn` system.
 *
 * Variants map onto the legacy class system:
 *   default     → .btn
 *   primary     → .btn.primary
 *   text        → .text-button
 *   icon        → .icon-btn
 * Any extra className (e.g. "btn-sm", "candidate-add") is merged on top.
 */
function Button({
  className,
  variant = 'default',
  size,
  ...props
}: ButtonPrimitive.Props & {
  variant?: 'default' | 'primary' | 'text' | 'icon'
  size?: 'sm' | 'default'
}) {
  const base =
    variant === 'primary' ? 'btn primary'
    : variant === 'text' ? 'text-button'
    : variant === 'icon' ? 'icon-btn'
    : 'btn'
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(base, size === 'sm' && 'btn-sm', className)}
      {...props}
    />
  )
}

export { Button }
