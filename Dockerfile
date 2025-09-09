FROM node:20
WORKDIR /app
COPY . .
RUN npm install
RUN cd server && npm install
EXPOSE 3001
CMD ["npm", "start", ";", "cd", "server", ";", "npx", "tsc", "&&", "node", "build/index.js"]
# CMD ["node", "server/index.js"]