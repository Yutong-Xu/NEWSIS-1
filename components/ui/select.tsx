"use client";

import type React from 'react';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Unified project select, built on @base-ui/react.
 *
 * Sizing contract: the trigger is .sis-select-trigger; the popup matches the
 * trigger's width via the --anchor-width variable base-ui sets on the
 * Positioner (width: max(var(--anchor-width), 140px) in globals.css), and
 * paints above dialogs via the positioner's z-index (70 > dialog z-50).
 * Do NOT hand-roll widths or z-indexes at usage sites.
 *
 * Usage mirrors the native element:
 *   <Select value={v} onChange={(val) => ...} aria-label="…">
 *     <option value="">All</option>
 *     <option value="CSC">CSC</option>
 *   </Select>
 */
function Select({
  value,
  onChange,
  children,
  className,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
  disabled?: boolean;
}) {
  // JSX children flatten unevenly: mixing literal options with a .map() produces
  // nested arrays ([<option/>, [<option/>, …]]), which must be flattened before use —
  // otherwise the mapped options silently vanish from the popup.
  const flat = (list: React.ReactNode[]): React.ReactNode[] =>
    list.flatMap((n) => (Array.isArray(n) ? flat(n) : [n]));
  const nodes = flat(Array.isArray(children) ? children : [children]);
  const items = nodes
    .filter((n): n is React.ReactElement<{ value?: string; children?: React.ReactNode }> =>
      n != null && typeof n === 'object' && 'props' in n)
    .map((child) => ({
      value: child.props.value ?? '',
      label: child.props.children,
    }));

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={(v) => onChange(v as string)}
      disabled={props.disabled}
    >
      <SelectPrimitive.Trigger
        aria-label={props['aria-label']}
        className={cn('sis-select-trigger', className)}
      >
        <SelectPrimitive.Value>
          {(v) => items.find((i) => i.value === v)?.label ?? items[0]?.label}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon>
          <ChevronDown size={13} aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          sideOffset={4}
          style={{ zIndex: 70 }}
        >
          <SelectPrimitive.Popup className="sis-select-popup">
            {items.map((item) => (
              <SelectPrimitive.Item key={item.value || '__empty'} value={item.value} className="sis-select-item">
                <SelectPrimitive.ItemIndicator className="sis-select-check">
                  <Check size={12} aria-hidden="true" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{item.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export { Select };
