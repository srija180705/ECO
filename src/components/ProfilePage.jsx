import React, { useState, useEffect } from "react";
import Loader from "./Loader";
import "../styles/profile.css";

import defaultAvatar from "../assets/avatars/user.png";
import plant from "../assets/avatars/avatar_1.png";
import cactus from "../assets/avatars/avatar_2.png";

const avatars = [defaultAvatar, plant, cactus];

const ProfilePage = () => {

  const defaultData = {
    name: "",
    dob: "",
    phone: "",
    email: "",
    location: "",
    AlternateEmail: "",
    AlternatePhone: "",
    Points: "",
    Badges: ""
    
  };

  const [profile, setProfile] = useState(defaultData);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const [avatar, setAvatar] = useState(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {

    const savedProfile = localStorage.getItem("ecoProfile");
    const savedAvatar = localStorage.getItem("ecoAvatar");

    if(savedProfile){
      setProfile(JSON.parse(savedProfile));
    }

    if(savedAvatar){
      setAvatar(savedAvatar);
    }

    setTimeout(()=>{
      setLoading(false);
    },2000);

  },[]);

  const handleChange = (e) => {

    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });

  };

  const saveProfile = () => {

    localStorage.setItem("ecoProfile", JSON.stringify(profile));
    setEditMode(false);

  };

  const selectAvatar = (img) => {

    setAvatar(img);
    localStorage.setItem("ecoAvatar", img);
    setShowAvatarPicker(false);

  };

  if(loading){
    return <Loader/>
  }

  return (

    <div className="profile-page">

      <h1 className="title">🌿 E-Volunteer Profile</h1>

      {/* Avatar Section */}

      <div className="avatar-section">

        <div
          className="avatar-circle"
          onClick={() => setShowAvatarPicker(!showAvatarPicker)}
        >
          <img src={avatar || defaultAvatar} alt="avatar"/>
        </div>

        {showAvatarPicker && (

          <div className="avatar-picker">

            {avatars.map((img,index)=>(
              <img
                key={index}
                src={img}
                className="avatar-option"
                onClick={()=>selectAvatar(img)}
              />
            ))}

          </div>

        )}

      </div>

      {/* Buttons */}

      <div className="buttons">

          <button
             className="edit-btn"
           onClick={() => setEditMode(true)}
  >
         ✏️ Edit Profile
          </button>

        {editMode && (
          <button
      className="save-btn"
      onClick={saveProfile}
    >
      💾 Save Changes
         </button>
  )}

</div>

      {/* Profile Fields */}

      <div className="profile-container">

        {Object.keys(profile).map((field)=> (

          <div className="field" key={field}>

            <label>{field}</label>

            <input
              type="text"
              name={field}
              value={profile[field]}
              disabled={!editMode}
              onChange={handleChange}
            />

          </div>

        ))}

      </div>

    </div>
  );

};

export default ProfilePage;