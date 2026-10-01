import type { SubxApi } from "../../shared/ipc";

declare global {
  interface Window {
    subx: SubxApi;
  }
}
