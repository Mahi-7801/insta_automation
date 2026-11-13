import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(undefined);

let seq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, variant = "default", duration = 4000) => {
    const id = ++seq;
    setToasts((t) => [...t, { id, message, variant, duration }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  }, []);

  const showSuccess = useCallback((m, d) => showToast(m, "success", d), [showToast]);
  const showError = useCallback((m, d) => showToast(m, "error", d), [showToast]);
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError }}>
      {children}
      <div className="fixed top-5 right-5 left-5 mx-auto sm:left-auto sm:right-6 z-[99999] flex flex-col gap-3 pointer-events-none w-auto max-w-[calc(100%-2.5rem)] sm:w-[390px]">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className="pointer-events-auto relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl border border-neutral-200/90 dark:border-neutral-800/90 bg-white/95 dark:bg-neutral-900/95 text-neutral-900 dark:text-neutral-100 px-5 py-4 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.12)] backdrop-blur-md animate-fade-in-0"
          >
            <span
              className={`shrink-0 w-2.5 h-2.5 rounded-full ${
                t.variant === "success" ? "bg-emerald-500" : t.variant === "error" ? "bg-red-500" : "bg-ig-purple"
              }`}
            />
            <p className="flex-1 text-sm font-medium">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Close notification"
              className="shrink-0 p-1.5 -mr-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};
