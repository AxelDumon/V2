FROM node:20
WORKDIR /app
COPY . .
RUN apt update
RUN npm install -g concurrently
RUN npm install
RUN cd server && npm install && npx tsc
EXPOSE 3001
CMD ["npm", "run", "dev"]