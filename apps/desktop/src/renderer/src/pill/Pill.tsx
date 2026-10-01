import { useEffect, useMemo, useState } from "react";
import type { PillState } from "../../../shared/ipc";
import { hotkeyLabel } from "../shared/format";
import { useAppInfo } from "../shared/hooks";
import { MicIcon } from "../shared/icons";
import { MicRecorder } from "./recorder";

const BAR_COUNT = 12;
const silence = () => Array<number>(BAR_COUNT).fill(0);

const SHAPE: Record<PillState["kind"], string> = {
  idle: "h-7 px-2.5",
  listening: "h-8 w-32",
  processing: "h-8 w-20",
  done: "h-8 px-4",
  error: "h-8 px-4",
};

export function Pill() {
  const [state, setState] = useState<PillState>({ kind: "idle" });
  const [hover, setHover] = useState(false);
  const [levels, setLevels] = useState(silence);
  const info = useAppInfo();
  // Only used when the OS has no native microphone plug (the main process sends mic commands).
  const recorder = useMemo(() => new MicRecorder(), []);

  useEffect(
    () =>
      window.subx.pill.onState((next) => {
        if (next.kind === "listening") setLevels(silence());
        setState(next);
      }),
    [],
  );
  useEffect(
    () => window.subx.pill.onLevel((level) => setLevels((previous) => [...previous.slice(1), level])),
    [],
  );
  useEffect(
    () =>
      window.subx.pill.onMicCommand((command) => {
        if (command === "start") void recorder.start();
        else recorder.stop();
      }),
    [recorder],
  );

  function hoverChanged(inside: boolean) {
    setHover(inside);
    window.subx.pill.hover(inside);
  }

  return (
    <div className="flex h-screen items-end justify-center pb-2">
      <button
        type="button"
        onMouseEnter={() => hoverChanged(true)}
        onMouseLeave={() => hoverChanged(false)}
        onClick={() => window.subx.pill.click()}
        aria-label="Open SUBXVoice"
        className={`flex max-w-[232px] items-center justify-center gap-1.5 rounded-full border border-white/20 bg-neutral-900/90 text-white shadow-lg transition-all duration-200 ${SHAPE[state.kind]}`}
      >
        {state.kind === "idle" && (
          <>
            <MicIcon className={`h-3.5 w-3.5 ${hover ? "text-white" : "text-white/75"}`} />
            {hover && (
              <span className="text-xs whitespace-nowrap">Hold {hotkeyLabel(info?.hotkeys[0]?.keys)}</span>
            )}
          </>
        )}
        {state.kind === "listening" && <Waveform levels={levels} />}
        {state.kind === "processing" && <Dots />}
        {state.kind === "done" && <span className="truncate text-xs text-white/90">{state.message}</span>}
        {state.kind === "error" && <span className="truncate text-xs text-red-300">{state.message}</span>}
      </button>
    </div>
  );
}

function Waveform({ levels }: { levels: number[] }) {
  return (
    <div className="flex h-5 items-center gap-[3px]">
      {levels.map((level, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: bars are positional
          key={index}
          className="w-[3px] rounded-full bg-white transition-[height] duration-75"
          style={{ height: `${3 + Math.min(1, level * 8) * 17}px` }}
        />
      ))}
    </div>
  );
}

function Dots() {
  return (
    <div className="flex gap-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-white"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}
