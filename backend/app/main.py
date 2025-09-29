from fastapi import FastAPI, HTTPException, Depends, status, Query, Request, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Float, Boolean
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime, timedelta
from .config import settings
import jwt
import json
import uuid
from typing import Optional, List
import random
import logging
import hashlib
import secrets
import asyncio
import os
import os
from .crawler import stock_crawler

# 配置日志
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 数据库配置
engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 数据库模型
class Token(Base):
    __tablename__ = "tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True)
    session_id = Column(String, index=True)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    gclid = Column(String)
    utm_source = Column(String)

class Event(Base):
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    event_type = Column(String)
    meta = Column(Text)  # JSON 字符串
    created_at = Column(DateTime, default=datetime.utcnow)

class Conversion(Base):
    __tablename__ = "conversions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    input_value = Column(String)
    target_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class ConversionLink(Base):
    __tablename__ = "conversion_links"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    target_url = Column(String)
    weight = Column(Float, default=1.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AdminUser(Base):
    __tablename__ = "admin_users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class GoogleTrackingSettings(Base):
    __tablename__ = "google_tracking_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    ga4_measurement_id = Column(String, default="")
    google_ads_conversion_id = Column(String, default="")
    google_ads_conversion_label = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# 创建表
Base.metadata.create_all(bind=engine)

# 创建默认管理员账户
def create_default_admin():
    db = SessionLocal()
    try:
        # 从配置获取管理员账号密码
        default_username = settings.ADMIN_USERNAME
        default_password = settings.ADMIN_PASSWORD
        
        admin = db.query(AdminUser).filter(AdminUser.username == default_username).first()
        if not admin:
            password_hash = hashlib.sha256(default_password.encode()).hexdigest()
            admin = AdminUser(username=default_username, password_hash=password_hash)
            db.add(admin)
            db.commit()
            logger.info(f"Created default admin user: {default_username}")
        else:
            logger.info(f"Admin user already exists: {default_username}")
    finally:
        db.close()

def create_default_google_settings():
    db = SessionLocal()
    try:
        settings = db.query(GoogleTrackingSettings).first()
        if not settings:
            settings = GoogleTrackingSettings()
            db.add(settings)
            db.commit()
            logger.info("Created default Google tracking settings")
    finally:
        db.close()

create_default_admin()
create_default_google_settings()

app = FastAPI(
    title="Landing Page API", 
    version="1.0.0",
    debug=settings.DEBUG
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_CREDENTIALS,
    allow_methods=settings.CORS_METHODS,
    allow_headers=settings.CORS_HEADERS,
)

# 模板配置
templates = Jinja2Templates(directory="app/templates")

# 依赖注入
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        session_id: str = payload.get("session_id")
        if session_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        
        # 检查 token 是否在数据库中且未过期
        db_token = db.query(Token).filter(Token.token == token).first()
        if not db_token or db_token.expires_at < datetime.utcnow():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
        
        return session_id
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def verify_admin_session(request: Request):
    admin_token = request.cookies.get("admin_token")
    if not admin_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    try:
        payload = jwt.decode(admin_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username = payload.get("username")
        if not username:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return username
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# API 路由
@app.get("/api/get_token")
async def get_token(
    request: Request,
    gclid: Optional[str] = Query(None),
    utm_source: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    # 检查是否有必要的参数
    if not gclid and not utm_source:
        raise HTTPException(status_code=403, detail="Access denied: missing required parameters")
    
    # 生成 session_id 和 token
    session_id = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    token_data = {
        "session_id": session_id,
        "exp": expires_at
    }
    token = jwt.encode(token_data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    # 保存到数据库，包含更多信息
    db_token = Token(
        token=token, 
        session_id=session_id,
        expires_at=expires_at,
        gclid=gclid,
        utm_source=utm_source
    )
    db.add(db_token)
    db.commit()
    
    return {"token": token, "session_id": session_id}

@app.post("/api/track")
async def track_event(
    event_data: dict,
    request: Request,
    session_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    # 获取设备信息
    user_agent = request.headers.get("user-agent", "")
    client_ip = request.client.host
    
    # 合并设备信息到 meta 中
    meta = event_data.get("meta", {})
    meta.update({
        "user_agent": user_agent,
        "client_ip": client_ip,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    event = Event(
        session_id=session_id,
        event_type=event_data.get("event_type", "unknown"),
        meta=json.dumps(meta)
    )
    db.add(event)
    db.commit()
    
    return {"status": "success", "message": "Event tracked"}

@app.post("/api/convert")
async def convert(
    convert_data: dict,
    session_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    # 获取可用的转换链接
    conversion_links = db.query(ConversionLink).filter(ConversionLink.is_active == True).all()
    if not conversion_links:
        raise HTTPException(status_code=404, detail="No conversion links available")
    
    # 基于权重随机选择
    weights = [link.weight for link in conversion_links]
    selected_link = random.choices(conversion_links, weights=weights, k=1)[0]
    
    # 保存转化记录
    conversion = Conversion(
        session_id=session_id,
        input_value=convert_data.get("input_value", ""),
        target_url=selected_link.target_url
    )
    db.add(conversion)
    db.commit()
    
    return {"redirect_url": selected_link.target_url}

# 管理员登录
@app.get("/admin/login", response_class=HTMLResponse)
async def admin_login_page(request: Request):
    try:
        return templates.TemplateResponse("login.html", {"request": request})
    except Exception as e:
        logger.error(f"Error loading login page: {e}")
        return HTMLResponse(content=f"<h1>Login Page Error</h1><p>{str(e)}</p>", status_code=500)

@app.post("/admin/login")
async def admin_login(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        admin = db.query(AdminUser).filter(
            AdminUser.username == username,
            AdminUser.password_hash == password_hash
        ).first()
        
        if not admin:
            return templates.TemplateResponse("login.html", {
                "request": request, 
                "error": "用户名或密码错误"
            })
        
        # 生成管理员 token
        token_data = {
            "username": username,
            "exp": datetime.utcnow() + timedelta(hours=24)
        }
        admin_token = jwt.encode(token_data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        
        response = RedirectResponse(url="/admin", status_code=302)
        response.set_cookie("admin_token", admin_token, httponly=True, max_age=86400)
        return response
    except Exception as e:
        logger.error(f"Error in admin login: {e}")
        return templates.TemplateResponse("login.html", {
            "request": request, 
            "error": f"登录系统错误: {str(e)}"
        })

@app.get("/admin/logout")
async def admin_logout():
    response = RedirectResponse(url="/admin/login", status_code=302)
    response.delete_cookie("admin_token")
    return response

# 管理后台主页
@app.get("/admin", response_class=HTMLResponse)
async def admin_dashboard(request: Request, username: str = Depends(verify_admin_session)):
    try:
        return templates.TemplateResponse("dashboard.html", {
            "request": request,
            "username": username
        })
    except Exception as e:
        logger.error(f"Error loading dashboard: {e}")
        return HTMLResponse(content=f"<h1>Dashboard Error</h1><p>{str(e)}</p>", status_code=500)

# Google 跟踪设置管理页面
@app.get("/admin/settings/google-tracking", response_class=HTMLResponse)
async def admin_google_tracking_page(request: Request, username: str = Depends(verify_admin_session), db: Session = Depends(get_db)):
    try:
        settings = db.query(GoogleTrackingSettings).first()
        if not settings:
            settings = GoogleTrackingSettings()
            db.add(settings)
            db.commit()
            db.refresh(settings)
        
        return templates.TemplateResponse("google_tracking_settings.html", {
            "request": request,
            "username": username,
            "settings": settings
        })
    except Exception as e:
        logger.error(f"Error in Google tracking settings page: {e}")
        return templates.TemplateResponse("error.html", {
            "request": request,
            "error": str(e)
        })

# 转换链接管理页面
@app.get("/admin/links", response_class=HTMLResponse)
async def admin_links_page(request: Request, username: str = Depends(verify_admin_session), db: Session = Depends(get_db)):
    links = db.query(ConversionLink).order_by(ConversionLink.created_at.desc()).all()
    return templates.TemplateResponse("links.html", {
        "request": request,
        "username": username,
        "links": links
    })

# Token 管理页面
@app.get("/admin/tokens", response_class=HTMLResponse)
async def admin_tokens_page(request: Request, username: str = Depends(verify_admin_session), db: Session = Depends(get_db)):
    try:
        tokens = db.query(Token).order_by(Token.created_at.desc()).limit(100).all()
        current_time = datetime.utcnow()
        
        # 计算有效和过期的 token 数量
        valid_tokens_count = sum(1 for token in tokens if token.expires_at > current_time)
        expired_tokens_count = len(tokens) - valid_tokens_count
        
        return templates.TemplateResponse("tokens.html", {
            "request": request,
            "username": username,
            "tokens": tokens,
            "current_time": current_time,
            "valid_tokens_count": valid_tokens_count,
            "expired_tokens_count": expired_tokens_count
        })
    except Exception as e:
        logger.error(f"Error in tokens page: {e}")
        return templates.TemplateResponse("error.html", {
            "request": request,
            "error": str(e)
        })

# 统计分析页面
@app.get("/admin/analytics", response_class=HTMLResponse)
async def admin_analytics_page(request: Request, username: str = Depends(verify_admin_session), db: Session = Depends(get_db)):
    try:
        # 获取最近的 50 个 tokens
        tokens = db.query(Token).order_by(Token.created_at.desc()).limit(50).all()
        
        sessions = []
        for token in tokens:
            try:
                # 获取该会话的事件数量
                event_count = db.query(Event).filter(Event.session_id == token.session_id).count()
                scroll_events = db.query(Event).filter(
                    Event.session_id == token.session_id,
                    Event.event_type == 'scroll'
                ).count()
                conversions = db.query(Conversion).filter(Conversion.session_id == token.session_id).count()
                
                # 获取最后活动时间
                last_event = db.query(Event).filter(Event.session_id == token.session_id).order_by(Event.created_at.desc()).first()
                last_activity = last_event.created_at if last_event else None
                
                sessions.append({
                    'session_id': token.session_id,
                    'gclid': token.gclid or '',
                    'utm_source': token.utm_source or '',
                    'session_start': token.created_at,
                    'event_count': event_count,
                    'scroll_events': scroll_events,
                    'conversions': conversions,
                    'last_activity': last_activity
                })
            except Exception as session_error:
                logger.error(f"Error processing session {token.session_id}: {session_error}")
                continue
                
    except Exception as e:
        logger.error(f"Error in analytics page: {e}")
        sessions = []
    
    return templates.TemplateResponse("analytics.html", {
        "request": request,
        "username": username,
        "sessions": sessions
    })

# API 端点用于管理界面
@app.get("/api/admin/links")
async def get_admin_links(username: str = Depends(verify_admin_session), db: Session = Depends(get_db)):
    try:
        links = db.query(ConversionLink).order_by(ConversionLink.created_at.desc()).all()
        return [
            {
                "id": link.id,
                "name": link.name,
                "target_url": link.target_url,
                "weight": link.weight,
                "is_active": link.is_active,
                "created_at": link.created_at.isoformat()
            }
            for link in links
        ]
    except Exception as e:
        logger.error(f"Error getting admin links: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/links")
async def create_admin_link(
    link_data: dict,
    username: str = Depends(verify_admin_session),
    db: Session = Depends(get_db)
):
    link = ConversionLink(
        name=link_data["name"],
        target_url=link_data["target_url"],
        weight=link_data.get("weight", 1.0),
        is_active=link_data.get("is_active", True)
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    
    return {
        "id": link.id,
        "name": link.name,
        "target_url": link.target_url,
        "weight": link.weight,
        "is_active": link.is_active
    }

@app.put("/api/admin/links/{link_id}")
async def update_admin_link(
    link_id: int,
    link_data: dict,
    username: str = Depends(verify_admin_session),
    db: Session = Depends(get_db)
):
    link = db.query(ConversionLink).filter(ConversionLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    link.name = link_data.get("name", link.name)
    link.target_url = link_data.get("target_url", link.target_url)
    link.weight = link_data.get("weight", link.weight)
    link.is_active = link_data.get("is_active", link.is_active)
    
    db.commit()
    return {"status": "success"}

@app.delete("/api/admin/links/{link_id}")
async def delete_admin_link(
    link_id: int,
    username: str = Depends(verify_admin_session),
    db: Session = Depends(get_db)
):
    link = db.query(ConversionLink).filter(ConversionLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    db.delete(link)
    db.commit()
    return {"status": "success"}

# 会话详情 API
@app.get("/api/admin/sessions/{session_id}")
async def get_session_details(
    session_id: str,
    username: str = Depends(verify_admin_session),
    db: Session = Depends(get_db)
):
    try:
        # 获取 token 信息
        token = db.query(Token).filter(Token.session_id == session_id).first()
        if not token:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # 获取事件
        events = db.query(Event).filter(Event.session_id == session_id).order_by(Event.created_at).all()
        
        # 获取转化
        conversions = db.query(Conversion).filter(Conversion.session_id == session_id).all()
        
        return {
            "session_id": session_id,
            "token_info": {
                "gclid": token.gclid or '',
                "utm_source": token.utm_source or '',
                "created_at": token.created_at.isoformat(),
                "expires_at": token.expires_at.isoformat()
            },
            "events": [
                {
                    "id": event.id,
                    "event_type": event.event_type,
                    "meta": json.loads(event.meta) if event.meta else {},
                    "created_at": event.created_at.isoformat()
                }
                for event in events
            ],
            "conversions": [
                {
                    "id": conv.id,
                    "input_value": conv.input_value,
                    "target_url": conv.target_url,
                    "created_at": conv.created_at.isoformat()
                }
                for conv in conversions
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session details for {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Google 跟踪设置 API
@app.get("/api/admin/settings/google-tracking")
async def get_google_tracking_settings(username: str = Depends(verify_admin_session), db: Session = Depends(get_db)):
    try:
        settings = db.query(GoogleTrackingSettings).first()
        if not settings:
            settings = GoogleTrackingSettings()
            db.add(settings)
            db.commit()
            db.refresh(settings)
        
        return {
            "ga4_measurement_id": settings.ga4_measurement_id or "",
            "google_ads_conversion_id": settings.google_ads_conversion_id or "",
            "google_ads_conversion_label": settings.google_ads_conversion_label or ""
        }
    except Exception as e:
        logger.error(f"Error getting Google tracking settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/admin/settings/google-tracking")
async def update_google_tracking_settings(
    settings_data: dict,
    username: str = Depends(verify_admin_session),
    db: Session = Depends(get_db)
):
    try:
        settings = db.query(GoogleTrackingSettings).first()
        if not settings:
            settings = GoogleTrackingSettings()
            db.add(settings)
        
        settings.ga4_measurement_id = settings_data.get("ga4_measurement_id", "")
        settings.google_ads_conversion_id = settings_data.get("google_ads_conversion_id", "")
        settings.google_ads_conversion_label = settings_data.get("google_ads_conversion_label", "")
        settings.updated_at = datetime.utcnow()
        
        db.commit()
        return {"status": "success", "message": "Google tracking settings updated"}
    except Exception as e:
        logger.error(f"Error updating Google tracking settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 公开的 Google 跟踪设置 API（供前端使用）
@app.get("/api/google-tracking-settings")
async def get_public_google_tracking_settings(db: Session = Depends(get_db)):
    try:
        settings = db.query(GoogleTrackingSettings).first()
        if not settings:
            return {
                "ga4_measurement_id": "",
                "google_ads_conversion_id": "",
                "google_ads_conversion_label": ""
            }
        
        return {
            "ga4_measurement_id": settings.ga4_measurement_id or "",
            "google_ads_conversion_id": settings.google_ads_conversion_id or "",
            "google_ads_conversion_label": settings.google_ads_conversion_label or ""
        }
    except Exception as e:
        logger.error(f"Error getting public Google tracking settings: {e}")
        return {
            "ga4_measurement_id": "",
            "google_ads_conversion_id": "",
            "google_ads_conversion_label": ""
        }

# 股票数据API
@app.get("/api/stock")
async def get_stock_data(code: str = Query(..., description="股票代码")):
    """
    获取股票数据，调用爬虫脚本
    """
    try:
        # 调用爬虫获取股票数据
        crawler_data = await stock_crawler.get_stock_data(code)
        
        if crawler_data and crawler_data.get("code") == 200:
            stock_info = crawler_data["data"]
            company_name = stock_info.get("companyName", "N/A")
            symbol = stock_info.get("symbol", code)
            
            # 解析股票数据数组
            if stock_info.get("data") and len(stock_info["data"]) > 0:
                stock_data = stock_info["data"][0]  # 取第一条数据
                
                # 解析数据格式: [日期, 开盘, 最高, 最低, 收盘, 涨跌, 涨跌幅, 成交量]
                if len(stock_data) >= 8:
                    date = stock_data[0]
                    open_price = stock_data[1].replace(",", "")
                    high_price = stock_data[2].replace(",", "")
                    low_price = stock_data[3].replace(",", "")
                    close_price = stock_data[4].replace(",", "")
                    change = stock_data[5]
                    change_percent = stock_data[6]
                    volume = stock_data[7].replace(",", "")
                else:
                    # 数据不完整，使用默认值
                    raise ValueError("Stock data incomplete")
                
                formatted_data = {
                    "companyName": company_name,
                    "symbol": symbol,
                    "date": date,
                    "open": open_price,
                    "high": high_price,
                    "low": low_price,
                    "close": close_price,
                    "change": change,
                    "changePercent": change_percent,
                    "volume": volume,
                    "timestamp": f"{date} {datetime.now().strftime('%H:%M')}"
                }
                
                logger.info(f"Successfully fetched stock data for {code}")
                return {
                    "success": True,
                    "data": formatted_data,
                    "source": "kabutan_crawler"
                }
        
        logger.warning(f"No valid data from crawler for stock {code}, using fallback")
        
    except Exception as e:
        logger.error(f"Error getting stock data for {code}: {e}")
    
    # 降级到默认数据（当爬虫失败时）
    logger.info(f"Using fallback data for stock {code}")
    default_data = {
        "companyName": f"株式会社{code}",
        "symbol": code,
        "date": datetime.now().strftime("%Y/%m/%d"),
        "open": "15615",
        "high": "15890", 
        "low": "15580",
        "close": "15865",
        "change": "+250",
        "changePercent": "+1.6",
        "volume": "75200",
        "timestamp": datetime.now().strftime("%Y/%m/%d %H:%M")
    }
    
    return {
        "success": True,
        "data": default_data,
        "source": "fallback",
        "fallback": True
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host=settings.HOST, 
        port=settings.PORT, 
        reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL
    )