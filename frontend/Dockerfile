# Stage 1: Build the React application using Vite
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# Stage 2: Serve the production build using Node
FROM node:22-alpine
WORKDIR /app

# Install 'serve' globally to host static files
RUN npm install -g serve

# Copy compiled Vite output from the build stage
COPY --from=build /app/dist ./dist

# EXPOSE is largely documentation, but good practice
EXPOSE 8080

# Start the server on all network interfaces (0.0.0.0) 
# and dynamically bind to Cloud Run's injected $PORT
CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT:-8080}"]