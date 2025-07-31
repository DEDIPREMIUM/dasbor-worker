#!/bin/bash

# Cloudflare Workers Telegram Bot Startup Script

echo "🤖 Starting Cloudflare Workers Telegram Bot..."

# Check if .env file exists
if [ -f .env ]; then
    echo "📁 Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  No .env file found. Make sure BOT_TOKEN is set in environment."
fi

# Check if BOT_TOKEN is set
if [ -z "$BOT_TOKEN" ]; then
    echo "❌ Error: BOT_TOKEN is not set!"
    echo "Please set your bot token:"
    echo "1. Create a .env file with: BOT_TOKEN=your_token_here"
    echo "2. Or export BOT_TOKEN=your_token_here"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed!"
    echo "Please install npm"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create temp directory if it doesn't exist
mkdir -p temp

echo "🚀 Starting bot..."
echo "📝 Bot token: ${BOT_TOKEN:0:10}..."
echo "🔄 Press Ctrl+C to stop the bot"

# Start the bot
npm start