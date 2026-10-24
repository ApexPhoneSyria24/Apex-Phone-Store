#!/bin/sh
# إذا كان مجلد قاعدة البيانات فارغاً، انسخ البيانات من النسخة الاحتياطية
if [ ! -f /app/phones.db ]; then
  echo "النسخ الأولي للبيانات..."
  cp /app/backup/phones.db /app/phones.db
  cp -r /app/backup/uploads/* /app/public/uploads/ 2>/dev/null
  cp -r /app/backup/private_docs/* /app/private_docs/ 2>/dev/null
fi
# تشغيل الموقع
node server.js
