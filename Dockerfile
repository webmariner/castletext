FROM node:10-stretch
LABEL maintainer=custard@cpan.org
ENV project=ff-core-um-client
RUN apt-get update && apt-get -y install \
    apt-utils \
    netcat
RUN apt-get install -y --no-install-recommends \
    git \
    wget \
    vim
COPY ./package-lock.json /${project}/
COPY ./package.json /${project}/
WORKDIR /${project}
RUN npm install
COPY ./ /${project}
EXPOSE 1700
CMD [ "node", "index.js" ]
