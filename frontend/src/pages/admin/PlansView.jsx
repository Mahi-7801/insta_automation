import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2, Save } from "lucide-react";
import Seo from "../../components/Seo.jsx";
import { get, post, put, del } from "../../lib/api.js";
import { useToast } from "../../lib/ToastContext.jsx";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const EMPTY = {
  plan_code: "",
  name: "",
  display_order: 99,
  button_text: "Choose Plan",
  is_popular: false,
  is_custom: false,
  price_monthly_inr: 0,
  price_yearly_inr: 0,
  price_yearly_monthly_inr: 0,
  actions_per_hour_limit: "100",
  actions_per_day_limit: "100",
  actions_per_month_limit: "1000",
  feature_items: [],
  comparison: [],
};

export default function PlansView() {
  const { showSuccess, showError } = useToast();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | {} | plan
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await get("/api/admin/plans");
      setPlans(d.plans || []);
    } catch (e) {
      showError(e.message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm({ ...EMPTY });
    setModal({});
  };

  const openEdit = (p) => {
    setForm({
      ...EMPTY,
      ...p,
      is_popular: !!p.is_popular,
      is_custom: !!p.is_custom,
      feature_items: Array.isArray(p.feature_items) ? p.feature_items : (typeof p.feature_items === "string" ? JSON.parse(p.feature_items || "[]") : []),
      comparison: Array.isArray(p.comparison) ? p.comparison : (typeof p.comparison === "string" ? JSON.parse(p.comparison || "[]") : []),
    });
    setModal(p);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        display_order: Number(form.display_order) || 0,
        price_monthly_inr: Number(form.price_monthly_inr) || 0,
        price_yearly_inr: Number(form.price_yearly_inr) || 0,
        price_yearly_monthly_inr: Number(form.price_yearly_monthly_inr) || 0,
        feature_items: form.feature_items || [],
        comparison: form.comparison || [],
      };
      if (modal && modal.id) {
        await put(`/api/admin/plans/${modal.id}`, payload);
        showSuccess("Plan updated.");
      } else {
        await post("/api/admin/plans", payload);
        showSuccess("Plan created.");
      }
      setModal(null);
      load();
    } catch (err) {
      showError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete plan "${p.name}"?`)) return;
    setDeleting(p.id);
    try {
      await del(`/api/admin/plans/${p.id}`);
      showSuccess("Plan deleted.");
      load();
    } catch (e) {
      showError(e.message);
    } finally {
      setDeleting(null);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  return (
    <div className="space-y-5">
      <Seo title="Plans | Admin" noIndex />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black">Plans & Pricing</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Edit prices, limits, and feature entitlements.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#405DE6] to-[#833AB4] text-white font-bold text-sm shadow-md shadow-purple-500/20"
        >
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-50 dark:bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/[0.03] text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3 font-black">Plan</th>
                  <th className="px-5 py-3 font-black">Monthly</th>
                  <th className="px-5 py-3 font-black">Yearly</th>
                  <th className="px-5 py-3 font-black">Limits (H/D/M)</th>
                  <th className="px-5 py-3 font-black">Popular</th>
                  <th className="px-5 py-3 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                {plans.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <p className="font-black">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.plan_code}</p>
                    </td>
                    <td className="px-5 py-4 font-bold">{p.plan_code === "free" ? "Free" : inr(p.price_monthly_inr)}</td>
                    <td className="px-5 py-4 font-bold">{p.plan_code === "free" ? "—" : `${inr(p.price_yearly_inr)}/yr`}</td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {p.actions_per_hour_limit} / {p.actions_per_day_limit} / {p.actions_per_month_limit}
                    </td>
                    <td className="px-5 py-4">
                      {p.is_popular ? (
                        <span className="text-[10px] font-black uppercase bg-purple-500/15 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-md">
                          popular
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          title="Edit"
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => remove(p)}
                          disabled={deleting === p.id}
                          title="Delete"
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#141416] border border-gray-200 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/[0.07] sticky top-0 bg-white dark:bg-[#141416] z-10">
              <h3 className="font-black">{modal.id ? "Edit" : "Create"} Plan</h3>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Plan Code</label>
                  <input
                    value={form.plan_code}
                    onChange={set("plan_code")}
                    disabled={!!modal.id}
                    placeholder="starter"
                    className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 px-3.5 py-3 bg-white dark:bg-neutral-950 focus:outline-none focus:border-ig-purple disabled:bg-gray-50 disabled:text-gray-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Name</label>
                  <input value={form.name} onChange={set("name")} className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 px-3.5 py-3 bg-white dark:bg-neutral-950 focus:outline-none focus:border-ig-purple" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Monthly Price (INR)</label>
                  <input type="number" value={form.price_monthly_inr} onChange={set("price_monthly_inr")} className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 px-3.5 py-3 bg-white dark:bg-neutral-950" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Yearly Price (INR)</label>
                  <input type="number" value={form.price_yearly_inr} onChange={set("price_yearly_inr")} className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 px-3.5 py-3 bg-white dark:bg-neutral-950" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Yearly /month display (INR)</label>
                  <input type="number" value={form.price_yearly_monthly_inr} onChange={set("price_yearly_monthly_inr")} className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 px-3.5 py-3 bg-white dark:bg-neutral-950" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Display Order</label>
                  <input type="number" value={form.display_order} onChange={set("display_order")} className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 px-3.5 py-3 bg-white dark:bg-neutral-950" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Hourly Limit</label>
                  <input value={form.actions_per_hour_limit} onChange={set("actions_per_hour_limit")} className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 px-3.5 py-3 bg-white dark:bg-neutral-950" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Daily Limit</label>
                  <input value={form.actions_per_day_limit} onChange={set("actions_per_day_limit")} className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 px-3.5 py-3 bg-white dark:bg-neutral-950" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Monthly Limit</label>
                  <input value={form.actions_per_month_limit} onChange={set("actions_per_month_limit")} className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 px-3.5 py-3 bg-white dark:bg-neutral-950" />
                </div>
                <div className="flex items-end gap-4 pb-2">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={form.is_popular} onChange={set("is_popular")} className="rounded accent-purple-600" />
                    Popular
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={form.is_custom} onChange={set("is_custom")} className="rounded accent-purple-600" />
                    Custom
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold">Feature Items</label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        feature_items: [...(f.feature_items || []), { key: "", label: "", enabled: true }],
                      }))
                    }
                    className="text-xs font-bold text-ig-purple hover:underline"
                  >
                    + Add feature
                  </button>
                </div>
                <div className="space-y-2">
                  {(form.feature_items || []).map((fi, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!fi.enabled}
                        onChange={(e) => {
                          const next = [...form.feature_items];
                          next[i] = { ...next[i], enabled: e.target.checked };
                          setForm((f) => ({ ...f, feature_items: next }));
                        }}
                        className="rounded accent-purple-600"
                      />
                      <input
                        value={fi.key || ""}
                        onChange={(e) => {
                          const next = [...form.feature_items];
                          next[i] = { ...next[i], key: e.target.value };
                          setForm((f) => ({ ...f, feature_items: next }));
                        }}
                        placeholder="key"
                        className="w-32 text-xs font-mono rounded-lg border border-gray-300 dark:border-neutral-700 px-2.5 py-2 bg-white dark:bg-neutral-950"
                      />
                      <input
                        value={fi.label || ""}
                        onChange={(e) => {
                          const next = [...form.feature_items];
                          next[i] = { ...next[i], label: e.target.value };
                          setForm((f) => ({ ...f, feature_items: next }));
                        }}
                        placeholder="label"
                        className="flex-1 text-xs rounded-lg border border-gray-300 dark:border-neutral-700 px-2.5 py-2 bg-white dark:bg-neutral-950"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = form.feature_items.filter((_, j) => j !== i);
                          setForm((f) => ({ ...f, feature_items: next }));
                        }}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {(!form.feature_items || form.feature_items.length === 0) && (
                    <p className="text-xs text-gray-400 italic">No features. Click “+ Add feature”.</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold">Comparison Rows</label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        comparison: [...(f.comparison || []), { feature: "", free: false, basic: false, pro: false }],
                      }))
                    }
                    className="text-xs font-bold text-ig-purple hover:underline"
                  >
                    + Add row
                  </button>
                </div>
                <div className="space-y-2">
                  {(form.comparison || []).map((c, i) => (
                    <div key={i} className="flex items-center gap-2 flex-wrap">
                      <input
                        value={c.feature || c.key || ""}
                        onChange={(e) => {
                          const next = [...form.comparison];
                          next[i] = { ...next[i], feature: e.target.value };
                          setForm((f) => ({ ...f, comparison: next }));
                        }}
                        placeholder="feature name"
                        className="flex-1 min-w-[160px] text-xs rounded-lg border border-gray-300 dark:border-neutral-700 px-2.5 py-2 bg-white dark:bg-neutral-950"
                      />
                      {["free", "basic", "pro"].map((tier) => (
                        <label key={tier} className="flex items-center gap-1 text-[11px] font-semibold capitalize">
                          <input
                            type="checkbox"
                            checked={!!c[tier]}
                            onChange={(e) => {
                              const next = [...form.comparison];
                              next[i] = { ...next[i], [tier]: e.target.checked };
                              setForm((f) => ({ ...f, comparison: next }));
                            }}
                            className="rounded accent-purple-600"
                          />
                          {tier}
                        </label>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const next = form.comparison.filter((_, j) => j !== i);
                          setForm((f) => ({ ...f, comparison: next }));
                        }}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {(!form.comparison || form.comparison.length === 0) && (
                    <p className="text-xs text-gray-400 italic">No rows. Click “+ Add row”.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-white/15 font-bold text-sm">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {modal.id ? "Save Changes" : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
