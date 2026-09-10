ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine

RUN npm install -g pnpm@12.3.4

WORKDIR /usr/src/quality-runner

RUN mkdir -p /usr/src/quality-runner/packages/debug-tools /usr/src/repository

ENTRYPOINT ["sh", "/usr/src/quality-runner/run-quality.sh"]
