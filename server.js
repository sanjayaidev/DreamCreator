const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// ===== FIX: Serve admin.html at root =====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'admin.html'));
});

// Admin authentication middleware
const adminAuth = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token || token !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// ==================== ADMIN ROUTES ====================

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        res.json({ success: true, token: password });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// Get all prompts (with pagination and filters)
app.get('/api/admin/prompts', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', category = '' } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT * FROM prompts WHERE 1=1';
        const params = [];
        let paramCount = 1;
        
        if (search) {
            query += ` AND (headline ILIKE $${paramCount} OR description ILIKE $${paramCount} OR full_prompt ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }
        
        if (category) {
            query += ` AND category = $${paramCount}`;
            params.push(category);
            paramCount++;
        }
        
        query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM prompts WHERE 1=1';
        const countParams = [];
        let countParamCount = 1;
        
        if (search) {
            countQuery += ` AND (headline ILIKE $${countParamCount} OR description ILIKE $${countParamCount} OR full_prompt ILIKE $${countParamCount})`;
            countParams.push(`%${search}%`);
            countParamCount++;
        }
        
        if (category) {
            countQuery += ` AND category = $${countParamCount}`;
            countParams.push(category);
        }
        
        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        
        res.json({
            prompts: result.rows,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error fetching prompts:', error);
        res.status(500).json({ error: 'Failed to fetch prompts' });
    }
});

// Get single prompt
app.get('/api/admin/prompts/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM prompts WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Prompt not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching prompt:', error);
        res.status(500).json({ error: 'Failed to fetch prompt' });
    }
});

// Create new prompt
app.post('/api/admin/prompts', adminAuth, async (req, res) => {
    try {
        const { 
            headline, 
            description, 
            full_prompt, 
            category, 
            sub_category, 
            tags, 
            demo_image_url, 
            max_images_allowed,
            is_active 
        } = req.body;
        
        const result = await pool.query(
            `INSERT INTO prompts 
             (headline, description, full_prompt, category, sub_category, tags, demo_image_url, max_images_allowed, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
             RETURNING *`,
            [headline, description, full_prompt, category, sub_category, tags || [], demo_image_url, max_images_allowed || 1, is_active !== undefined ? is_active : true]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating prompt:', error);
        res.status(500).json({ error: 'Failed to create prompt' });
    }
});

// Update prompt
app.put('/api/admin/prompts/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            headline, 
            description, 
            full_prompt, 
            category, 
            sub_category, 
            tags, 
            demo_image_url, 
            max_images_allowed,
            is_active 
        } = req.body;
        
        const result = await pool.query(
            `UPDATE prompts SET 
                headline = $1, 
                description = $2, 
                full_prompt = $3, 
                category = $4, 
                sub_category = $5, 
                tags = $6, 
                demo_image_url = $7, 
                max_images_allowed = $8,
                is_active = $9,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $10 
             RETURNING *`,
            [headline, description, full_prompt, category, sub_category, tags || [], demo_image_url, max_images_allowed || 1, is_active !== undefined ? is_active : true, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Prompt not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating prompt:', error);
        res.status(500).json({ error: 'Failed to update prompt' });
    }
});

// Delete prompt
app.delete('/api/admin/prompts/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM prompts WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Prompt not found' });
        }
        
        res.json({ message: 'Prompt deleted successfully' });
    } catch (error) {
        console.error('Error deleting prompt:', error);
        res.status(500).json({ error: 'Failed to delete prompt' });
    }
});

// Get all categories
app.get('/api/admin/categories', adminAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM categories ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Get all sub-categories for a category
app.get('/api/admin/subcategories/:category', adminAuth, async (req, res) => {
    try {
        const { category } = req.params;
        const result = await pool.query(
            'SELECT DISTINCT sub_category FROM prompts WHERE category = $1 AND sub_category IS NOT NULL ORDER BY sub_category',
            [category]
        );
        res.json(result.rows.map(row => row.sub_category));
    } catch (error) {
        console.error('Error fetching sub-categories:', error);
        res.status(500).json({ error: 'Failed to fetch sub-categories' });
    }
});
// ==================== USER ROUTES ====================

// Get prompts for user (public)
app.get('/api/prompts', async (req, res) => {
    try {
        const { page = 1, limit = 12, category, subCategory, search, sort = 'newest' } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT * FROM prompts WHERE is_active = true';
        const params = [];
        let paramCount = 1;
        
        if (category) {
            query += ` AND category = $${paramCount}`;
            params.push(category);
            paramCount++;
        }
        
        if (subCategory) {
            query += ` AND sub_category = $${paramCount}`;
            params.push(subCategory);
            paramCount++;
        }
        
        if (search) {
            query += ` AND (headline ILIKE $${paramCount} OR description ILIKE $${paramCount} OR full_prompt ILIKE $${paramCount} OR tags::text ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }
        
        // Sorting
        const sortMap = {
            'newest': 'created_at DESC',
            'popular': 'views DESC',
            'views': 'views DESC'
        };
        query += ` ORDER BY ${sortMap[sort] || 'created_at DESC'}`;
        
        query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM prompts WHERE is_active = true';
        const countParams = [];
        let countParamCount = 1;
        
        if (category) {
            countQuery += ` AND category = $${countParamCount}`;
            countParams.push(category);
            countParamCount++;
        }
        
        if (subCategory) {
            countQuery += ` AND sub_category = $${countParamCount}`;
            countParams.push(subCategory);
            countParamCount++;
        }
        
        if (search) {
            countQuery += ` AND (headline ILIKE $${countParamCount} OR description ILIKE $${countParamCount} OR full_prompt ILIKE $${countParamCount} OR tags::text ILIKE $${countParamCount})`;
            countParams.push(`%${search}%`);
        }
        
        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        
        res.json({
            prompts: result.rows,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error fetching prompts:', error);
        res.status(500).json({ error: 'Failed to fetch prompts' });
    }
});

// Get single prompt (public)
app.get('/api/prompts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM prompts WHERE id = $1 AND is_active = true', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Prompt not found' });
        }
        
        // Increment view count (optional)
        await pool.query('UPDATE prompts SET views = COALESCE(views, 0) + 1 WHERE id = $1', [id]);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching prompt:', error);
        res.status(500).json({ error: 'Failed to fetch prompt' });
    }
});

