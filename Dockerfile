FROM node:22-alpine
RUN apk add --no-cache curl unzip
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
# تحميل البيانات وفك الضغط في مجلد مؤقت (backup)
RUN mkdir -p /app/backup && \
    curl -L -o /app/backup/data.zip "https://github.com/ApexPhoneSyria24/Apex-Phone-Store/raw/main/apex-data.zip" && \
    unzip -o /app/backup/data.zip -d /app/backup/ && \
    rm /app/backup/data.zip
# إعطاء صلاحية التنفيذ لملف التشغيل
RUN chmod +x /app/start.sh
EXPOSE 3000
# تشغيل السكربت الذكي بدلاً من node مباشرة
CMD ["/app/start.sh"]
