import { useState } from "react";

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatMessage({ message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const copyMessage = async () => {
    if (isUser) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      setCopied(false);
    }
  };

  return (
    <div className={`w-full flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] sm:max-w-[70%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={[
            "rounded-2xl px-4 py-3 whitespace-pre-wrap break-words",
            isUser ? "bg-emerald-500 text-white rounded-br-md" : "bg-slate-700 text-slate-100 rounded-bl-md",
          ].join(" ")}
        >
          {message.content}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{formatTime(message.timestamp)}</span>
          {!isUser && (
            <button onClick={copyMessage} className="hover:text-slate-200 transition-colors" type="button">
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
