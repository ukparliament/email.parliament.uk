FROM node:10.13.0-alpine

ARG APP_SECRET
ARG AWS_DYNAMODB_ENDPOINT
ARG AWS_DYNAMODB_REGION
ARG MC_API_KEY
ARG MC_LIST_ID
ARG NODE_ENV=production

WORKDIR /app

ADD . /app

ENV APP_SECRET $APP_SECRET
ENV AWS_DYNAMODB_ENDPOINT $AWS_DYNAMODB_ENDPOINT
ENV AWS_DYNAMODB_REGION $AWS_DYNAMODB_REGION
ENV MC_API_KEY $MC_API_KEY
ENV MC_LIST_ID $MC_LIST_ID
ENV NODE_ENV $NODE_ENV

RUN apk update \
    && apk add git

RUN echo "Environment: (NODE_ENV): $NODE_ENV" && npm install
RUN mkdir -p ./public/_css
RUN ./node_modules/.bin/node-sass --output-style compressed -o ./public/_css ./src/stylesheets

EXPOSE 3000

HEALTHCHECK --interval=5s --timeout=3s CMD curl --fail http://localhost:3000 || exit 1

CMD [ "npm", "start" ]
