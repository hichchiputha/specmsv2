#!/usr/bin/env bash
# LMS Academy - Full Install Script
# Run: bash install.sh

set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║       LMS Academy - Setup Script         ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Backend ───────────────────────────────────────────────────────────────
echo "📦 Installing backend dependencies..."
cd backend
npm install
echo "✅ Backend ready"
cd ..

# ── Electron App ──────────────────────────────────────────────────────────
echo ""
echo "📦 Installing Electron app dependencies..."
cd electron-app
npm install
echo "📦 Installing React renderer dependencies..."
cd src/renderer
npm install
cd ../../..
echo "✅ Electron app ready"

# ── Website ───────────────────────────────────────────────────────────────
echo ""
echo "📦 Installing website dependencies..."
cd website
npm install
cd ..
echo "✅ Website ready"

# ── Env files ─────────────────────────────────────────────────────────────
echo ""
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "⚠️  Created backend/.env from example — edit it with your secrets!"
fi

if [ ! -f website/.env ]; then
  cp website/.env.example website/.env
  echo "✅ Created website/.env"
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║            Setup Complete! 🎉             ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "To start the project:"
echo ""
echo "  1. Backend:       cd backend && npm start"
echo "  2. Electron app:  cd electron-app && npm start"
echo "  3. Web admin:     cd website && npm run dev"
echo ""
echo "Default admin login:"
echo "  Email:    admin@lms.local"
echo "  Password: Admin@123456"
echo ""
