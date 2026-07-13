# Stage 1: Build the React application using Vite (Upgraded to Node 22)
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Vite requires variables to be prefixed with VITE_ to be bundled into the code
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Vite outputs production builds to the "dist" folder by default
RUN npm run build

# Stage 2: Serve the production build using Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

