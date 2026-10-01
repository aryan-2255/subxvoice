import { SidebarTop } from "@platform/Chrome";
import type { ComponentType } from "react";
import { BookIcon, HistoryIcon, HomeIcon, SettingsIcon } from "./icons";

export type PageId = "home" | "history" | "dictionary" | "settings";

const PAGES: { id: PageId; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "history", label: "History", icon: HistoryIcon },
  { id: "dictionary", label: "Dictionary", icon: BookIcon },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar({
  page,
  onNavigate,
  hotkey,
}: {
  page: PageId;
  onNavigate: (page: PageId) => void;
  hotkey: string;
}) {
  return (
    <nav className="flex w-52 shrink-0 flex-col border-r border-line bg-sidebar px-3 pb-4">
      <SidebarTop />
      <ul className="space-y-0.5">
        {PAGES.map(({ id, label, icon: PageIcon }) => {
          const active = id === page;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onNavigate(id)}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left ${
                  active
                    ? "bg-ink/[0.08] font-medium text-ink"
                    : "text-muted hover:bg-ink/[0.04] hover:text-ink"
                }`}
              >
                <PageIcon className="h-4 w-4" />
                {label}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-auto px-2.5 leading-snug text-muted">Hold {hotkey} in any app to dictate.</p>
    </nav>
  );
}
