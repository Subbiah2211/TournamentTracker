# Use a single-stage build so we don't lose files between stages
FROM node:22-alpine
WORKDIR /app

# Copy dependency files and install
COPY package*.json ./
RUN npm install

# Copy the rest of your source code
COPY . .

# Inject the build variable
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the project
RUN npm run build

EXPOSE 8080

# Use Vite's native preview server. 
# It automatically finds your build folder and explicitly binds to 0.0.0.0 on port 8080.
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "8080"]