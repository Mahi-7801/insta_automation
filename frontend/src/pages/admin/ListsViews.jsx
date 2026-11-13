import { useCallback, useEffect, useState } from "react";
import { Loader2, Receipt, LifeBuoy, Mail, Zap } from "lucide-react";
import Seo from "../../components/Seo.jsx";
import { get, put } from "../../lib/api.js";
import { useToast } from "../../lib/ToastContext.jsx";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function useList(url, field) {
  const { showError } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await get(url);
      setRows(d[field] || []);
    } catch (e) {
      showError(e.message);
    } finally {
      setLoading(false);
    }
  }, [url, field, showError]);
  useEffect(() => {
    load();
  }, [load]);
  return { rows, setRows, loading, load };
}

function PageShell({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
          <Icon className="w-5 h-5 text-ig-purple" /> {title}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="p-6 space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 rounded-lg bg-gray-50 dark:bg-white/[0.03] animate-pulse" />
      ))}
    </div>
  );
}

function Empty({ text }) {
  return <div className="text-center py-16 text-sm text-gray-500">{text}</div>;
}

function statusBadge(status, kind = "default") {
  const base = "text-[10px] font-black uppercase px-2 py-1 rounded-md";
  if (status === "success" || status === "resolved" || status === "replied")
    return `${base} bg-emerald-500/15 text-emerald-600 dark:text-emerald-400`;
  if (status === "failed" || status === "blocked")
    return `${base} bg-red-500/15 text-red-500`;
  if (status === "pending" || status === "open" || status === "new" || status === "read")
    return `${base} bg-amber-500/15 text-amber-600 dark:text-amber-400`;
  return `${base} bg-gray-100 text-gray-500 dark:bg-white/10`;
}

