import { DAY_MS, formatSpeechTotal, streakDays, totalAudioMs } from "../shared/format";
import { HistoryRow } from "../shared/HistoryRow";
import { useHistory, usePermissions } from "../shared/hooks";
import { SectionTitle } from "../shared/PageHeader";
import type { PageId } from "../shared/Sidebar";
import { VoiceStrip } from "../shared/VoiceStrip";

const RECENT_COUNT = 5;

export function HomePage({ hotkey, onNavigate }: { hotkey: string; onNavigate: (page: PageId) => void }) {
  const records = useHistory();
  const permissions = usePermissions();
  if (!records) return null;

  // "unknown" (e.g. Input Monitoring on Mac, which Electron can't read) is not treated as missing.
  const missingPermission = permissions?.some(
    (permission) => permission.state === "denied" || permission.state === "not_asked",
  );
  const week = records.filter((record) => record.createdAt >= Date.now() - 7 * DAY_MS);
  const streak = streakDays(records);

  let headline = `Hold ${hotkey} and say something.`;
  if (records.length > 0 && week.length === 0) headline = "Nothing dictated this week yet.";
  if (week.length > 0) {
    headline = `This week you dictated ${week.length} ${week.length === 1 ? "time" : "times"}, ${formatSpeechTotal(totalAudioMs(week))} of speech.`;
  }

  return (
    <div className="space-y-12">
      {missingPermission && (
        <div className="flex items-center justify-between gap-4 rounded-lg bg-accent-soft px-4 py-3">
          <p>SUBXVoice needs a few permissions before it can type for you.</p>
          <button
            type="button"
            onClick={() => onNavigate("settings")}
            className="shrink-0 rounded-md bg-accent px-3 py-1.5 font-medium text-white hover:opacity-90"
          >
            Review permissions
          </button>
        </div>
      )}

      <section>
        <h1 className="max-w-xl text-[28px] leading-tight font-semibold tracking-tight">{headline}</h1>
        {streak >= 2 && <p className="mt-2 text-muted">{streak} days in a row. Keep it going.</p>}
        {records.length === 0 && (
          <p className="mt-2 text-muted">Your recordings show up here, and you can play any of them back.</p>
        )}
      </section>

      <section>
        <SectionTitle>Last two weeks</SectionTitle>
        <VoiceStrip records={records} />
      </section>

      {records.length > 0 && (
        <section>
          <SectionTitle
            action={
              <button
                type="button"
                onClick={() => onNavigate("history")}
                className="text-accent hover:underline"
              >
                See all
              </button>
            }
          >
            Recent
          </SectionTitle>
          <ul className="divide-y divide-line">
            {records.slice(0, RECENT_COUNT).map((record) => (
              <HistoryRow key={record.id} record={record} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
