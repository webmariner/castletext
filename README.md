# castletext
RSS to Teletext server with bundled web viewer based on edit.tf

How the long Covid-19 lockdown evenings fly by... 😉

This project serves teletext frames in BBC Micro Mode 7 display RAM format to a separate BBC Basic client I wrote
which uses [Robert Sprowson's BBC Master 128 Ethernet module](http://www.sprow.co.uk/bbc/masternet.htm) to request frames over HTTP.
However, I also added a browser-based viewer I cobbled together from Simon Rawles' superb [edit.tf](https://github.com/rawles/edit.tf).

Some frames are hardcoded menu frames, others are generated from one of several RSS feeds or the article pages they
link off to.

The server requires node/npm. To get started:
```
git clone git@github.com:webmariner/castletext.git
cd castletext
npm install
node index.js
```
then point your web browser to localhost:1700

Docker
======

prerequisites: Docker, docker-compose

* docker-compose build
* docker-compose up
