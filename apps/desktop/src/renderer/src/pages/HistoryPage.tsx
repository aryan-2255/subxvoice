import type { SessionRecord } from "@subx/core";
import { dayLabel, startOfDay } from "../shared/format";
import { HistoryRow } from "../shared/HistoryRow";
import { useHistory } from "../shared/hooks";
import { PageHeader, SectionTitle } from "../shared/PageHeader";

export function HistoryPage({ hotkey }: { hotkey: string }) {
  const records = useHistory();
  if (!records) return null;

  const groups = new Map<number, SessionRecord[]>();
  for (const record of records) {
    const day = startOfDay(record.createdAt);
    groups.set(day, [...(groups.get(day) ?? []), record]);
  }

  return (
    <>
      <PageHeader title="History">
        Everything you've dictated, newest first. Recordings are stored only on this computer.
      </PageHeader>
      {records.length === 0 ? (
        <p className="text-muted">Nothing here yet. Hold {hotkey} in any app and start talking.</p>
      ) : (
        <div className="space-y-10">
          {[...groups].map(([day, dayRecords]) => (
            <section key={day}>
              <SectionTitle>{dayLabel(day)}</SectionTitle>
              <ul className="divide-y divide-line">
                {dayRecords.map((record) => (
                  <HistoryRow key={record.id} record={record} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
