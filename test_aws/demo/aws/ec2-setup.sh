#!/bin/bash
# EC2 Setup Script for Wildlife Gallery
# Run this as User Data when launching EC2 or manually via SSH

set -e

echo "=========================================="
echo "Wildlife Gallery - EC2 Setup Script"
echo "=========================================="

# Update system
echo "Updating system packages..."
sudo yum update -y

# Install Docker
echo "Installing Docker..."
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
echo "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
echo "Installing Git..."
sudo yum install -y git

# Create app directory
echo "Creating app directory..."
sudo mkdir -p /opt/wildlife-gallery
sudo chown ec2-user:ec2-user /opt/wildlife-gallery

echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Log out and log back in (for docker group)"
echo "2. cd /opt/wildlife-gallery"
echo "3. Clone or copy your app files"
echo "4. Create .env.production file"
echo "5. Run: docker-compose -f docker-compose.prod.yml up -d"
echo ""
