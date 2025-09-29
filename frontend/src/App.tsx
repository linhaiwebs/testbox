import React, { useState, useEffect } from 'react';
import './assets/css/style.css';
import { 
  getGoogleTrackingConfig, 
  loadGoogleTracking, 
  trackConversion, 
  trackGA4Event,
  trackPageView 
} from './utils/googleTracking';
import { getImage } from './utils/imageLoader';

interface TokenResponse {
  token: string;
  session_id: string;
}

interface GoogleTrackingConfig {
  ga4_measurement_id: string;
  google_ads_conversion_id: string;
  google_ads_conversion_label: string;
}

function StockDataReport() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showLoadingState, setShowLoadingState] = useState(true);
  const [googleConfig, setGoogleConfig] = useState<GoogleTrackingConfig | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [loadingText, setLoadingText] = useState('公開データを収集中...');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

  // 获取 URL 参数
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      gclid: params.get('gclid'),
      utm_source: params.get('utm_source'),
      code: params.get('code')
    };
  };

  // 追踪事件
  const trackEvent = async (eventType: string, meta: any = {}) => {
    if (!token) return;
    
    try {
      await fetch(`${API_BASE_URL}/api/track`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_type: eventType,
          meta
        })
      });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  };

  // 初始化获取 token
  useEffect(() => {
    const initializeToken = async () => {
      const { gclid, utm_source, code } = getUrlParams();
      
      if (!gclid && !utm_source) {
        setError('無権限アクセス：必要なパラメータが不足しています');
        setLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams();
        if (gclid) params.append('gclid', gclid);
        if (utm_source) params.append('utm_source', utm_source);

        const response = await fetch(`${API_BASE_URL}/api/get_token?${params}`);
        
        if (!response.ok) {
          throw new Error('アクセストークンの取得に失敗しました');
        }

        const data: TokenResponse = await response.json();
        setToken(data.token);
        
        // 追踪页面访问
        setTimeout(() => {
          trackEvent('page_visit', { gclid, utm_source });
        }, 100);
        
      } catch (error) {
        setError('アクセストークンの取得に失敗しました');
        console.error('Failed to get token:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeToken();
  }, []);

  // 根据 URL 参数 code 预填充股票名称
  useEffect(() => {
    const prefillStockName = async () => {
      if (loading || !token) return;
      
      const { code } = getUrlParams();
      if (!code) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/stock?code=${code}`);
        
        if (!response.ok) {
          console.warn('Failed to fetch stock data for prefill');
          return;
        }
        
        const stockData = await response.json();
        
        if (stockData.success && stockData.data && stockData.data.companyName) {
          setSearchInput(stockData.data.companyName);
          
          // 追踪预填充事件
          await trackEvent('stock_prefill', {
            stock_code: code,
            company_name: stockData.data.companyName,
            source: stockData.source || 'unknown'
          });
          
          if (googleConfig) {
            trackGA4Event('stock_prefill', {
              event_category: 'engagement',
              event_label: 'url_parameter_prefill',
              stock_code: code,
              company_name: stockData.data.companyName
            });
          }
        }
      } catch (error) {
        console.error('Error prefilling stock name:', error);
        // 静默失败，不影响用户体验
      }
    };
    
    prefillStockName();
  }, [loading, token, googleConfig]);

  // 初始化 Google 跟踪
  useEffect(() => {
    const initializeGoogleTracking = async () => {
      try {
        const config = await getGoogleTrackingConfig();
        setGoogleConfig(config);
        
        if (config.ga4_measurement_id || config.google_ads_conversion_id) {
          await loadGoogleTracking(config);
          trackPageView(config);
          console.log('Google Tracking initialized with config:', config);
        } else {
          console.log('Google Tracking not configured');
        }
      } catch (error) {
        console.error('Failed to initialize Google Tracking:', error);
      }
    };

    initializeGoogleTracking();
  }, []);

  // 监听滚动事件
  useEffect(() => {
    let scrolled = false;
    const handleScroll = () => {
      if (!scrolled && window.scrollY > 100) {
        scrolled = true;
        trackEvent('scroll', { scrollY: window.scrollY });
        
        if (googleConfig) {
          trackGA4Event('scroll', {
            event_category: 'engagement',
            event_label: 'stock_data_search',
            scroll_depth: window.scrollY
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [token, googleConfig]);

  // 处理搜索
  const handleSearch = async (query?: string) => {
    const searchQuery = query || searchInput.trim();
    
    if (!searchQuery) {
      return;
    }

    await trackEvent('click', {
      element: 'search_button',
      search_query: searchQuery
    });
    
    if (googleConfig) {
      trackGA4Event('search', {
        event_category: 'engagement',
        event_label: 'stock_search',
        search_term: searchQuery
      });
    }

    setShowModal(true);
    setShowLoadingState(true);
    setLoadingText(`「${searchQuery}」の基本情報を検索中...`);

    // 模拟数据获取过程
    setTimeout(() => {
      setShowLoadingState(false);
    }, 3000);
  };

  // 处理转化
  const handleConversion = async () => {
    await trackEvent('click', { 
      element: 'confirm_button',
      search_query: searchInput
    });
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/convert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input_value: 'stock_info_search_conversion',
          search_query: searchInput
        })
      });

      if (!response.ok) {
        throw new Error('転換リクエストが失敗しました');
      }

      const data = await response.json();
      
      if (googleConfig) {
        trackConversion(googleConfig, {
          eventName: 'conversion',
          value: 1,
          customParameters: {
            conversion_type: 'stock_info_search',
            target_url: data.redirect_url,
            search_query: searchInput
          }
        });
      }
      
      window.location.href = data.redirect_url;

    } catch (error) {
      console.error('Conversion failed:', error);
      alert('送信に失敗しました。もう一度お試しください。');
    }
  };

  // 关闭模态框
  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => {
      setShowLoadingState(true);
    }, 300);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-red-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-100 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Loading Modal */}
      {showModal && (
        <div className="modal show">
          <div className="modal-backdrop"></div>
          <div className="modal-content">
            <div className="modal-header">
              <h3>情報検索中</h3>
              <button className="close-button" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              {showLoadingState ? (
                <div className="loading-state">
                  <div className="loading-animation">
                    <div className="loading-circle"></div>
                    <div className="loading-circle"></div>
                    <div className="loading-circle"></div>
                  </div>
                  <p>{loadingText}</p>
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div className="progress-fill"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="complete-state">
                  <div className="success-icon">✓</div>
                  <p>検索完了</p>
                  <button className="confirm-button" onClick={handleConversion}>
                    詳細情報を確認
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="main">
        <div className="container">
          {/* Hero Section */}
          <section className="hero">
            <div className="hero-content">
              {/* Stock Chart Logo */}
              <div className="robot-logo">
                <div className="chart-container">
                  <div className="robot-head">
                    <div className="robot-eyes">
                      <div className="robot-eye"></div>
                      <div className="robot-eye"></div>
                    </div>
                  </div>
                  <div className="robot-antenna"></div>
                  <div className="robot-body">
                    <div className="robot-screen"></div>
                  </div>
                </div>
              </div>

              <h1 className="hero-title">
                株式<span className="highlight">情報検索</span>
              </h1>
              <p className="hero-subtitle">
                上場企業の基本情報を検索・表示するツール
              </p>

              {/* Search Box */}
              <div className="search-container">
                <div className="search-wrapper">
                  <input 
                    type="text" 
                    placeholder="株式コード・企業名を入力してください"
                    className="search-input"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                  />
                  <button className="search-button" onClick={() => handleSearch()}>
                    <span className="search-icon">情報検索</span>
                  </button>
                </div>
                <p className="search-example">例：7203、トヨタ自動車、ソニーグループ</p>
              </div>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="disclaimer">
            <div className="disclaimer-content">
              <p><strong>免責事項：</strong>本サービスは上場企業の基本的な公開情報の検索・表示機能を提供するものです。投資助言、投資推奨、売買の推奨等は一切行いません。投資に関する最終的な判断は、利用者ご自身の責任において行ってください。本サービスの利用により生じた損害について、当社は一切の責任を負いません。投資にはリスクが伴い、元本保証はありません。</p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function App() {
  return <StockDataReport />;
}

export default App;