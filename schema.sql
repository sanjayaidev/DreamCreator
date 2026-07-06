-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table with unique constraint on user_id for ON CONFLICT
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sessions_user_id_unique UNIQUE (user_id)
);

-- Create usage_stats table with unique constraint on user_id for ON CONFLICT
CREATE TABLE IF NOT EXISTS usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_generations INTEGER DEFAULT 0,
    total_images_generated INTEGER DEFAULT 0,
    tools_used TEXT[] DEFAULT '{}',
    templates_used TEXT[] DEFAULT '{}',
    last_active TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create prompts table
CREATE TABLE IF NOT EXISTS prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    headline VARCHAR(255) NOT NULL,
    description TEXT,
    full_prompt TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    demo_image_url VARCHAR(500),
    max_images_allowed INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_prompts_category ON prompts(category);
CREATE INDEX idx_prompts_sub_category ON prompts(sub_category);
CREATE INDEX idx_prompts_is_active ON prompts(is_active);
CREATE INDEX idx_prompts_headline ON prompts(headline);

-- Create categories table for dynamic categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create generations table for tracking image generations
CREATE TABLE IF NOT EXISTS generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID REFERENCES prompts(id),
    user_id UUID REFERENCES users(id),
    model VARCHAR(100),
    image_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for generations
CREATE INDEX idx_generations_user_id ON generations(user_id);
CREATE INDEX idx_generations_prompt_id ON generations(prompt_id);
CREATE INDEX idx_generations_status ON generations(status);

-- Insert sample categories
INSERT INTO categories (name) VALUES 
    ('Nature'),
    ('Portrait'),
    ('Abstract'),
    ('Technology'),
    ('Retro'),
    ('Fantasy'),
    ('Minimalist')
ON CONFLICT (name) DO NOTHING;

-- Insert sample prompts
INSERT INTO prompts (headline, description, full_prompt, category, sub_category, tags, demo_image_url, max_images_allowed) VALUES 
    ('Sunset Over Ocean', 'A beautiful sunset with golden reflections', 'A stunning sunset over the ocean with golden orange and purple skies, waves gently crashing', 'Nature', 'Ocean', ARRAY['sunset', 'ocean', 'golden hour'], 'https://via.placeholder.com/300x200', 1),
    ('Cyberpunk City', 'Futuristic city with neon lights', 'A cyberpunk cityscape at night with neon signs, flying cars, and rain-slicked streets', 'Technology', 'Cyberpunk', ARRAY['cyberpunk', 'neon', 'future'], 'https://via.placeholder.com/300x200', 2),
    ('Vintage Camera', 'Classic film camera illustration', 'A detailed illustration of a vintage film camera from the 1960s', 'Retro', 'Photography', ARRAY['vintage', 'camera', 'film'], 'https://via.placeholder.com/300x200', 1),
    ('Mystical Forest', 'Enchanted forest with glowing elements', 'An enchanted forest with bioluminescent plants, glowing mushrooms, and mysterious fog', 'Fantasy', 'Forest', ARRAY['forest', 'magical', 'glowing'], 'https://via.placeholder.com/300x200', 3)
ON CONFLICT DO NOTHING;
