import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "./icons";

/** Plays the exact audio that was recorded from the microphone. */
export function AudioButton({ id }: { id: string }) {
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(
    () => () => {
      if (!audio.current) return;
      audio.current.pause();
      URL.revokeObjectURL(audio.current.src);
    },
    [],
  );

  async function toggle() {
    if (playing) {
      audio.current?.pause();
      return;
    }
    if (!audio.current) {
      const bytes = await window.subx.history.audio(id);
      const element = new Audio(
        URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "audio/wav" })),
      );
      element.onplay = () => setPlaying(true);
      element.onpause = () => setPlaying(false);
      audio.current = element;
    }
    await audio.current.play();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? "Pause recording" : "Play recording"}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent transition-colors hover:bg-accent hover:text-white"
    >
      {playing ? <PauseIcon className="h-3.5 w-3.5" /> : <PlayIcon className="ml-0.5 h-3.5 w-3.5" />}
    </button>
  );
}
