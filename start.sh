#!/bin/bash
# This script is used to start the application
echo "Starting the application..."

concurrently --names "front,server" "npm start --prefix public" "node server/build/app.js" || { echo "Failed to start the application!"; exit 1; }

# cd server || { echo "Directory 'server' not found!"; exit 1; }
# npm install || { echo "Failed to install server dependencies!"; exit 1; }
# npm run build || { echo "Failed to build the server!"; exit 1; }
# echo "Server built successfully."


# cd public || { echo "Directory 'public' not found!"; exit 1; }
# npm start || { echo "Failed to start the application!"; exit 1; }
# echo "Front started successfully."