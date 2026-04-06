FROM node:20-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends texlive-full \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY compiler-server/package.json ./package.json
RUN npm install --omit=dev

COPY compiler-server/server.js ./server.js
COPY latexify/api ./api

ENV PORT=3000
ENV LATEXIFY_ENABLE_LOCAL_COMPILE=1
ENV LATEXIFY_ENABLE_REMOTE_FALLBACK=0
ENV LATEXIFY_BODY_SIZE_LIMIT=50mb

EXPOSE 3000

CMD ["npm", "start"]
