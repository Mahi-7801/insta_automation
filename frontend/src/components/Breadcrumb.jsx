import { Link } from "react-router-dom";

export default function Breadcrumb({ current, backLabel = "Back to Home", backTo = "/" }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-8 sm:mb-12">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <li>
            <Link to="/" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              Home
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900 dark:text-white font-medium">{current}</li>
        </ol>
      </nav>
      <Link
        to={backTo}
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06]"
      >
        ← {backLabel}
      </Link>
    </div>
  );
}
