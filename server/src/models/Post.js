const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
    {
        content: { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        imageUrl: { type: String, default: null },
        likes: { type: Number, default: 0 },
        likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
    },
    { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);
