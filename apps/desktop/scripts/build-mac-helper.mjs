// Builds the Swift helper (native/mac-helper) on macOS; does nothing on other platforms.
// Pass --universal for release builds (arm64 + x86_64).
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.platform === "darwin") {
  const script = fileURLToPath(new URL("../../../native/mac-helper/build.sh", import.meta.url));
  execFileSync("sh", [script, ...process.argv.slice(2)], { stdio: "inherit" });
}
