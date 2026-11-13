import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { get } from "./api.js";
import { useAuth } from "./AuthContext.jsx";

// Maps dashboard routes / automation types → plan feature keys.
export const SECTION_FEATURES = {
  "dm-automation": "dm_automation",
  "post-automation": "post_comment_dm_reply",
  "reel-automation": "reel_comment_dm_reply",
  "story-automation": "story_automation",
  "live-automation": "instagram_live_automation",
  mentions: "mentions",
  "global-triggers": "global_trigger",
  "comment-moderation": "comment_moderation",
  "reply-templates": null,
  "inbox-menu": "inbox_menu",
  "convo-starter": "convo_starters",
  "suggest-more": "suggest_more",
  "welcome-message": "welcome_message",
  "super-profile": "super_profile",
  analytics: null,
  "my-plan": null,
  transactions: null,
  "account-settings": null,
  support: null,
};

const PlanContext = createContext({
  plan: null,
  features: {},
  hasFeature: () => true,
  loading: true,
  refresh: async () => {},
});

export function PlanProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [plan, setPlan] = useState(null);
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setPlan(null);
      setFeatures({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const d = await get("/api/my-plan");
      const p = d.plan || null;
      setPlan(p);
      const map = {};
      (p?.feature_items || []).forEach((f) => {
        if (f && f.key && f.enabled) map[f.key] = true;
      });
      setFeatures(map);
    } catch {
      setPlan(null);
      setFeatures({});
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasFeature = useCallback(
    (key) => {
      if (!key) return true;
      if (!plan) return false;
      return !!features[key];
    },
    [plan, features]
  );

  return (
    <PlanContext.Provider value={{ plan, features, hasFeature, loading, refresh }}>
      {children}
    </PlanContext.Provider>
  );
}

export const usePlan = () => useContext(PlanContext);
