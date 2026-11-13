import { useEffect, useState } from "react";
import { X, ShieldCheck, Loader2, CheckCircle2, CreditCard, Smartphone } from "lucide-react";
import { post, get } from "../lib/api.js";
import { useToast } from "../lib/ToastContext.jsx";
import { useAuth } from "../lib/AuthContext.jsx";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/**
 * Demo checkout modal.
 * - demo mode: simulates a gateway and upgrades the plan immediately.
 * - live mode: loads Razorpay checkout.js with the configured key id and
 *   sends the signature back to /api/payments/verify for HMAC validation.
 */
export default function CheckoutModal({ plan, cycle = "monthly", open, onClose, onSuccess }) {
  const { showSuccess, showError } = useToast();
  const { refresh } = useAuth();
  const [config, setConfig] = useState(null);
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const price = cycle === "yearly" ? plan?.price_yearly_inr : plan?.price_monthly_inr;

  useEffect(() => {
    if (!open) {
      setCreating(false);
      setPaying(false);
      setDone(false);
      setError(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const c = await get("/api/payments/config");
        if (alive) setConfig(c);
      } catch (e) {
        if (alive) setError(e.message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open]);

  if (!open || !plan) return null;

  const startPayment = async () => {
    setCreating(true);
    setError(null);
    try {
      const order = await post("/api/payments/create-order", {
        plan_code: plan.plan_code,
        cycle,
      });
      if (order.mode === "live" && order.key_id && window.Razorpay) {
        setCreating(false);
        setPaying(true);
        const rzp = new window.Razorpay({
          key: order.key_id,
          amount: order.amount * 100,
          currency: order.currency,
          name: "DM Panda",
          description: `${order.plan_name} (${order.cycle})`,
          order_id: order.order_id,
          prefill: { email: "" },
          theme: { color: "#833AB4" },
          handler: async (resp) => {
            try {
              const v = await post("/api/payments/verify", {
                order_id: order.order_id,
                payment_id: resp.razorpay_payment_id,
                signature: resp.razorpay_signature,
              });
              finish(v);
            } catch (e) {
              showError(e.message);
              setPaying(false);
            }
          },
          modal: { ondismiss: () => setPaying(false) },
        });
        rzp.open();
        return;
      }

      // Demo mode — simulate the gateway with a short processing delay.
      setCreating(false);
      setPaying(true);
      await new Promise((r) => setTimeout(r, 1400));
      const v = await post("/api/payments/verify", {
        order_id: order.order_id,
        payment_id: "pay_demo_" + Math.random().toString(36).slice(2, 12),
      });
      finish(v);
    } catch (e) {
      setCreating(false);
      setPaying(false);
      setError(e.message);
      showError(e.message);
    }
  };

  const finish = async (result) => {
    setPaying(false);
    setDone(true);
    showSuccess(result.message || "Payment successful!");
    try {
      await refresh();
    } catch {}
    if (onSuccess) onSuccess(result);
    setTimeout(() => {
      onClose();
    }, 1600);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#141416] border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.07]">
          <div className="flex items-center gap-2">
            <img src="/images/logo-96.webp" alt="" className="h-7 w-auto" />
            <div>
              <p className="font-black text-sm leading-tight">DM Panda Checkout</p>
              <p className="text-[11px] text-gray-500 capitalize">{config?.mode === "live" ? "Secure payment" : "Demo payment"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {done ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500 mb-4" />
              <h3 className="font-black text-lg mb-1">Payment Successful!</h3>
              <p className="text-sm text-gray-500">Your {plan.name} is now active.</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] p-4 mb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black">{plan.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{cycle} billing · per Instagram account</p>
                  </div>
                  <p className="text-2xl font-black">{inr(price)}</p>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500 mb-4 text-center">{error}</p>
              )}

              <button
                onClick={startPayment}
                disabled={creating || paying}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-70"
              >
                {creating || paying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {creating ? "Preparing order..." : "Processing payment..."}
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" /> Pay {inr(price)}
                  </>
                )}
              </button>

              <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 256-bit SSL
                </span>
                <span className="flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5" /> UPI · Cards · Netbanking
                </span>
              </div>
              {config?.mode !== "live" && (
                <p className="mt-4 text-[11px] text-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg py-2 px-3">
                  Demo mode — no real charge. Add your payment keys in Admin → Settings to go live.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
