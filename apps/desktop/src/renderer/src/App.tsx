import { TITLE_BAR_DRAG } from "@platform/Chrome";
import { useState } from "react";
import { DictionaryPage } from "./pages/DictionaryPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { SettingsPage } from "./pages/SettingsPage";
import { hotkeyLabel } from "./shared/format";
import { useAppInfo } from "./shared/hooks";
import { type PageId, Sidebar } from "./shared/Sidebar";

export function App() {
  const [page, setPage] = useState<PageId>("home");
  const info = useAppInfo();
  const hotkey = hotkeyLabel(info?.hotkeys[0]?.keys);

  return (
    <div className="flex h-full">
      <Sidebar page={page} onNavigate={setPage} hotkey={hotkey} />
      <main className="flex-1 overflow-y-auto">
        <div className={`sticky top-0 z-10 h-10 bg-canvas ${TITLE_BAR_DRAG}`} />
        <div className="mx-auto max-w-3xl px-10 pb-12">
          {page === "home" && <HomePage hotkey={hotkey} onNavigate={setPage} />}
          {page === "history" && <HistoryPage hotkey={hotkey} />}
          {page === "dictionary" && <DictionaryPage />}
          {page === "settings" && <SettingsPage hotkey={hotkey} version={info?.version ?? ""} />}
        </div>
      </main>
    </div>
  );
}
