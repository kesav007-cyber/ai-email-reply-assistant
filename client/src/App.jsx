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
  const [tone, setTone] = useState("professional");
  const [intent, setIntent] = useState("reply");
  const [length, setLength] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
        tone,
        intent,
        length,
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
    <div className="h-full bg-slate-900 text-slate-100 flex">
      <aside className="w-64 hidden md:flex flex-col border-r border-slate-700 p-4 gap-3 bg-slate-950">
        <h1 className="text-xl font-semibold">AI Email Assistant</h1>
        <button
          type="button"
          onClick={clearChat}
          className="rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors px-3 py-2 text-left"
        >
          New Chat
        </button>
        <button
          type="button"
          onClick={downloadChat}
          className="rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors px-3 py-2 text-left"
        >
          Download Chat
        </button>
      </aside>

      <main className="flex-1 flex flex-col h-full">
        <div className="md:hidden border-b border-slate-700 px-4 py-3 flex items-center justify-between bg-slate-950">
          <h1 className="font-semibold">AI Email Assistant</h1>
          <div className="flex gap-2">
            <button type="button" onClick={clearChat} className="text-sm rounded-md px-2 py-1 bg-slate-800">
              New Chat
            </button>
            <button type="button" onClick={downloadChat} className="text-sm rounded-md px-2 py-1 bg-slate-800">
              Download
            </button>
          </div>
        </div>

        <section ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-5">
          {messages.length === 0 && !loading ? (
            <div className="text-center text-slate-400 mt-16">
              <p className="text-lg">Start by pasting an email context or request.</p>
              <p className="text-sm mt-2">Ask for refinements like: make it shorter, more formal, or friendlier.</p>
            </div>
          ) : (
            messages.map((message, index) => <ChatMessage key={`${message.timestamp}-${index}`} message={message} />)
          )}

          {loading && (
            <div className="w-full flex justify-start">
              <div className="bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-3">
                <span className="text-slate-200 text-sm">AI is typing</span>
                <span className="flex gap-1">
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-200" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-200" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-200" />
                </span>
              </div>
            </div>
          )}
        </section>

        <section className="border-t border-slate-700 px-4 sm:px-8 py-4 bg-slate-900 sticky bottom-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {toneOptions.map((option) => (
                <option key={option} value={option}>
                  Tone: {option}
                </option>
              ))}
            </select>
            <select
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {intentOptions.map((option) => (
                <option key={option} value={option}>
                  Intent: {option}
                </option>
              ))}
            </select>
            <select
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {lengthOptions.map((option) => (
                <option key={option} value={option}>
                  Length: {option}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your email request..."
              rows={2}
              className="flex-1 resize-none bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-medium rounded-xl px-5 py-3 transition-colors"
            >
              Send
            </button>
          </div>
          {error && <p className="text-rose-400 text-sm mt-2">{error}</p>}
        </section>
      </main>
    </div>
  );
}
