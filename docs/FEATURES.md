# SUBXVoice — Feature List

Platforms: **macOS + Windows** (desktop first)

Core rule: every external engine (STT, LLM, vision, storage) is a pluggable provider — API today, our own model later.

---

## 1. Core Dictation
- Global hotkey (hold-to-talk + toggle mode), works in any app
- Speak → accurate text pasted at cursor instantly
- Streaming transcription while speaking (low perceived latency)
- Small floating indicator (listening / processing / done)
- Cancel shortcut (Esc) to discard a recording

## 2. Multilingual + Code-Switching
- Text is written in whatever language the user speaks — no fixed language setting
- Mid-sentence switching: Spanish → English → Hindi → … each part written in its own language
- Never translate unless the user asks
- Per-language script preference (e.g. Hindi as Devanagari or Roman/Hinglish)

## 3. Modes
- Exact: what I said → clean version (punctuation, casing, obvious fixes)
- AI / Style: rewrite into polished text in user's style (casual / formal / concise …)
- Per-app default mode/style (Slack = casual, Gmail = formal)

## 4. Dictionary
- Manual add: names, companies, products, tech terms, acronyms
- Custom corrections: "wrong word" → "right word"
- **Auto-learn from edits**: if the user edits text SUBXVoice inserted, detect the changed word and save it to the dictionary (with confirm/undo)
- Dictionary words sent as hints to STT + applied after STT

## 5. History
- Every session saved locally: original audio, raw transcript, final text, time, app, mode
- **Play back the exact microphone audio** for any entry
- Copy / re-paste / download audio / delete / export
- Search history
- Retention setting (keep forever / 30 days / never save audio)

## 6. Voice Shortcuts & Commands
- Built-in commands: "write a mail", "write a Slack message", "make this professional", "translate this", "summarize this"
- User-defined trigger phrases → workflows
- One-time modes: asks for missing info ("what is the email about?"), finishes, returns to normal
- Commands act on selected text (select → speak "make this polite")

## 7. Screen / Context Awareness
- Detect active app, window title, browser URL, focused text field
- Read nearby/selected text on screen (with permission) for better context
- Suggest the right action for the app (Gmail → email, VS Code → code-friendly output)
- Never auto-switch mode permanently; context is a hint, not a decision

## 8. Desktop Actions (later)
- "Open Chrome", "open VS Code", switch apps
- Confirmation before consequential actions (sending messages etc.)

## 9. Stats & Engagement
- Total words dictated, speaking time, words per minute
- Estimated time saved (vs. typing speed)
- Daily usage, sessions, current & longest streak
- Dashboard in the app

## 10. Account, Settings & Sync
- Sign-in, preferences, hotkey customization, mic selection
- Sync dictionary / shortcuts / settings across devices
- Private content (audio, transcripts) stays local by default

## 11. Teams
- Create team, invite members, admin role
- Shared dictionary & shortcuts
- Team stats (aggregate only — never private transcripts)

## 12. Future
- Meetings: long recording, speakers, summaries, action items
- Connector for external AI assistants to query the user's data
- Our own STT / LLM models plugged in
- Mobile
