import { useState, useEffect } from "react";
import Loader from "./Loader";
import "../styles/profile.css";
import { apiFetch } from "../api.js";

import defaultAvatar from "../assets/avatars/user.png";
import plant from "../assets/avatars/avatar_1.png";
import cactus from "../assets/avatars/avatar_2.png";

const avatars = [defaultAvatar, plant, cactus];

const ProfilePage = () => {

  const defaultData = {
    name: "",
    email: "",
    role: "volunteer",
    location: "",
    interests: "",
    points: "0",
    badges: ""
  };

  const [profile, setProfile] = useState(defaultData);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [error, setError] = useState(null);

  const [avatar, setAvatar] = useState(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    const savedProfile = localStorage.getItem("ecoProfile");
    const savedAvatar = localStorage.getItem("ecoAvatar");

    const token = localStorage.getItem('token');
    if (!token) {
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }
      if (savedAvatar) {
        setAvatar(savedAvatar);
      }
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        const response = await apiFetch('/api/users/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error('Unable to load profile from backend');
        }
        const data = await response.json();
        setUserId(data._id);
        const loadedProfile = {
          name: data.name || '',
          email: data.email || '',
          role: data.role || 'volunteer',
          location: data.city || '',
          interests: Array.isArray(data.interests) ? data.interests.join(', ') : (data.interests || ''),
          points: typeof data.points === 'number' ? String(data.points) : '0',
          badges: Array.isArray(data.badges) ? data.badges.join(', ') : (data.badges || ''),
        };
        setProfile(loadedProfile);
        localStorage.setItem('ecoProfile', JSON.stringify(loadedProfile));
      } catch {
        if (savedProfile) {
          setProfile(JSON.parse(savedProfile));
        }
      } finally {
        if (savedAvatar) {
          setAvatar(savedAvatar);
        }
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleChange = (e) => {

    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });

  };

  const saveProfile = async () => {
    setSaveStatus('');
    setError(null);

    const token = localStorage.getItem('token');
    const patchData = {};

    if (profile.name) patchData.name = profile.name;
    if (profile.location) patchData.city = profile.location;
    if (profile.interests !== undefined) {
      patchData.interests = profile.interests
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (token && userId) {
      try {
        const response = await apiFetch(`/api/users/${userId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(patchData),
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.message || 'Unable to save profile to backend');
        }
        setSaveStatus('Profile saved to backend');
      } catch (err) {
        setError(err.message || 'Unable to save profile to backend');
      }
    } else {
      setSaveStatus('Profile saved locally');
    }

    localStorage.setItem('ecoProfile', JSON.stringify(profile));
    setEditMode(false);
  };

  const selectAvatar = (img) => {

    setAvatar(img);
    localStorage.setItem("ecoAvatar", img);
    setShowAvatarPicker(false);

  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="profile-page-wrapper">
      <div className="profile-status-container">
        {saveStatus && <div className="profile-success">{saveStatus}</div>}
        {error && <div className="profile-error">{error}</div>}
      </div>

      <div className="profile-page">
        <h1 className="title">🌿 E-Volunteer Profile</h1>

        {/* Avatar Section */}
        <div className="avatar-section">
          <div
            className="avatar-circle"
            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
          >
            <img src={avatar || defaultAvatar} alt="avatar" />
          </div>

          {showAvatarPicker && (
            <div className="avatar-picker">
              {avatars.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  className="avatar-option"
                  onClick={() => selectAvatar(img)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="buttons">
          <button className="edit-btn" onClick={() => setEditMode(true)}>
            ✏️ Edit Profile
          </button>
          {editMode && (
            <button className="save-btn" onClick={saveProfile}>
              💾 Save Changes
            </button>
          )}
        </div>

        {/* Profile Fields */}
        <div className="profile-container">
          {[
            { key: 'name', label: 'Full Name', editable: true },
            { key: 'email', label: 'Email', editable: false },
            { key: 'role', label: 'Role', editable: false },
            { key: 'location', label: 'City', editable: true },
            { key: 'interests', label: 'Interests', editable: true, placeholder: 'e.g. cleanup, planting' },
          ].map(({ key, label, editable, placeholder }) => (
            <div className="field" key={key}>
              <label>{label}</label>
              <input
                type="text"
                name={key}
                value={profile[key]}
                disabled={!editMode || !editable}
                placeholder={placeholder || ''}
                onChange={handleChange}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
