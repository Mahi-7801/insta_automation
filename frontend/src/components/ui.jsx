export function Spinner({ className = "w-5 h-5" }) {
  return (
    <span
      className={`${className} inline-block border-2 border-gray-300 dark:border-gray-700 border-t-ig-purple rounded-full animate-spin`}
      aria-hidden="true"
    />
  );
}

export function Button({
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  children,
  ...rest
}) {
  const styles = {
    primary:
      "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200",
    dark: "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900",
    outline:
      "border border-neutral-300 dark:border-neutral-700 bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-foreground",
    ghost: "bg-neutral-100 dark:bg-neutral-800 text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-700",
    google: "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 shadow-sm",
    destructive: "bg-red-600 text-white hover:bg-red-500 shadow-sm",
  };
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 px-6 py-3 text-sm sm:text-base ${styles[variant]} ${className}`}
      {...rest}
    >
      {loading && <Spinner className="w-4 h-4" />}
      {children}
    </button>
  );
}

export function Input({ label, error, hint, id, className = "", ...rest }) {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full text-sm rounded-xl border px-3.5 py-3 bg-white dark:bg-neutral-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-ig-purple focus:ring-2 focus:ring-ig-purple/15 transition-all ${
          error ? "border-red-500" : "border-gray-300 dark:border-neutral-700"
        } ${className}`}
        {...rest}
      />
      {hint && !error && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, id, className = "", ...rest }) {
  const inputId = id || `textarea-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`w-full text-sm rounded-xl border px-3.5 py-3 min-h-[110px] bg-white dark:bg-neutral-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-ig-purple focus:ring-2 focus:ring-ig-purple/15 transition-all ${
          error ? "border-red-500" : "border-gray-300 dark:border-neutral-700"
        } ${className}`}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
