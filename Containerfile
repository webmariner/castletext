FROM node
WORKDIR /var/castletext
COPY package.json .
COPY tsconfig.json .
COPY src src
COPY viewer viewer
RUN npm install
RUN npm run build
CMD "npm" "start"
EXPOSE 1700