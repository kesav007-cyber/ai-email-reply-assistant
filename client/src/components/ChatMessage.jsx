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
      <div className={`max-w-[85%] sm:max-w-[70%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-2`}>
        <div
          className={[
            "rounded-2xl px-4 py-3 whitespace-pre-wrap break-words border",
            isUser
              ? "bg-gradient-to-r from-emerald-500/90 to-green-500/80 text-white border-emerald-200 shadow"
              : "bg-white text-slate-700 border-violet-100 shadow-sm",
          ].join(" ")}
        >
          {message.content}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{formatTime(message.timestamp)}</span>
          {!isUser && (
            <button onClick={copyMessage} className="hover:text-violet-600 transition-colors" type="button">
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
