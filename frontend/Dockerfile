FROM node:18-alpine

WORKDIR /app

COPY package*.json .
RUN npm install --loglevel=error

COPY . .

ENV CI=false
RUN npm run build && npm install -g serve

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["serve", "-s", "build", "-l", "3000"]
