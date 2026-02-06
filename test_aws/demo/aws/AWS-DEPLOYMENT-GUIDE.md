# Wildlife Gallery - AWS EC2 Deployment Guide

## Prerequisites
- AWS Account
- Basic knowledge of AWS Console
- Your app files ready to deploy

---

## Step 1: Launch EC2 Instance

### 1.1 Go to EC2 Dashboard
1. Login to [AWS Console](https://console.aws.amazon.com)
2. Search for "EC2" and click on it
3. Click **"Launch Instance"**

### 1.2 Configure Instance

| Setting | Value |
|---------|-------|
| **Name** | `wildlife-gallery` |
| **AMI** | Amazon Linux 2023 AMI (Free tier eligible) |
| **Instance type** | `t2.micro` (Free tier eligible) |
| **Key pair** | Create new → Download `.pem` file → **SAVE IT!** |

### 1.3 Network Settings
Click **"Edit"** and configure:

| Setting | Value |
|---------|-------|
| **Auto-assign public IP** | Enable |
| **Security group** | Create new security group |
| **Security group name** | `wildlife-gallery-sg` |

**Add these Inbound Rules:**

| Type | Port | Source | Description |
|------|------|--------|-------------|
| SSH | 22 | My IP | SSH access |
| HTTP | 80 | 0.0.0.0/0 | Web access |
| HTTPS | 443 | 0.0.0.0/0 | Secure web (optional) |

### 1.4 Storage
- Keep default (8 GB gp3) - sufficient for learning

### 1.5 Launch
1. Click **"Launch Instance"**
2. Wait for instance to start (2-3 minutes)
3. Note the **Public IP Address**

---

## Step 2: Connect to EC2

### 2.1 Using Terminal (Mac/Linux/Windows with Git Bash)

```bash
# Set permissions on key file
chmod 400 your-key-file.pem

# Connect to EC2
ssh -i your-key-file.pem ec2-user@YOUR_PUBLIC_IP
```

### 2.2 Using PuTTY (Windows)
1. Convert `.pem` to `.ppk` using PuTTYgen
2. Open PuTTY
3. Host: `ec2-user@YOUR_PUBLIC_IP`
4. Connection → SSH → Auth → Browse for `.ppk` file
5. Click "Open"

---

## Step 3: Setup EC2 Instance

Run these commands after connecting:

```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo yum install -y git

# Create app directory
sudo mkdir -p /opt/wildlife-gallery
sudo chown ec2-user:ec2-user /opt/wildlife-gallery

# IMPORTANT: Log out and log back in for docker group to take effect
exit
```

Then reconnect:
```bash
ssh -i your-key-file.pem ec2-user@YOUR_PUBLIC_IP
```

---

## Step 4: Deploy Application

### 4.1 Transfer Files to EC2

**Option A: Using Git (Recommended)**
```bash
cd /opt/wildlife-gallery
git clone YOUR_REPO_URL .
```

**Option B: Using SCP (from your local machine)**
```bash
# Run this from your local machine (Windows PowerShell or Git Bash)
scp -i your-key-file.pem -r D:/microdrama/test_aws/demo/* ec2-user@YOUR_PUBLIC_IP:/opt/wildlife-gallery/
```

### 4.2 Create Environment File

**Step 1: Generate secrets FIRST (run these and save the output)**
```bash
# Generate SESSION_SECRET (REQUIRED - min 32 chars)
openssl rand -hex 32

# Generate database password
openssl rand -base64 16
```

**Step 2: Create .env file with your generated secrets**
```bash
cd /opt/wildlife-gallery

# Create .env file - REPLACE the placeholder values!
cat > .env << 'EOF'
SESSION_SECRET=PASTE_YOUR_64_CHAR_HEX_HERE
PG_DATABASE=wildlife_gallery
PG_USER=postgres
PG_PASSWORD=PASTE_YOUR_DB_PASSWORD_HERE
OPENAI_API_KEY=
EOF

# Secure the file (only owner can read)
chmod 600 .env
```

> **WARNING:** The server will NOT start if SESSION_SECRET is missing or less than 32 characters!

### 4.3 Start the Application

```bash
cd /opt/wildlife-gallery

# Build and start containers
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for startup
sleep 30

# Check if running
docker ps

# Check health
curl http://localhost/health
```

### 4.4 Seed Database & Create Admin

```bash
# Seed database with sample data
docker exec wildlife-app node seed.js

# Register a user first via the web interface, then make them admin:
docker exec wildlife-postgres psql -U postgres -d wildlife_gallery -c "UPDATE users SET is_admin = true WHERE email = 'your@email.com';"
```

---

## Step 5: Access Your App

Open in browser:
```
http://YOUR_EC2_PUBLIC_IP
```

---

## Useful Commands

### View Logs
```bash
# All containers
docker-compose -f docker-compose.prod.yml logs -f

# Specific container
docker logs wildlife-app -f
```

### Restart Application
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Stop Application
```bash
docker-compose -f docker-compose.prod.yml down
```

### Update Application
```bash
cd /opt/wildlife-gallery
git pull  # if using git
docker-compose -f docker-compose.prod.yml up -d --build
```

### Database Access
```bash
docker exec -it wildlife-postgres psql -U postgres -d wildlife_gallery
```

### Redis Access
```bash
docker exec -it wildlife-redis redis-cli
```

---

## Troubleshooting

### Container not starting?
```bash
docker-compose -f docker-compose.prod.yml logs
```

### Port 80 not accessible?
- Check Security Group allows HTTP (port 80) from 0.0.0.0/0
- Check if containers are running: `docker ps`

### Database connection error?
```bash
docker exec wildlife-postgres pg_isready
```

### Out of disk space?
```bash
# Clean unused Docker resources
docker system prune -a
```

---

## Cost Estimate (Free Tier)

| Resource | Free Tier | After Free Tier |
|----------|-----------|-----------------|
| EC2 t2.micro | 750 hrs/month | ~$8/month |
| EBS Storage | 30 GB | ~$2.50/month |
| Data Transfer | 15 GB out | ~$0.09/GB |

**First 12 months: ~$0/month**
**After free tier: ~$10-15/month**

---

## Optional: Add Domain Name

1. Get a domain from Route 53 or any registrar
2. Create an A record pointing to your EC2 public IP
3. Consider using Elastic IP (free when attached) to keep IP fixed

---

## Optional: Enable HTTPS (SSL)

```bash
# Install certbot
sudo yum install -y certbot

# Get certificate (replace with your domain)
sudo certbot certonly --standalone -d yourdomain.com

# Update docker-compose to use certificates
# (requires nginx reverse proxy setup)
```

---

## Security Recommendations

1. **Change default passwords** in .env file
2. **Restrict SSH access** to your IP only in Security Group
3. **Keep system updated**: `sudo yum update -y`
4. **Backup database** regularly:
   ```bash
   docker exec wildlife-postgres pg_dump -U postgres wildlife_gallery > backup.sql
   ```
5. **Monitor logs** for suspicious activity

---

## Support

If you have issues:
1. Check container logs: `docker-compose -f docker-compose.prod.yml logs`
2. Check AWS instance status in EC2 Console
3. Verify Security Group rules
