import type { SessionRecord } from "@subx/core";
import { useCallback, useEffect, useState } from "react";
import type { AppInfo, AppSettings, MicrophoneOption, PermissionStatus } from "../../../shared/ipc";

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

/** Version, current hotkey and engine status. Re-read when settings change (e.g. a new hotkey). */
export function useAppInfo(): AppInfo | null {
  const [info, setInfo] = useState<AppInfo | null>(null);
  useEffect(() => {
    const load = () => void window.subx.app.info().then(setInfo);
    load();
    return window.subx.settings.onChanged(load);
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

/** User settings, kept in sync with every window. `null` while loading. */
export function useSettings(): [AppSettings | null, (patch: Partial<AppSettings>) => void] {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  useEffect(() => {
    void window.subx.settings.get().then(setSettings);
    return window.subx.settings.onChanged(setSettings);
  }, []);
  const update = useCallback((patch: Partial<AppSettings>) => {
    void window.subx.settings.set(patch).then(setSettings);
  }, []);
  return [settings, update];
}

/**
 * Microphones the user can choose from. Device labels are only readable once mic permission has
 * been granted, so this re-reads them when the permission changes.
 */
export function useMicrophones(): MicrophoneOption[] {
  const [options, setOptions] = useState<MicrophoneOption[]>([]);
  useEffect(() => {
    const read = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      const inputs = devices
        .filter((device) => device.kind === "audioinput" && device.deviceId !== "communications")
        .map((device, index) => ({
          id: device.deviceId,
          label: device.label || `Microphone ${index + 1}`,
        }));
      setOptions(inputs);
      // The pill records, but only this window may enumerate devices.
      window.subx.settings.publishMicrophones(inputs);
    };
    void read();
    navigator.mediaDevices.addEventListener("devicechange", read);
    return () => navigator.mediaDevices.removeEventListener("devicechange", read);
  }, []);
  return options;
}
