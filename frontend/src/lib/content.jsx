import { createContext, useContext, useEffect, useState } from "react";
import {
  Bot,
  Users,
  BarChart3,
  Link2,
  MessageCircle,
  Image as ImageIcon,
  Layers,
  Zap,
  Shield,
  Send,
  Share2,
  Radio,
  Eye,
  Type,
  MousePointerClick,
  Home as HomeIcon,
  Rocket,
  Settings,
  Sparkles,
  LayoutTemplate,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  LifeBuoy,
} from "lucide-react";
import { get } from "./api.js";

// Registry so API content can reference icons by name.
const ICONS = {
  Bot, Users, BarChart3, Link2, MessageCircle, Image: ImageIcon, ImageIcon, Layers, Zap,
  Shield, Send, Share2, Radio, Eye, Type, MousePointerClick, Home: HomeIcon, HomeIcon,
  Rocket, Settings, Sparkles, LayoutTemplate, TrendingUp, ShieldCheck, CreditCard, LifeBuoy,
};

export function resolveIcon(name) {
  if (!name) return null;
  if (typeof name !== "string") return name;
  return ICONS[name] || null;
}

const ContentContext = createContext({ content: {}, loading: true });

export function ContentProvider({ children }) {
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await get("/api/content");
        if (alive) setContent((data && data.content) || {});
      } catch {
        if (alive) setContent({});
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return <ContentContext.Provider value={{ content, loading }}>{children}</ContentContext.Provider>;
}

export function useContent(key) {
  const { content, loading } = useContext(ContentContext);
  return { value: key ? content[key] : content, loading };
}
