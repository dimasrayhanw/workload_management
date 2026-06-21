import React, { useState, useEffect } from "react";

type ToastItem = { id: number; message: string; type: "success" | "error" | "info" };

let _nextId = 1;

export const toast = {
  success: (msg: string) => _fire(msg, "success"),
  error:   (msg: string) => _fire(msg, "error"),
  info:    (msg: string) => _fire(msg, "info"),
};

function _fire(message: string, type: ToastItem["type"]) {
  window.dispatchEvent(
    new CustomEvent("app:toast", { detail: { message, type, id: _nextId++ } })
  );
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const item = (e as CustomEvent<ToastItem>).detail;
      setToasts(prev => [...prev, item]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== item.id)), 3500);
    };
    window.addEventListener("app:toast", handler);
    return () => window.removeEventListener("app:toast", handler);
  }, []);

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
      ))}
    </div>
  );
};
