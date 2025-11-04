import * as React from "react"

export function Switch({ checked, onCheckedChange, id }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; id?: string }) {
  return (
    <button
      role="switch"
      aria-checked={!!checked}
      id={id}
      onClick={() => onCheckedChange?.(!checked)}
      className={
        "inline-flex h-5 w-9 items-center rounded-full border " +
        (checked ? "bg-neutral-900 border-neutral-900" : "bg-neutral-200 border-neutral-300")
      }
    >
      <span
        className={"block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform " + (checked ? "translate-x-4" : "")}
      />
    </button>
  )
}
