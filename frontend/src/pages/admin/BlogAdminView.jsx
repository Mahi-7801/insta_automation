import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2, Save, Eye, EyeOff } from "lucide-react";
import Seo from "../../components/Seo.jsx";
import { get, post, put, del } from "../../lib/api.js";
import { uploadFile } from "../../lib/api.js";
import { useToast } from "../../lib/ToastContext.jsx";

const EMPTY = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  category: "Instagram Automation",
  cover_image: "",
  featured: false,
  status: "published",
};

export default function BlogAdminView() {
  const { showSuccess, showError } = useToast();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const editorRef = useRef(null);
  const initializedRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await get("/api/admin/blog");
      setPosts(d.posts || []);
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
    initializedRef.current = false;
  };

  const openEdit = (p) => {
    setForm({ ...EMPTY, ...p, featured: !!p.featured });
    setModal(p);
    initializedRef.current = false;
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form };
      if (modal && modal.id) {
        await put(`/api/admin/blog/${modal.id}`, payload);
        showSuccess("Post updated.");
      } else {
        await post("/api/admin/blog", payload);
        showSuccess("Post created.");
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
    if (!window.confirm(`Delete "${p.title}"?`)) return;
    setDeleting(p.id);
    try {
      await del(`/api/admin/blog/${p.id}`);
      setPosts((list) => list.filter((x) => x.id !== p.id));
      showSuccess("Post deleted.");
    } catch (e) {
      showError(e.message);
    } finally {
      setDeleting(null);
    }
  };

  const togglePublish = async (p) => {
    try {
      await put(`/api/admin/blog/${p.id}`, { status: p.status === "published" ? "draft" : "published" });
      setPosts((list) => list.map((x) => (x.id === p.id ? { ...x, status: x.status === "published" ? "draft" : "published" } : x)));
      showSuccess("Status updated.");
    } catch (e) {
      showError(e.message);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  return (
    <div className="space-y-5">
      <Seo title="Blog | Admin" noIndex />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black">Blog Posts</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Create and manage playbooks shown on /blog.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#405DE6] to-[#833AB4] text-white font-bold text-sm shadow-md shadow-purple-500/20"
        >
          <Plus className="w-4 h-4" /> New Post
        </button>
      </div>

      <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-50 dark:bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-500">No posts yet.</div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/[0.06]">
            {posts.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate">{p.title}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    /blog/{p.slug} · {p.category}
                    {p.featured ? " · featured" : ""}
                  </p>
                </div>
                <span
                  className={`hidden sm:inline text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                    p.status === "published"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-gray-100 text-gray-500 dark:bg-white/10"
                  }`}
                >
                  {p.status}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => togglePublish(p)}
                    title={p.status === "published" ? "Unpublish" : "Publish"}
                    className="p-2 rounded-lg text-gray-400 hover:text-ig-purple hover:bg-purple-50 dark:hover:bg-purple-950/30"
                  >
                    {p.status === "published" ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
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
                    {deleting === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#141416] border border-gray-200 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/[0.07] sticky top-0 bg-white dark:bg-[#141416] z-10">
              <h3 className="font-black">{modal.id ? "Edit" : "Create"} Post</h3>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Title</label>
                  <input value={form.title} onChange={set("title")} className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 px-3.5 py-3 bg-white dark:bg-neutral-950" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Slug</label>
                  <input value={form.slug} onChange={set("slug")} placeholder="my-post-slug" className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 px-3.5 py-3 bg-white dark:bg-neutral-950 font-mono" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Excerpt</label>
                <textarea value={form.excerpt} onChange={set("excerpt")} rows={2} className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 px-3.5 py-3 bg-white dark:bg-neutral-950 resize-y" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Content</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { label: "B", title: "Bold", cmd: "bold" },
                    { label: "I", title: "Italic", cmd: "italic" },
                    { label: "U", title: "Underline", cmd: "underline" },
                    { label: "H2", title: "Heading 2", cmd: "formatBlock", val: "h2" },
                    { label: "H3", title: "Heading 3", cmd: "formatBlock", val: "h3" },
                    { label: "• List", title: "Bullet list", cmd: "insertUnorderedList" },
                    { label: "1. List", title: "Numbered list", cmd: "insertOrderedList" },
                    { label: "¶", title: "Paragraph", cmd: "formatBlock", val: "p" },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      title={btn.title}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (btn.val) document.execCommand(btn.cmd, false, btn.val);
                        else document.execCommand(btn.cmd, false, null);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-gray-300 dark:border-neutral-700 text-xs font-bold hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  ref={(el) => {
                    editorRef.current = el;
                    if (el && !initializedRef.current) {
                      el.innerHTML = form.content || "";
                      initializedRef.current = true;
                    }
                  }}
                  onInput={(e) => { const el = e.currentTarget; if (el) setForm((f) => ({ ...f, content: el.innerHTML })); }}
                  className="w-full min-h-[200px] rounded-xl border border-gray-300 dark:border-neutral-700 px-3.5 py-3 bg-white dark:bg-neutral-950 prose prose-sm dark:prose-invert max-w-none focus:outline-none focus:border-ig-purple"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Category</label>
                  <input value={form.category} onChange={set("category")} className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 px-3.5 py-3 bg-white dark:bg-neutral-950" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Cover Image</label>
                  <div className="flex items-center gap-3">
                    {form.cover_image && (
                      <img src={form.cover_image} alt="" className="w-16 h-16 rounded-xl object-cover border border-gray-200 dark:border-white/10" />
                    )}
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-neutral-700 text-sm font-bold cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.05]">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      {uploading ? "Uploading…" : "Upload image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={async (e) => {
                          const file = e.target.files && e.target.files[0];
                          if (!file) return;
                          setUploading(true);
                          try {
                            const d = await uploadFile(file);
                            setForm((f) => ({ ...f, cover_image: d.url }));
                            showSuccess("Image uploaded.");
                          } catch (err) {
                            showError(err.message);
                          } finally {
                            setUploading(false);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                    {form.cover_image && (
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, cover_image: "" }))}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={form.featured} onChange={set("featured")} className="rounded accent-purple-600" />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={form.status === "published"}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.checked ? "published" : "draft" }))}
                    className="rounded accent-purple-600"
                  />
                  Published
                </label>
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
                  {modal.id ? "Save Changes" : "Create Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
