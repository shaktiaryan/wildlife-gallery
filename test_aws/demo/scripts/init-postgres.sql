-- PostgreSQL initialization script for Wildlife Gallery
-- This script runs automatically when the PostgreSQL container starts

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

-- Create creatures table
CREATE TABLE IF NOT EXISTS creatures (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    scientific_name VARCHAR(255),
    category_id INTEGER NOT NULL REFERENCES categories(id),
    description TEXT,
    habitat TEXT,
    diet TEXT,
    lifespan VARCHAR(100),
    conservation_status VARCHAR(100),
    image_url TEXT,
    fun_facts TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    creature_id INTEGER NOT NULL REFERENCES creatures(id),
    comment TEXT NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create images table (already exists but ensure it's here)
CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    creature_id INTEGER NOT NULL UNIQUE,
    image_data BYTEA NOT NULL,
    content_type VARCHAR(50) DEFAULT 'image/jpeg',
    original_url TEXT,
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_creatures_category ON creatures(category_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_creature ON feedback(creature_id);
CREATE INDEX IF NOT EXISTS idx_images_creature_id ON images(creature_id);

-- Insert default categories if they don't exist
INSERT INTO categories (name, description)
VALUES
    ('Animals', 'Land mammals and other animals'),
    ('Birds', 'Avian species from around the world')
ON CONFLICT (name) DO NOTHING;
