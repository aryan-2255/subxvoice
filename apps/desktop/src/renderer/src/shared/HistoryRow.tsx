import type { SessionRecord } from "@subx/core";
import { AudioButton } from "./AudioButton";
import { formatDuration, formatTime } from "./format";
import { TrashIcon } from "./icons";

export function HistoryRow({ record }: { record: SessionRecord }) {
  async function remove() {
    if (window.confirm("Delete this recording? The audio file is removed from this computer.")) {
      await window.subx.history.remove(record.id);
    }
  }

  return (
    <li className="group flex items-center gap-3 py-2.5">
      <AudioButton id={record.id} />
      <div className="min-w-0 flex-1">
        {record.finalText ? (
          <p className="truncate select-text">{record.finalText}</p>
        ) : (
          <p className="truncate text-muted">No text yet. Speech-to-text isn't connected.</p>
        )}
        <p className="mt-0.5 text-xs text-muted tabular-nums">
          {formatTime(record.createdAt)}, {formatDuration(record.audioMs ?? 0)}
          {record.context.appName ? ` in ${record.context.appName}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={remove}
        aria-label="Delete recording"
        className="grid h-8 w-8 place-items-center rounded-md text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </li>
  );
}
