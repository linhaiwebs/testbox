FROM node:18-alpine as builder

WORKDIR /app

# 复制环境变量文件
COPY .env* ./

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置模板
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]