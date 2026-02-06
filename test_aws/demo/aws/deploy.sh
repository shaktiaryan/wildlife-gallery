#!/bin/bash
# Deployment script for Wildlife Gallery on EC2
# Run this from /opt/wildlife-gallery directory

set -e

echo "=========================================="
echo "Wildlife Gallery - Deployment Script"
echo "=========================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Please create .env file with your production settings"
    echo "Copy from aws/.env.production template"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Stop existing containers (if any)
echo "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Pull latest images
echo "Pulling latest images..."
docker-compose -f docker-compose.prod.yml pull

# Build the app
echo "Building the application..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Start containers
echo "Starting containers..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "Waiting for services to start..."
sleep 10

# Check health
echo "Checking application health..."
curl -s http://localhost/health || echo "Health check pending..."

# Seed database (first time only)
read -p "Do you want to seed the database? (y/n): " seed_db
if [ "$seed_db" = "y" ]; then
    echo "Seeding database..."
    docker exec wildlife-app node seed.js
fi

# Create admin user
read -p "Do you want to create an admin user? (y/n): " create_admin
if [ "$create_admin" = "y" ]; then
    read -p "Enter admin email: " admin_email
    docker exec wildlife-postgres psql -U postgres -d wildlife_gallery -c "UPDATE users SET is_admin = true WHERE email = '$admin_email';"
    echo "Admin rights granted to $admin_email"
fi

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Your app is running at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "Useful commands:"
echo "  View logs:     docker-compose -f docker-compose.prod.yml logs -f"
echo "  Stop app:      docker-compose -f docker-compose.prod.yml down"
echo "  Restart app:   docker-compose -f docker-compose.prod.yml restart"
echo ""
