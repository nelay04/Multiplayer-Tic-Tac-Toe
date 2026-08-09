FROM node:20-alpine

ARG PORT

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE ${PORT}

ENTRYPOINT ["entrypoint.sh"]
CMD ["npm", "start"]
