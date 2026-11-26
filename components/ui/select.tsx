"use client";

import type React from 'react';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Unified project select, built on @base-ui/react.
 *
 * Visual parity with the legacy native <select>: same height, border and
 * typography via .sis-select-trigger; the dropdown is a styled popup with
 * proper keyboard navigation and focus management (what the native element
 * could not offer inside dialogs).
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
  const nodes = Array.isArray(children) ? children : [children];
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
        <SelectPrimitive.Positioner sideOffset={4} alignItemWithTrigger={false}>
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
