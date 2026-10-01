import type { SessionRecord } from "@subx/core";
import { DAY_MS, formatSpeechTotal, startOfDay } from "./format";

const DAYS = 14;
const MAX_BAR_PX = 96;

/** Speaking time per day for the last two weeks, drawn like a waveform. */
export function VoiceStrip({ records }: { records: SessionRecord[] }) {
  const today = startOfDay(Date.now());
  const days = Array.from({ length: DAYS }, (_, index) => {
    const start = today - (DAYS - 1 - index) * DAY_MS;
    const ms = records
      .filter((record) => record.createdAt >= start && record.createdAt < start + DAY_MS)
      .reduce((total, record) => total + (record.audioMs ?? 0), 0);
    return { start, ms };
  });
  const max = Math.max(...days.map((day) => day.ms), 1);

  return (
    <figure>
      <div className="flex h-28 items-end gap-2" role="img" aria-label="Speaking time per day, last 14 days">
        {days.map(({ start, ms }) => (
          <div
            key={start}
            className="flex flex-1 flex-col items-center justify-end"
            title={formatSpeechTotal(ms)}
          >
            <div
              className={`w-full max-w-5 rounded-full ${ms ? "bg-accent" : "bg-line"}`}
              style={{ height: ms ? Math.max(6, (ms / max) * MAX_BAR_PX) : 3 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 text-xs text-muted">
        {days.map(({ start }) => (
          <span
            key={start}
            className={`flex-1 text-center ${start === today ? "font-semibold text-ink" : ""}`}
          >
            {new Date(start).toLocaleDateString([], { weekday: "narrow" })}
          </span>
        ))}
      </div>
    </figure>
  );
}
