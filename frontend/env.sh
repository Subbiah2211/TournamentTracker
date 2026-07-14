#!/bin/sh
# Generate config.js dynamically based on runtime environment variables
echo "window.ENV = {" > /app/dist/config.js
echo "  VITE_API_BASE_URL: \"$VITE_API_BASE_URL\"" >> /app/dist/config.js
echo "};" >> /app/dist/config.js

# Execute the main command
exec "$@"
