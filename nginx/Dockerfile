FROM nginx:alpine

# 复制配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 删除默认配置
RUN rm -f /etc/nginx/conf.d/default.conf.bak

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]