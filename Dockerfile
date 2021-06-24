FROM node:lts-alpine

COPY . /srv/ixsi_gbfs_converter

RUN cd /srv/ixsi_gbfs_converter; npm ci

CMD ["node", "/srv/ixsi_gbfs_converter/ixsi_gbfs_converter.js"]
