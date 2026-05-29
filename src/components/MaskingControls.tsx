// Privacy Veil (acoustic masking) controls — Pro feature, fast-follow per PRD.
//
// Copy is deliberately honest (AGENTS.md hard rule #4): masking reduces
// intelligibility to bystanders; it is NOT encryption / secrecy.

interface MaskingControlsProps {
  enabled: boolean;
  intensity: number;
  running: boolean;
  starting: boolean;
  error: string | null;
  privateOutput: boolean | null;
  onToggle: (enabled: boolean) => void;
  onIntensity: (value: number) => void;
}

export default function MaskingControls({
  enabled,
  intensity,
  running,
  starting,
  error,
  privateOutput,
  onToggle,
  onIntensity,
}: MaskingControlsProps) {
  return (
    <div className="rounded-2xl border border-veil-edge bg-veil-panel/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-100">
              Privacy Veil
            </span>
            {starting && (
              <span className="text-xs text-slate-400">starting…</span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Masks your speech for nearby people. Not encryption.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle Privacy Veil masking"
          onClick={() => onToggle(!enabled)}
          className={
            "relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-veil-accent " +
            (enabled ? "bg-veil-accent" : "bg-veil-edge")
          }
        >
          <span
            aria-hidden
            className={
              "absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform " +
              (enabled ? "translate-x-5" : "translate-x-0.5")
            }
          />
        </button>
      </div>

      {enabled && (
        <div className="mt-3">
          <label
            htmlFor="veil-intensity"
            className="flex items-center justify-between text-xs text-slate-400"
          >
            <span>Intensity</span>
            <span>{Math.round(intensity * 100)}%</span>
          </label>
          <input
            id="veil-intensity"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={intensity}
            onChange={(e) => onIntensity(Number(e.target.value))}
            className="mt-1 w-full accent-veil-accent"
          />
          {privateOutput === false && (
            <p className="mt-2 text-xs text-amber-300" role="alert">
              Sounds like you're on a loudspeaker — use earbuds so the masking
              stays private and effective.
            </p>
          )}
          {running && (
            <p className="mt-1 text-[11px] text-slate-500">
              Veil active — it auto-ducks when you stop talking.
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-veil-danger">
          {error}
        </p>
      )}
    </div>
  );
}
