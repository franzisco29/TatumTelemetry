#!/bin/bash
set -e

echo "==> Pull ultimo codice..."
git pull origin main

echo "==> Rebuild container..."
docker-compose build

echo "==> Riavvio servizio..."
docker-compose up -d

echo "==> Done!"