"use client";

import { type DesktopOs, downloadUrl } from "@subx/shared";
import { useEffect, useState } from "react";

const LABEL: Record<DesktopOs, string> = { mac: "Download for Mac", win: "Download for Windows" };

function detectOs(): DesktopOs | null {
  const ua = navigator.userAgent;
  if (/Mac/i.test(ua)) return "mac";
  if (/Win/i.test(ua)) return "win";
  return null;
}

/** Puts the visitor's OS first; the other OS stays available as a secondary button. */
export function DownloadButtons() {
  const [os, setOs] = useState<DesktopOs | null>(null);
  useEffect(() => setOs(detectOs()), []);

  const order: DesktopOs[] = os === "win" ? ["win", "mac"] : ["mac", "win"];

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      {order.map((target, index) => (
        <a
          key={target}
          href={downloadUrl(target)}
          className={
            index === 0
              ? "rounded-full bg-foreground px-6 py-3 font-medium text-background transition hover:opacity-85"
              : "rounded-full border border-border px-6 py-3 font-medium transition hover:bg-foreground/5"
          }
        >
          {LABEL[target]}
        </a>
      ))}
    </div>
  );
}