// Get categories (public)
app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM categories ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Get sub-categories (public)
app.get('/api/subcategories/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const result = await pool.query(
            'SELECT DISTINCT sub_category FROM prompts WHERE category = $1 AND sub_category IS NOT NULL AND is_active = true ORDER BY sub_category',
            [category]
        );
        res.json(result.rows.map(row => row.sub_category));
    } catch (error) {
        console.error('Error fetching sub-categories:', error);
        res.status(500).json({ error: 'Failed to fetch sub-categories' });
    }
});

// ==================== GENERATION ENDPOINT ====================
app.post('/api/generate', async (req, res) => {
    try {
        const { promptId, imageData, model, negativePrompt, guidanceScale, steps } = req.body;
        
        // Get the prompt
        const promptResult = await pool.query('SELECT * FROM prompts WHERE id = $1 AND is_active = true', [promptId]);
        if (promptResult.rows.length === 0) {
            return res.status(404).json({ error: 'Prompt not found' });
        }
        
        const prompt = promptResult.rows[0];
        
        // Determine which model to use
        let selectedModel = model;
        if (!selectedModel || selectedModel === 'auto') {
            // Auto-select based on availability
            selectedModel = 'qwen-image-2.0-pro'; // Default to best
        }
        
        // Call the Alibaba Cloud API based on model type
        const result = await callAlibabaModel(selectedModel, prompt.full_prompt, imageData, negativePrompt, guidanceScale, steps);
        
        if (result.success) {
            res.json({ success: true, imageUrl: result.imageUrl });
        } else {
            res.status(500).json({ error: result.error || 'Generation failed' });
        }
    } catch (error) {
        console.error('Generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ALIBABA CLOUD INTEGRATION ====================
async function callAlibabaModel(model, promptText, imageData, negativePrompt, guidanceScale, steps) {
    // This is where you integrate with your existing test.js logic
    // The function should:
    // 1. Determine if model is sync or async
    // 2. Format the request properly
    // 3. Call the DashScope API
    // 4. Return the result
    
    // Placeholder - replace with actual API call
    return {
        success: true,
        imageUrl: 'https://via.placeholder.com/512x512'
    };
}
// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📋 Admin panel: http://localhost:${PORT}`);
});
