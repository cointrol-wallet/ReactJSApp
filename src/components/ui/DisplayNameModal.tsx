import * as React from "react";

export function DisplayNameModal({
  open,
  initialValue,
  onClose,
  onSave,
}: {
  open: boolean;
  initialValue: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void> | void;
}) {
  const [name, setName] = React.useState(initialValue);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setName(initialValue);
  }, [open, initialValue]);

  if (!open) return null;

  const canSave = name.trim().length >= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow">
        <div className="text-lg font-semibold">Set display name</div>
        <div className="text-sm text-neutral-600 mt-1">
          This name is shared when you export your profile QR.
        </div>

        <input
          className="mt-3 w-full rounded border px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Paul Bark"
          autoFocus
        />

        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded px-3 py-2" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
            disabled={!canSave || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(name.trim());
                onClose();
              } finally {
                setSaving(false);
              }
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
