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

# Remove default configuration assets to eliminate conflicts
RUN rm -rf /etc/nginx/conf.d/* /etc/nginx/nginx.conf

# Copy Vite's build directory (dist) over to Nginx's static folder
COPY --from=build /app/dist /usr/share/nginx/html

# Overwrite the global nginx configuration file
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080

# CRITICAL: Run Nginx explicitly in the foreground so Cloud Run monitors it correctly
ENTRYPOINT ["nginx", "-g", "daemon off;"]