FROM node
WORKDIR /var/castletext
COPY package*.json .
COPY *.js .
COPY viewer viewer
RUN npm install
CMD ["node", "index.js"]
EXPOSE 1700