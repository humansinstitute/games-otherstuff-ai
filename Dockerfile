FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html/
RUN find /usr/share/nginx/html -type d -exec chmod 755 {} \; \
    && find /usr/share/nginx/html -type f -exec chmod 644 {} \; \
    && rm -f /usr/share/nginx/html/nginx.conf \
             /usr/share/nginx/html/.dockerignore \
             /usr/share/nginx/html/.gitignore \
             /usr/share/nginx/html/captain-definition

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
