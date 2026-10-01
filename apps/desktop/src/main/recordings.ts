import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AudioClip } from "@subx/core";
import { app } from "electron";

export const recordingsDir = () => join(app.getPath("userData"), "recordings");

/** Saves a clip as a WAV file in the app's local data folder and returns its path. */
export async function saveRecording(clip: AudioClip): Promise<string> {
  const dir = recordingsDir();
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}.wav`);
  await writeFile(path, encodeWav(clip));
  return path;
}

export async function deleteRecording(path: string): Promise<void> {
  await rm(path, { force: true });
}

/** 16-bit mono PCM WAV. */
export function encodeWav({ samples, sampleRate }: AudioClip): Buffer {
  const dataBytes = samples.length * 2;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(dataBytes, 40);
  return Buffer.concat([header, Buffer.from(samples.buffer, samples.byteOffset, dataBytes)]);
}
