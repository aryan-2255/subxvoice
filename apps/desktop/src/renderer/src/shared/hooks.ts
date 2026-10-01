import type { SessionRecord } from "@subx/core";
import { useEffect, useState } from "react";
import type { AppInfo, PermissionStatus } from "../../../shared/ipc";

/** All recordings, newest first. `null` while loading. Refreshes when a new one is saved. */
export function useHistory(): SessionRecord[] | null {
  const [records, setRecords] = useState<SessionRecord[] | null>(null);
  useEffect(() => {
    const load = () => void window.subx.history.list().then(setRecords);
    load();
    return window.subx.history.onChanged(load);
  }, []);
  return records;
}

export function useAppInfo(): AppInfo | null {
  const [info, setInfo] = useState<AppInfo | null>(null);
  useEffect(() => {
    void window.subx.app.info().then(setInfo);
  }, []);
  return info;
}

const PERMISSION_POLL_MS = 1500;

/** Permission states, re-checked while the screen is open so granting one updates right away. */
export function usePermissions(): PermissionStatus[] | null {
  const [statuses, setStatuses] = useState<PermissionStatus[] | null>(null);
  useEffect(() => {
    const refresh = () => void window.subx.permissions.list().then(setStatuses);
    refresh();
    const timer = setInterval(refresh, PERMISSION_POLL_MS);
    return () => clearInterval(timer);
  }, []);
  return statuses;
}
