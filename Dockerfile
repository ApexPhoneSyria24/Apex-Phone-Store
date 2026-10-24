FROM node:22-alpine
RUN apk add --no-cache curl unzip
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN curl -L -o data.zip "https://github.com/ApexPhoneSyria24/Apex-Phone-Store/raw/main/apex-data.zip" && \
    unzip -o data.zip && \
    rm data.zip
EXPOSE 3000
CMD ["node", "server.js"]
