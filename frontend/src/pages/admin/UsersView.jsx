import { useCallback, useEffect, useState } from "react";
import { Search, Loader2, ShieldCheck, ShieldAlert, Trash2, Ban, CheckCircle2 } from "lucide-react";
import Seo from "../../components/Seo.jsx";
import { get, put, del } from "../../lib/api.js";
import { useToast } from "../../lib/ToastContext.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";

const PLAN_OPTIONS = ["free", "basic", "pro"];

export default function UsersView() {
  const { showSuccess, showError } = useToast();
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const d = await get(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      setUsers(d.users || []);
    } catch (e) {
      showError(e.message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (u, patch) => {
    setBusyId(u.id);
    try {
      const d = await put(`/api/admin/users/${u.id}`, patch);
      if (d.user) setUsers((list) => list.map((x) => (x.id === u.id ? d.user : x)));
      showSuccess("User updated.");
    } catch (e) {
      showError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.email}? This permanently removes their data.`)) return;
    setDeleting(u.id);
    try {
      await del(`/api/admin/users/${u.id}`);
      setUsers((list) => list.filter((x) => x.id !== u.id));
      showSuccess("User deleted.");
    } catch (e) {
      showError(e.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-5">
      <Seo title="Users | Admin" noIndex />
      <div>
        <h1 className="text-xl sm:text-2xl font-black">Users</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Search, upgrade, block, or delete accounts.</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              load(e.target.value);
            }}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] focus:outline-none focus:border-ig-purple focus:ring-2 focus:ring-ig-purple/15"
          />
        </div>
        <span className="text-xs text-gray-500 shrink-0">{users.length} user(s)</span>
      </div>

      <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-gray-50 dark:bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-500">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/[0.03] text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3 font-black">User</th>
                  <th className="px-5 py-3 font-black">Role</th>
                  <th className="px-5 py-3 font-black">Plan</th>
                  <th className="px-5 py-3 font-black">Status</th>
                  <th className="px-5 py-3 font-black">Joined</th>
                  <th className="px-5 py-3 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                {users.map((u) => {
                  const isSelf = me && u.id === me.id;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#405DE6] to-[#833AB4] text-white text-xs font-black flex items-center justify-center shrink-0">
                            {(u.name || u.email || "U").charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold truncate">{u.name || "—"}</p>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                            u.role === "admin"
                              ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                              : "bg-gray-100 text-gray-500 dark:bg-white/10"
                          }`}
                        >
                          {u.role === "admin" ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          value={u.plan_code}
                          disabled={busyId === u.id || isSelf}
                          onChange={(e) => update(u, { plan_code: e.target.value })}
                          className="text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-neutral-950 px-2 py-1.5 disabled:opacity-50"
                        >
                          {PLAN_OPTIONS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          value={u.status}
                          disabled={busyId === u.id || isSelf}
                          onChange={(e) => update(u, { status: e.target.value })}
                          className="text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-neutral-950 px-2 py-1.5 disabled:opacity-50"
                        >
                          <option value="active">active</option>
                          <option value="blocked">blocked</option>
                          <option value="deleted">deleted</option>
                        </select>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          {u.status !== "active" && !isSelf && (
                            <button
                              onClick={() => update(u, { status: "active" })}
                              title="Activate"
                              className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {u.status === "active" && !isSelf && (
                            <button
                              onClick={() => update(u, { status: "blocked" })}
                              title="Block"
                              className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          {!isSelf && (
                            <button
                              onClick={() => remove(u)}
                              disabled={deleting === u.id}
                              title="Delete"
                              className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                            >
                              {deleting === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          )}
                          {isSelf && <span className="text-[10px] text-gray-400 px-2">you</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
