# Stage 1: Build the React application using Vite
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# Stage 2: Serve the production build using Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# CHANGE: Copy directly to /etc/nginx/nginx.conf instead of conf.d/
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
