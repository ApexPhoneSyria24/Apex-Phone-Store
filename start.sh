#!/bin/sh
mkdir -p /app/data
mkdir -p /app/public/uploads
mkdir -p /app/private_docs

# نسخ قاعدة البيانات الأولية فقط إذا لم تكن موجودة (لن تمسح أبداً)
if [ ! -f /app/data/phones.db ]; then
  echo "📦 إنشاء قاعدة بيانات أولية..."
  cp /app/backup/phones.db /app/data/phones.db 2>/dev/null || true
fi

# ربط قاعدة البيانات بالمسار الذي يتوقعه السيرفر
ln -sf /app/data/phones.db /app/phones.db

# استعادة الصور إذا كان المجلد فارغاً
if [ -d /app/backup/uploads ] && [ -z "$(ls -A /app/public/uploads 2>/dev/null)" ]; then
  echo "🖼️ استعادة الصور..."
  cp -r /app/backup/uploads/. /app/public/uploads/ 2>/dev/null || true
fi

node server.js
