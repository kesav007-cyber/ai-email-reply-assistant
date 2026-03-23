import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import ChatMessage from "./components/ChatMessage";

const API_URL = "http://localhost:8001/chat";

const toneOptions = ["formal", "friendly", "professional", "apologetic", "persuasive"];
const intentOptions = ["reply", "complaint", "followup", "request", "apology", "meeting"];
const lengthOptions = ["short", "medium", "long"];

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [tone, setTone] = useState("");
  const [intent, setIntent] = useState("");
  const [length, setLength] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (!chatContainerRef.current) return;
    chatContainerRef.current.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const serializedHistory = useMemo(
    () =>
      messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    [messages]
  );

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage = {
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(API_URL, {
        message: trimmed,
        history: [...serializedHistory, { role: "user", content: trimmed }],
        tone: tone || "professional",
        intent: intent || "reply",
        length: length || "medium",
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.data.reply || "I could not generate a reply this time.",
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      const backendError = err?.response?.data?.detail;
      setError(typeof backendError === "string" ? backendError : "Failed to get AI reply. Check backend and API key.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    if (loading) return;
    setMessages([]);
    setError("");
  };

  const downloadChat = () => {
    if (!messages.length) return;
    const content = messages
      .map((msg) => {
        const time = new Date(msg.timestamp).toLocaleString();
        const sender = msg.role === "user" ? "You" : "AI";
        return `[${time}] ${sender}:\n${msg.content}\n`;
      })
      .join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ai-email-chat.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-white text-slate-800 flex">
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 transform bg-white/95 backdrop-blur-lg shadow-xl border-r border-violet-100 p-5 transition-transform duration-300 flex flex-col ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 pb-4 border-b border-violet-100">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-lg font-semibold">
            ✏️
          </div>
          <h1 className="text-lg font-bold text-violet-700">AI Email Assistant</h1>
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <button
            type="button"
            onClick={clearChat}
            className="w-full rounded-xl bg-violet-100 py-3 px-4 text-center text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-200 active:scale-95"
          >
            + New Chat
          </button>

          <button
            type="button"
            onClick={downloadChat}
            className="w-full rounded-xl bg-blue-100 py-3 px-4 text-center text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-200 active:scale-95"
          >
            ⬇ Download Chat
          </button>
        </div>

        <footer className="mt-auto pt-4 border-t border-violet-100">
          <p className="text-xs text-slate-400">Contextual • privacy aware</p>
        </footer>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/40"
          onClick={() => setSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
          onKeyDown={(e) => { if (e.key === 'Escape') setSidebarOpen(false); }}
        />
      )}

      <main className="flex-1 flex flex-col">
        <header className="w-full border-b border-violet-200 bg-white/80 backdrop-blur p-4 lg:p-6 flex items-center gap-3">
          <button
            type="button"
            className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg border border-violet-200 bg-white text-xl font-bold text-violet-700 shadow-sm hover:bg-violet-50 transition-all ${
              sidebarOpen ? "hidden" : ""
            }`}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">✨ Hi! I'm your AI email assistant.</h2>
            <p className="text-sm text-slate-500 mt-1">Use prompts like: make it shorter, more formal, friendlier, or add bullet points.</p>
          </div>
        </header>

        <section ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {messages.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-violet-200 bg-white/80 px-6 py-10 text-center">
              <p className="text-lg font-medium text-slate-600">Start by pasting an email context or request.</p>
              <p className="text-sm text-slate-400 mt-2">Then choose options and hit Send.</p>
            </div>
          ) : (
            messages.map((message, index) => <ChatMessage key={`${message.timestamp}-${index}`} message={message} />)
          )}

          {loading && (
            <div className="inline-flex items-center gap-3 bg-white shadow rounded-2xl px-4 py-3">
              <span className="h-2 w-2 rounded-full animate-pulse bg-violet-500" />
              <span className="text-sm text-slate-500">AI is typing…</span>
            </div>
          )}
        </section>

        <section className="border-t border-violet-100 bg-white/90 backdrop-blur px-4 lg:px-6 py-4 sticky bottom-0 shadow-[0_-8px_24px_-14px_rgba(99,102,241,0.25)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="bg-white border border-violet-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="" disabled>Tone</option>
              {toneOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="bg-white border border-violet-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="" disabled>Intent</option>
              {intentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="bg-white border border-violet-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="" disabled>Length</option>
              {lengthOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-stretch gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your email request..."
              rows={2}
              className="flex-1 resize-none bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3 text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="rounded-2xl px-5 font-semibold transition-colors text-white bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 flex items-center justify-center"
            >
              Send
            </button>
          </div>

          {error && <p className="text-rose-500 text-sm mt-2">{error}</p>}
        </section>
      </main>
    </div>
  );
}
