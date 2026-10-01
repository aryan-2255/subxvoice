import { DownloadButtons } from "@/components/DownloadButtons";

const FEATURES = [
  {
    title: "Works in every app",
    body: "Gmail, Slack, WhatsApp, Notion, your code editor — if it has a cursor, SUBXVoice can type there.",
  },
  {
    title: "Speak any language",
    body: "Switch between Hindi, English, Spanish and more mid-sentence. Each part is written in the language you spoke.",
  },
  {
    title: "Learns your words",
    body: "Fix a word once and SUBXVoice remembers it — names, products, and technical terms.",
  },
  {
    title: "Your history stays yours",
    body: "Recordings and transcripts are stored on your computer. Replay or delete them anytime.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <span className="text-lg font-semibold tracking-tight">SUBXVoice</span>
      </header>

      <section className="flex flex-col items-center py-24 text-center">
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">Typing is optional.</h1>
        <p className="mt-6 max-w-xl text-lg text-muted">
          Hold a key, speak naturally, and clean text appears wherever your cursor is.
        </p>
        <div className="mt-10">
          <DownloadButtons />
        </div>
        <p className="mt-4 text-sm text-muted">macOS 12+ · Windows 10 and 11</p>
      </section>

      <section className="grid gap-4 pb-24 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-2xl border border-border p-6">
            <h2 className="font-medium">{feature.title}</h2>
            <p className="mt-2 text-muted">{feature.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-sm text-muted">
        © {new Date().getFullYear()} SUBXVoice
      </footer>
    </main>
  );
}
