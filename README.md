# 前后端一体化落地页项目

这是一个专为 Google Ads 投放设计的完整前后端分离落地页项目，支持用户事件追踪、转化记录和后台管理。

## 项目结构

```
├── backend/                # Python FastAPI 后端
│   ├── app/
│   │   └── main.py        # 主应用文件
│   ├── requirements.txt    # Python 依赖
│   └── Dockerfile         # 后端 Docker 配置
├── frontend/              # React 前端
│   ├── src/
│   │   ├── App.tsx        # 主应用组件
│   │   ├── main.tsx       # 入口文件
│   │   └── index.css      # 样式文件
│   ├── index.html         # HTML 模板
│   ├── package.json       # 前端依赖
│   ├── vite.config.ts     # Vite 配置
│   ├── tailwind.config.js # Tailwind 配置
│   ├── nginx.conf         # Nginx 配置
│   └── Dockerfile         # 前端 Docker 配置
├── docker-compose.yml     # Docker 编排配置
└── README.md             # 项目说明
```

## 功能特性

### 🔒 安全特性
- **JWT Token 验证**：所有 API 调用都需要有效的 JWT Token
- **参数检查**：必须包含 `gclid` 或 `utm_source` 参数才能获取访问权限
- **Token 过期控制**：自动管理 Token 生命周期

### 📊 数据追踪
- **页面访问追踪**：记录用户访问来源
- **滚动行为追踪**：监听用户滚动操作
- **点击事件追踪**：记录用户点击行为
- **转化事件追踪**：完整的转化漏斗数据
- **Google Analytics 4 集成**：自动跟踪页面浏览、事件和转化
- **Google Ads 转化跟踪**：精确的转化归因和 ROI 测量
- **动态股票数据**：支持通过URL参数动态获取股票数据

### 🎯 转化管理
- **权重分流**：支持多个转化链接的权重分配
- **转化记录**：完整保存用户转化数据
- **动态跳转**：根据权重自动选择目标链接

### 🛠 管理后台
- **数据可视化**：直观查看转化数据和事件记录
- **链接管理**：CRUD 操作管理转换链接
- **实时监控**：实时查看用户行为数据
- **Google 跟踪配置**：动态配置 GA4 和 Google Ads 跟踪 ID

## 🚀 快速部署

### 1. 克隆项目
```bash
git clone <your-repo>
cd landing-page-project
```

### 2. 配置环境变量
```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
# 编辑 .env 文件设置您的配置，包括管理员账号密码
```

### 3. 启动服务
```bash
# 开发环境
docker-compose up -d

# 生产环境（修改 .env 中的配置）
docker-compose up -d --build
```

### 4. 访问应用
- 前端：http://localhost:3000?gclid=test_gclid
- 管理后台：http://localhost:3000/admin
- API 文档：http://localhost:8000/docs
- 动态股票数据：http://localhost:3000?gclid=test_gclid&code=1301

### 5. 配置 Google 跟踪
1. 登录管理后台：http://localhost:3000/admin
2. 点击"Google 跟踪设置"
3. 填入您的 GA4 衡量 ID 和 Google Ads 转化 ID
4. 保存设置

## 📋 常用命令

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重新构建并启动
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 进入容器
docker-compose exec backend bash
docker-compose exec frontend sh
```

## 🛠 开发调试

### 本地开发
```bash
# 后端开发
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m app.main

# 前端开发
cd frontend
npm install
npm run dev
```

### 数据备份
```bash
# 备份数据库
cp data/db.sqlite backups/db_$(date +%Y%m%d_%H%M%S).sqlite

# 恢复数据库
cp backups/db_backup.sqlite data/db.sqlite
```

## 🏭 生产环境部署

### 1. 服务器准备
```bash
# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. 生产配置
```bash
# 修改 .env 文件
SECRET_KEY=your-super-secret-production-key
DEBUG=false
PYTHON_ENV=production
NODE_ENV=production
```

### 3. 启动服务
```bash
docker-compose up -d --build
```

## 🔧 故障排除

### 常见问题
1. **端口被占用**：修改 docker-compose.yml 中的端口映射
2. **权限问题**：确保 data 目录有写权限
3. **容器启动失败**：查看日志 `docker-compose logs`

### 清理环境
```bash
# 停止并删除容器
docker-compose down -v

# 清理 Docker 缓存
docker system prune -a
```

### 查看日志
```bash
# 查看所有服务日志
make logs

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 数据备份
```bash
# 备份数据
make backup

# 手动备份
./scripts/backup.sh
```

### 服务管理
```bash
# 查看服务状态
make status

# 重启服务
make restart

# 停止服务
make stop

# 清理环境
make clean
```

### 进入容器
```bash
# 进入后端容器
make shell-backend

# 进入前端容器
make shell-frontend
```

### 本地开发环境
```bash
# 启动本地开发环境（不使用 Docker）
make dev-local
```

### 查看实时日志
```bash
# 实时查看所有日志
docker-compose logs -f

# 查看后端日志
./scripts/logs.sh backend

# 查看前端日志
./scripts/logs.sh frontend
```

### 数据库操作
```bash
# 重新创建数据库表
make migrate

# 查看数据库文件
ls -la data/
```

### 设置反向代理（可选）
如果需要使用域名和 HTTPS，可以配置 Nginx 反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 监控和维护

### 定期备份
```bash
# 设置定时任务
crontab -e

# 添加每日备份任务
0 2 * * * /path/to/project/scripts/backup.sh
```

### 日志轮转
```bash
# 配置 Docker 日志轮转
echo '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```

### 健康检查
```bash
# 检查服务健康状态
curl -f http://localhost:8000/admin
curl -f http://localhost:3000