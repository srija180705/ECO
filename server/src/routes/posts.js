const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { auth } = require('../middleware/auth');

// Get all posts
router.get('/', auth, async (req, res, next) => {
    try {
        const posts = await Post.find().populate('userId', 'name email').sort({ createdAt: -1 });
        // Transform to match frontend expected format
        const transformed = posts.map(p => ({
            _id: p._id,
            content: p.content,
            createdAtISO: p.createdAt,
            userId: p.userId,
            likes: p.likes,
            likedBy: p.likedBy || [],
            imageUrl: p.imageUrl,
        }));
        res.json(transformed);
    } catch (err) {
        next(err);
    }
});

// Create post
router.post('/', auth, async (req, res, next) => {
    try {
        const { content, imageUrl } = req.body;
        const newPost = new Post({
            content,
            imageUrl,
            userId: req.user.userId
        });

        await newPost.save();
        await newPost.populate('userId', 'name email');

        res.status(201).json({
            _id: newPost._id,
            content: newPost.content,
            createdAtISO: newPost.createdAt,
            userId: newPost.userId,
            likes: newPost.likes,
            likedBy: newPost.likedBy || [],
            imageUrl: newPost.imageUrl,
        });
    } catch (err) {
        next(err);
    }
});

// Like/Unlike post
router.post('/:id/like', auth, async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const userIdStr = req.user.userId.toString();
        const likedIdx = post.likedBy.findIndex(id => id.toString() === userIdStr);

        if (likedIdx === -1) {
            post.likes += 1;
            post.likedBy.push(req.user.userId);
        } else {
            post.likes = Math.max(0, post.likes - 1);
            post.likedBy.splice(likedIdx, 1);
        }

        await post.save();
        await post.populate('userId', 'name email');

        res.json({
            _id: post._id,
            content: post.content,
            createdAtISO: post.createdAt,
            userId: post.userId,
            likes: post.likes,
            likedBy: post.likedBy || [],
            imageUrl: post.imageUrl,
        });
    } catch (err) {
        next(err);
    }
});

// Delete post
router.delete('/:id', auth, async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (post.userId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized to delete this post' });
        }

        await post.deleteOne();
        res.json({ message: 'Post deleted successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
