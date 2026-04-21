import React, { useEffect, useMemo, useState } from "react";
import { MessageSquarePlus, ThumbsUp, Send, Image as ImageIcon, X, Trash2 } from "lucide-react";
import './community.css';
import { apiFetch } from '../api.js';

const API_URL = '/api/posts';

const api = {
  listPosts: async () => {
    const token = localStorage.getItem('token');
    const res = await apiFetch(API_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to load posts");
    return res.json();
  },
  createPost: async (content, imageFile) => {
    let imageUrl = null;
    if (imageFile) {
      imageUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(imageFile);
      });
    }

    const token = localStorage.getItem('token');
    const res = await apiFetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content, imageUrl }),
    });
    if (!res.ok) throw new Error("Failed to create post");
    return res.json();
  },
  likePost: async (postId) => {
    const token = localStorage.getItem('token');
    const res = await apiFetch(`${API_URL}/${postId}/like`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      }
    });
    if (!res.ok) throw new Error("Failed to like post");
    return res.json();
  },
  deletePost: async (postId) => {
    const token = localStorage.getItem('token');
    const res = await apiFetch(`${API_URL}/${postId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      }
    });
    if (!res.ok) throw new Error("Failed to delete post");
    return res.json();
  }
};

function readStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function timeAgo(iso) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Community() {
  const me = readStoredUser();
  const refreshMe = async () => { };
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const list = await api.listPosts();
      setPosts(list);
    } catch (e) {
      setErr(e?.message || "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canPost = useMemo(() => text.trim().length > 0 || imageFile !== null, [text, imageFile]);

  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErr("Image size must be less than 10MB. Large images will be automatically compressed.");
        e.target.value = "";
        return;
      }
      setErr("");
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
  }

  const addEmoji = (emoji) => {
    setText(text + emoji);
    setShowEmojiPicker(false);
  };

  async function onCreatePost(e) {
    e.preventDefault();
    if (!canPost) return;

    setErr("");
    try {
      await api.createPost(text.trim(), imageFile);
      setText("");
      setImageFile(null);
      setImagePreview(null);
      await load();
      await refreshMe();
    } catch (e2) {
      setErr(e2?.message || "Failed to create post");
    }
  }

  async function handleLike(postId) {
    try {
      const updatedPost = await api.likePost(postId);
      setPosts((prevPosts) =>
        prevPosts.map((p) => (p._id === postId ? updatedPost : p))
      );
    } catch (error) {
      console.error("Failed to like post:", error);
    }
  }

  function isPostLiked(post) {
    if (!me?._id) return false;
    return post.likedBy?.some(
      (user) => String(user._id || user) === String(me._id)
    );
  }

  function isPostOwner(post) {
    if (!me?._id) return false;
    return String(post.userId?._id || post.userId) === String(me._id);
  }

  async function handleDelete(postId) {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      await api.deletePost(postId);
      await load();
    } catch (error) {
      console.error("Failed to delete post:", error);
      setErr(error?.message || "Failed to delete post");
    }
  }

  const emojis = ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦵", "🦿", "🦶", "👣", "👀", "👁️", "👃", "👄", "👅", "👂", "🦻", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "💗", "💓", "💞", "💕", "💖", "💘", "💝", "💟", "🔥", "✨", "⭐", "🌟", "💫", "⚡", "☀️", "🌙", "🌍", "🌎", "🌏", "🌈", "☁️", "⛅", "❄️", "🌊", "🎉", "🎊", "🎈", "🎁", "🏆", "🚀", "🌱", "🌿", "🍃", "💚", "♻️", "🌻", "🌸", "🌺", "🐘", "🦁", "🐒", "🐢", "🦋", "🐝", "🌲", "🏔️", "⛰️", "🏕️", "🚴", "🏊", "🧘", "🤝", "💡", "📚", "🎯", "⭐", "✅", "💯"];

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Community</h1>
          <div className="pageSub">Share your experiences & inspire others</div>
        </div>
      </div>

      <div className="card">
        <div className="cardTitleRow">
          <div className="cardTitle">
            <MessageSquarePlus size={18} /> Create a post
          </div>
          <div className="mutedSmall">Posting as {me?.name || "User"}</div>
        </div>

        <form onSubmit={onCreatePost} className="postForm">
          <div style={{ position: "relative" }}>
            <textarea
              className="textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share something about your volunteering journey..."
              rows={4}
            />

            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                background: "white",
                border: "1px solid #ddd",
                borderRadius: "20px",
                cursor: "pointer",
                fontSize: "18px",
                padding: "4px 8px"
              }}
            >
              😊
            </button>

            {showEmojiPicker && (
              <div style={{
                position: "absolute",
                bottom: "100%",
                right: 0,
                marginBottom: "8px",
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "8px",
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: "6px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                zIndex: 1000,
                maxHeight: "300px",
                overflowY: "auto"
              }}>
                {emojis.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => addEmoji(emoji)}
                    style={{
                      fontSize: "22px",
                      cursor: "pointer",
                      background: "none",
                      border: "none",
                      padding: "6px",
                      borderRadius: "8px",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {imagePreview && (
            <div style={{ marginTop: 12, position: "relative" }}>
              <img
                src={imagePreview}
                alt="Preview"
                style={{
                  width: "100%",
                  maxHeight: "300px",
                  objectFit: "cover",
                  borderRadius: "12px"
                }}
              />
              <button
                type="button"
                onClick={removeImage}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  background: "rgba(0,0,0,0.6)",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "white"
                }}
              >
                <X size={18} />
              </button>
            </div>
          )}

          <div className="rowBetween" style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <label
                htmlFor="image-upload"
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(15,23,42,0.1)",
                  background: "white"
                }}
              >
                <ImageIcon size={18} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Add Photo</span>
              </label>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: "none" }}
              />
              <div className="mutedSmall">{text.trim().length}/380</div>
            </div>
            <button className="primaryBtn smallBtn" disabled={!canPost} type="submit">
              <Send size={16} />
              Post
            </button>
          </div>
          {err ? <div className="errorText">{err}</div> : null}
        </form>
      </div>

      <div className="sectionTitle" style={{ marginTop: 18 }}>
        Recent posts
      </div>

      {loading ? (
        <div className="mutedSmall" style={{ marginTop: 10 }}>
          Loading posts...
        </div>
      ) : (
        <div className="grid1" style={{ marginTop: 12 }}>
          {posts.map((p) => (
            <div key={p._id || p.id} className="card">
              <div className="rowBetween">
                <div className="row" style={{ gap: 10 }}>
                  <div className="avatarSmall">🙂</div>
                  <div>
                    <div className="bold">{p.userId?.name || p.user?.name || "Volunteer"}</div>
                    <div className="mutedSmall">{timeAgo(p.createdAtISO)}</div>
                  </div>
                </div>

                {isPostOwner(p) && (
                  <button
                    type="button"
                    onClick={() => handleDelete(p._id || p.id)}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(185, 28, 28, 0.2)",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      cursor: "pointer",
                      color: "#b91c1c",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "14px",
                      fontWeight: 600
                    }}
                    title="Delete post"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                )}
              </div>

              <div style={{ marginTop: 12, fontSize: 16, lineHeight: 1.5 }}>
                {p.content}
              </div>

              {p.imageUrl && (
                <div style={{ marginTop: 12 }}>
                  <img
                    src={p.imageUrl}
                    alt="Post"
                    style={{
                      width: "100%",
                      maxHeight: "400px",
                      objectFit: "cover",
                      borderRadius: "12px"
                    }}
                  />
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="pillBtn"
                  onClick={() => handleLike(p._id || p.id)}
                  style={{
                    background: isPostLiked(p) ? "#eafaf3" : "white",
                    color: isPostLiked(p) ? "#067a54" : "inherit"
                  }}
                >
                  <ThumbsUp size={16} fill={isPostLiked(p) ? "#067a54" : "none"} />{" "}
                  {p.likes || 0}
                </button>
              </div>
            </div>
          ))}

          {posts.length === 0 ? (
            <div className="mutedSmall">No posts yet. Create the first one!</div>
          ) : null}
        </div>
      )}
    </div>
  );
}