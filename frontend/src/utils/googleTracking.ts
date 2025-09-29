// Google 跟踪工具函数

interface GoogleTrackingConfig {
  ga4_measurement_id: string;
  google_ads_conversion_id: string;
  google_ads_conversion_label: string;
}

// 声明全局 gtag 函数
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// 动态加载 gtag.js 脚本
export const loadGoogleTracking = async (config: GoogleTrackingConfig): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 如果已经加载过，直接返回
    if (window.gtag) {
      resolve();
      return;
    }

    // 初始化 dataLayer
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };

    // 设置配置
    window.gtag('js', new Date());

    // 如果有 GA4 ID，则配置 GA4
    if (config.ga4_measurement_id) {
      window.gtag('config', config.ga4_measurement_id);
    }

    // 如果有 Google Ads ID，则配置 Google Ads
    if (config.google_ads_conversion_id) {
      window.gtag('config', config.google_ads_conversion_id);
    }

    // 动态创建并加载 gtag.js 脚本
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${config.ga4_measurement_id || config.google_ads_conversion_id}`;
    
    script.onload = () => {
      console.log('Google Tracking loaded successfully');
      resolve();
    };
    
    script.onerror = () => {
      console.error('Failed to load Google Tracking');
      reject(new Error('Failed to load Google Tracking'));
    };

    document.head.appendChild(script);
  });
};

// 跟踪 GA4 自定义事件
export const trackGA4Event = (eventName: string, parameters: Record<string, any> = {}) => {
  if (!window.gtag) {
    console.warn('Google Tracking not loaded');
    return;
  }

  window.gtag('event', eventName, parameters);
  console.log('GA4 Event tracked:', eventName, parameters);
};

// 跟踪 Google Ads 转化
export const trackGoogleAdsConversion = (config: GoogleTrackingConfig, value?: number) => {
  if (!window.gtag) {
    console.warn('Google Tracking not loaded');
    return;
  }

  if (!config.google_ads_conversion_id || !config.google_ads_conversion_label) {
    console.warn('Google Ads conversion ID or label not configured');
    return;
  }

  const conversionData: Record<string, any> = {
    'send_to': `${config.google_ads_conversion_id}/${config.google_ads_conversion_label}`
  };

  if (value !== undefined) {
    conversionData.value = value;
    conversionData.currency = 'JPY'; // 可以根据需要修改货币
  }

  window.gtag('event', 'conversion', conversionData);
  console.log('Google Ads Conversion tracked:', conversionData);
};

// 综合转化跟踪函数
export const trackConversion = (config: GoogleTrackingConfig, eventData: {
  eventName?: string;
  value?: number;
  customParameters?: Record<string, any>;
} = {}) => {
  const {
    eventName = 'conversion',
    value,
    customParameters = {}
  } = eventData;

  // 跟踪 GA4 自定义事件
  if (config.ga4_measurement_id) {
    const ga4Parameters = {
      ...customParameters,
      event_category: 'conversion',
      event_label: 'landing_page_conversion'
    };

    if (value !== undefined) {
      ga4Parameters.value = value;
      ga4Parameters.currency = 'JPY';
    }

    trackGA4Event(eventName, ga4Parameters);
  }

  // 跟踪 Google Ads 转化
  if (config.google_ads_conversion_id && config.google_ads_conversion_label) {
    trackGoogleAdsConversion(config, value);
  }
};

// 跟踪页面浏览
export const trackPageView = (config: GoogleTrackingConfig, pagePath?: string) => {
  if (!window.gtag) {
    console.warn('Google Tracking not loaded');
    return;
  }

  const pageData: Record<string, any> = {};
  
  if (pagePath) {
    pageData.page_path = pagePath;
  }

  // 发送页面浏览事件到 GA4
  if (config.ga4_measurement_id) {
    window.gtag('config', config.ga4_measurement_id, pageData);
  }

  console.log('Page view tracked:', pageData);
};

// 获取 Google 跟踪配置
export const getGoogleTrackingConfig = async (): Promise<GoogleTrackingConfig> => {
  try {
    const response = await fetch('/api/google-tracking-settings');
    if (!response.ok) {
      throw new Error('Failed to fetch Google tracking settings');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching Google tracking config:', error);
    return {
      ga4_measurement_id: '',
      google_ads_conversion_id: '',
      google_ads_conversion_label: ''
    };
  }
};