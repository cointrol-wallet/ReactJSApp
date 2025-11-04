import * as React from "react"
import { Button } from "./button"

export function Sheet({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-3xl rounded-t-2xl bg-white p-4 shadow-2xl">
        {children}
      </div>
    </div>
  )
}

export function SheetHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-2">{children}</div>
}

export function SheetTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-lg font-semibold">{children}</div>
}

export function SheetContent({ children }: { children: React.ReactNode }) {
  return <div className="mt-2">{children}</div>
}

// convenience wrapper to match old API
export function SimpleTxActions({ onClose, txHash }: { onClose: () => void; txHash?: string }) {
  return (
    <div className="mt-3 flex gap-2">
      <Button variant="secondary" onClick={onClose}>Close</Button>
      {txHash && (
        <Button
          variant="outline"
          onClick={() => window.open(`https://sepolia.etherscan.io/tx/${txHash}`, "_blank", "noopener,noreferrer")}
        >
          View on Etherscan
        </Button>
      )}
    </div>
  )
}
