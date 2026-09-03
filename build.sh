#!/bin/bash
set -e

echo "=== Starting build ==="
echo "Current directory: $(pwd)"
echo "Files in root:"
ls -la

echo "=== Installing frontend dependencies ==="
cd frontend
npm install

echo "=== Building frontend ==="
npm run build

echo "=== Going to backend ==="
cd ../backend
echo "Files in backend:"
ls -la

echo "=== Installing backend dependencies ==="
pip install -r requirements.txt

echo "=== Build complete ==="
