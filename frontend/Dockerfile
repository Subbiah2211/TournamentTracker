FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN chmod +x env.sh
EXPOSE 8080
ENTRYPOINT ["/app/env.sh"]
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "8080"]