export function TransactionsAdmin() {
  const { showSuccess, showError } = useToast();
  const { rows, setRows, loading } = useList("/api/admin/transactions", "transactions");

  const update = async (t, status) => {
    try {
      await put(`/api/admin/transactions/${t.id}`, { status });
      setRows((list) => list.map((x) => (x.id === t.id ? { ...x, status } : x)));
      showSuccess("Transaction updated.");
    } catch (e) {
      showError(e.message);
    }
  };

  return (
    <>
      <Seo title="Transactions | Admin" noIndex />
      <PageShell title="Transactions" subtitle="All payments across the platform." icon={Receipt}>
        <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] overflow-hidden">
          {loading ? (
            <Skeleton />
          ) : rows.length === 0 ? (
            <Empty text="No transactions yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[820px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/[0.03] text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-5 py-3 font-black">Date</th>
                    <th className="px-5 py-3 font-black">User</th>
                    <th className="px-5 py-3 font-black">Plan</th>
                    <th className="px-5 py-3 font-black">Amount</th>
                    <th className="px-5 py-3 font-black">Payment ID</th>
                    <th className="px-5 py-3 font-black">Status</th>
                    <th className="px-5 py-3 font-black text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                  {rows.map((t) => (
                    <tr key={t.id}>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">
                        {t.created_at ? new Date(t.created_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-xs truncate max-w-[160px]">{t.user_name || "—"}</p>
                        <p className="text-[11px] text-gray-500 truncate max-w-[160px]">{t.user_email || ""}</p>
                      </td>
                      <td className="px-5 py-3.5 font-bold capitalize">{t.plan_name || t.plan_code}</td>
                      <td className="px-5 py-3.5 font-bold">{inr(t.amount)}</td>
                      <td className="px-5 py-3.5 text-[11px] font-mono text-gray-500 truncate max-w-[150px]">
                        {t.payment_id || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={statusBadge(t.status)}>{t.status}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <select
                          value={t.status}
                          onChange={(e) => update(t, e.target.value)}
                          className="text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-neutral-950 px-2 py-1.5"
                        >
                          <option value="pending">pending</option>
                          <option value="success">success</option>
                          <option value="failed">failed</option>
                          <option value="refunded">refunded</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PageShell>
    </>
  );
}

export function TicketsAdmin() {
  const { showSuccess, showError } = useToast();
  const { rows, setRows, loading } = useList("/api/admin/tickets", "tickets");

  const update = async (t, status) => {
    try {
      await put(`/api/admin/tickets/${t.id}`, { status });
      setRows((list) => list.map((x) => (x.id === t.id ? { ...x, status } : x)));
      showSuccess("Ticket updated.");
    } catch (e) {
      showError(e.message);
    }
  };

  return (
    <>
      <Seo title="Tickets | Admin" noIndex />
      <PageShell title="Support Tickets" subtitle="Customer support requests." icon={LifeBuoy}>
        <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] overflow-hidden">
          {loading ? (
            <Skeleton />
          ) : rows.length === 0 ? (
            <Empty text="No tickets yet." />
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-white/[0.06]">
              {rows.map((t) => (
                <li key={t.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-sm">{t.subject}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t.user_name || "—"} ({t.user_email || "unknown"}) ·{" "}
                        {t.created_at ? new Date(t.created_at).toLocaleString() : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={statusBadge(t.status)}>{t.status}</span>
                      <select
                        value={t.status}
                        onChange={(e) => update(t, e.target.value)}
                        className="text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-neutral-950 px-2 py-1.5"
                      >
                        <option value="open">open</option>
                        <option value="pending">pending</option>
                        <option value="resolved">resolved</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-line">{t.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PageShell>
    </>
  );
}

export function ContactAdmin() {
  const { showSuccess, showError } = useToast();
  const { rows, setRows, loading } = useList("/api/admin/contact", "messages");

  const update = async (m, status) => {
    try {
      await put(`/api/admin/contact/${m.id}`, { status });
      setRows((list) => list.map((x) => (x.id === m.id ? { ...x, status } : x)));
      showSuccess("Message updated.");
    } catch (e) {
      showError(e.message);
    }
  };

  return (
    <>
      <Seo title="Contact Messages | Admin" noIndex />
      <PageShell title="Contact Messages" subtitle="Messages submitted via the contact form." icon={Mail}>
        <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] overflow-hidden">
          {loading ? (
            <Skeleton />
          ) : rows.length === 0 ? (
            <Empty text="No messages yet." />
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-white/[0.06]">
              {rows.map((m) => (
                <li key={m.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-sm">
                        {m.subject || "(no subject)"}{" "}
                        <span className="font-normal text-gray-500">— {m.name}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {m.email} · {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={statusBadge(m.status)}>{m.status}</span>
                      <select
                        value={m.status}
                        onChange={(e) => update(m, e.target.value)}
                        className="text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-neutral-950 px-2 py-1.5"
                      >
                        <option value="new">new</option>
                        <option value="read">read</option>
                        <option value="replied">replied</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{m.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PageShell>
    </>
  );
}

export function AutomationsAdmin() {
  const { rows, loading } = useList("/api/admin/automations", "automations");

  return (
    <>
      <Seo title="Automations | Admin" noIndex />
      <PageShell title="Automations" subtitle="All automations created by users." icon={Zap}>
        <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] overflow-hidden">
          {loading ? (
            <Skeleton />
          ) : rows.length === 0 ? (
            <Empty text="No automations yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/[0.03] text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-5 py-3 font-black">Owner</th>
                    <th className="px-5 py-3 font-black">Type</th>
                    <th className="px-5 py-3 font-black">Name</th>
                    <th className="px-5 py-3 font-black">Keyword</th>
                    <th className="px-5 py-3 font-black">Status</th>
                    <th className="px-5 py-3 font-black">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                  {rows.map((a) => (
                    <tr key={a.id}>
                      <td className="px-5 py-3.5 text-xs text-gray-500">{a.user_email || "—"}</td>
                      <td className="px-5 py-3.5 font-bold capitalize">{String(a.type || "").replace(/_/g, " ")}</td>
                      <td className="px-5 py-3.5 truncate max-w-[200px]">{a.name || "—"}</td>
                      <td className="px-5 py-3.5 font-mono text-xs">{a.keyword || "—"}</td>
                      <td className="px-5 py-3.5">
                        <span className={statusBadge(a.status === "active" ? "success" : "pending")}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">
                        {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PageShell>
    </>
  );
}
