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
        (checked ? "bg-primary border-primary" : "bg-border border-border")
      }
    >
      <span
        className={"block h-4 w-4 translate-x-0.5 rounded-full bg-card transition-transform " + (checked ? "translate-x-4" : "")}
      />
    </button>
  )
}
