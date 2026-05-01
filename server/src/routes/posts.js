const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { auth } = require('../middleware/auth');

function toPostResponse(postDoc) {
    return {
        _id: postDoc._id,
        content: postDoc.content,
        createdAtISO: postDoc.createdAt,
        userId: postDoc.userId,
        likes: postDoc.likes,
        likedBy: postDoc.likedBy || [],
        imageUrl: postDoc.imageUrl,
    };
}

// Get all posts
router.get('/', auth, async (req, res, next) => {
    try {
        const posts = await Post.find().populate('userId', 'name email').sort({ createdAt: -1 });
        const transformed = posts.map(toPostResponse);
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
        const payload = toPostResponse(newPost);

        const io = req.app.get('io');
        if (io) {
            io.to('community').emit('community:post_created', payload);
        }

        res.status(201).json(payload);
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
        const payload = toPostResponse(post);

        const io = req.app.get('io');
        if (io) {
            io.to('community').emit('community:post_updated', payload);
        }

        res.json(payload);
    } catch (err) {
        next(err);
    }
});

// Edit post (owner only)
router.patch('/:id', auth, async (req, res, next) => {
    try {
        const { content } = req.body;
        if (!content || !String(content).trim()) {
            return res.status(400).json({ message: 'Post content is required' });
        }

        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        if (post.userId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized to edit this post' });
        }

        post.content = String(content).trim();
        await post.save();
        await post.populate('userId', 'name email');
        const payload = toPostResponse(post);

        const io = req.app.get('io');
        if (io) {
            io.to('community').emit('community:post_updated', payload);
        }

        res.json(payload);
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

        const postId = post._id.toString();
        await post.deleteOne();

        const io = req.app.get('io');
        if (io) {
            io.to('community').emit('community:post_deleted', { _id: postId });
        }

        res.json({ message: 'Post deleted successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
