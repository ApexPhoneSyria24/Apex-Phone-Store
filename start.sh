#!/bin/sh

# 1. مجلدات مضمونة
mkdir -p /app/public/uploads
mkdir -p /app/private_docs

# 2. استعادة DB إذا مفقود
if [ ! -f /app/phones.db ]; then
  echo "📦 نسخ أولي لقاعدة البيانات..."
  cp /app/backup/phones.db /app/phones.db 2>/dev/null || echo "⚠️ backup DB غير موجود"
fi

# 3. استعادة الصور إذا المجلد فارغ
if [ -d /app/backup/uploads ] && [ -z "$(ls -A /app/public/uploads 2>/dev/null)" ]; then
  echo "🖼️ استعادة الصور من backup..."
  cp -r /app/backup/uploads/. /app/public/uploads/ 2>/dev/null || true
fi

# 4. استعادة وثائق التوثيق إذا المجلد فارغ
if [ -d /app/backup/private_docs ] && [ -z "$(ls -A /app/private_docs 2>/dev/null)" ]; then
  echo "📄 استعادة وثائق التوثيق..."
  cp -r /app/backup/private_docs/. /app/private_docs/ 2>/dev/null || true
fi

# 5. تشغيل الموقع
node server.js
