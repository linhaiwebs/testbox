// DOM Elements
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const startAnalysisBtn = document.getElementById('startAnalysis');
const stockInput = document.getElementById('stockInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const demoResults = document.getElementById('demoResults');
const confidenceValue = document.getElementById('confidence');

// Mobile Navigation Toggle
hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Dynamic confidence value animation
let currentConfidence = 87;
function animateConfidence() {
    const targetConfidence = Math.floor(Math.random() * 20) + 80; // 80-99%
    const increment = targetConfidence > currentConfidence ? 1 : -1;
    
    const animation = setInterval(() => {
        currentConfidence += increment;
        confidenceValue.textContent = currentConfidence + '%';
        
        if (currentConfidence === targetConfidence) {
            clearInterval(animation);
            setTimeout(animateConfidence, 3000); // Change every 3 seconds
        }
    }, 100);
}

// Start confidence animation after page load
window.addEventListener('load', () => {
    setTimeout(animateConfidence, 2000);
});

// Start Analysis button functionality
startAnalysisBtn.addEventListener('click', () => {
    // Scroll to demo section
    document.getElementById('demo').scrollIntoView({
        behavior: 'smooth'
    });
    
    // Focus on the input field
    setTimeout(() => {
        stockInput.focus();
    }, 800);
});

// Stock Analysis Demo
const stockData = {
    'AAPL': {
        name: 'Apple Inc.',
        price: '$193.42',
        change: '+2.34 (1.22%)',
        trend: 'Bullish',
        confidence: '92%',
        risk: 'Low',
        recommendation: 'Buy'
    },
    'GOOGL': {
        name: 'Alphabet Inc.',
        price: '$2,847.63',
        change: '-15.42 (-0.54%)',
        trend: 'Neutral',
        confidence: '78%',
        risk: 'Medium',
        recommendation: 'Hold'
    },
    'TSLA': {
        name: 'Tesla Inc.',
        price: '$248.50',
        change: '+12.85 (5.45%)',
        trend: 'Very Bullish',
        confidence: '85%',
        risk: 'High',
        recommendation: 'Buy'
    },
    'MSFT': {
        name: 'Microsoft Corp.',
        price: '$428.92',
        change: '+3.21 (0.75%)',
        trend: 'Bullish',
        confidence: '89%',
        risk: 'Low',
        recommendation: 'Buy'
    },
    'NVDA': {
        name: 'NVIDIA Corp.',
        price: '$875.30',
        change: '+45.67 (5.51%)',
        trend: 'Very Bullish',
        confidence: '94%',
        risk: 'Medium',
        recommendation: 'Strong Buy'
    }
};

function analyzeStock(symbol) {
    const upperSymbol = symbol.toUpperCase();
    const data = stockData[upperSymbol];
    
    if (!data) {
        return {
            error: true,
            message: `Stock symbol "${symbol}" not found in demo database. Try: AAPL, GOOGL, TSLA, MSFT, or NVDA`
        };
    }
    
    return data;
}

function displayAnalysisResult(data) {
    if (data.error) {
        demoResults.innerHTML = `
            <div class="result-placeholder">
                <div class="placeholder-icon">⚠️</div>
                <p>${data.message}</p>
            </div>
        `;
        return;
    }
    
    const trendColor = data.trend.includes('Bullish') ? '#00ff88' : 
                       data.trend === 'Neutral' ? '#ffaa00' : '#ff4444';
    
    const changeColor = data.change.startsWith('+') ? '#00ff88' : '#ff4444';
    
    demoResults.innerHTML = `
        <div class="analysis-result" style="display: block;">
            <div class="result-header">
                <div class="stock-symbol">${stockInput.value.toUpperCase()}</div>
                <div style="color: #cccccc;">${data.name}</div>
            </div>
            <div class="result-grid">
                <div class="result-item">
                    <div class="result-label">Current Price</div>
                    <div class="result-value">${data.price}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">24h Change</div>
                    <div class="result-value" style="color: ${changeColor};">${data.change}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">AI Trend</div>
                    <div class="result-value" style="color: ${trendColor};">${data.trend}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Confidence</div>
                    <div class="result-value" style="color: #00d4ff;">${data.confidence}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Risk Level</div>
                    <div class="result-value">${data.risk}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">AI Recommendation</div>
                    <div class="result-value" style="color: #00d4ff;">${data.recommendation}</div>
                </div>
            </div>
            <div style="margin-top: 2rem; padding: 1rem; background: rgba(0, 212, 255, 0.1); border-radius: 10px; border-left: 3px solid #00d4ff;">
                <div style="color: #00d4ff; font-weight: 600; margin-bottom: 0.5rem;">AI Insight</div>
                <div style="color: #cccccc; font-size: 0.9rem;">
                    Based on technical analysis, market sentiment, and historical patterns, 
                    our AI model suggests ${data.recommendation.toLowerCase()} for ${data.name}. 
                    The confidence level is ${data.confidence} with ${data.risk.toLowerCase()} risk assessment.
                </div>
            </div>
        </div>
    `;
}

function showLoadingState() {
    demoResults.innerHTML = `
        <div class="result-placeholder">
            <div class="placeholder-icon" style="animation: pulse 2s infinite;">🤖</div>
            <p>AI is analyzing the stock...</p>
            <div style="margin-top: 1rem;">
                <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
                    <div style="width: 0%; height: 100%; background: linear-gradient(90deg, #00d4ff, #0099cc); border-radius: 2px; animation: loading 2s ease-in-out;" id="loadingBar"></div>
                </div>
            </div>
        </div>
    `;
}

// Analyze button functionality
analyzeBtn.addEventListener('click', () => {
    const symbol = stockInput.value.trim();
    
    if (!symbol) {
        stockInput.focus();
        return;
    }
    
    showLoadingState();
    
    // Simulate AI processing time
    setTimeout(() => {
        const analysisResult = analyzeStock(symbol);
        displayAnalysisResult(analysisResult);
    }, 2000);
});

// Enter key support for stock input
stockInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        analyzeBtn.click();
    }
});

// Add loading animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
    
    @keyframes loading {
        0% { width: 0%; }
        100% { width: 100%; }
    }
`;
document.head.appendChild(style);

// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const parallax = document.querySelector('.hero');
    const speed = scrolled * 0.5;
    
    if (parallax) {
        parallax.style.transform = `translateY(${speed}px)`;
    }
});

// Add some interactive animations on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, observerOptions);

// Observe feature cards for animation
document.querySelectorAll('.feature-card').forEach(card => {
    observer.observe(card);
});

// Add animation CSS
const animationStyle = document.createElement('style');
animationStyle.textContent = `
    .feature-card {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.6s ease;
    }
    
    .feature-card.animate-in {
        opacity: 1;
        transform: translateY(0);
    }
`;
document.head.appendChild(animationStyle);

// Console welcome message
console.log(`
🤖 Welcome to AI TestBox Landing Page!

This demo showcases:
✅ Modern responsive design
✅ Interactive AI stock analysis demo
✅ Smooth animations and transitions
✅ Mobile-friendly navigation

Try analyzing these stocks: AAPL, GOOGL, TSLA, MSFT, NVDA

Built with vanilla JavaScript, CSS3, and HTML5.
`);

// Add some fun easter eggs
let clickCount = 0;
document.querySelector('.nav-logo h2').addEventListener('click', () => {
    clickCount++;
    if (clickCount === 5) {
        alert('🤖 You found the easter egg! Welcome to the AI revolution!');
        clickCount = 0;
    }
});

// Performance optimization - lazy load images and content
document.addEventListener('DOMContentLoaded', () => {
    // Preload critical resources
    const preloadLinks = [
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
    ];
    
    preloadLinks.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = href;
        document.head.appendChild(link);
    });
});

// Service worker registration for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment below if you want to add service worker support
        // navigator.serviceWorker.register('/sw.js')
        //     .then((registration) => {
        //         console.log('SW registered: ', registration);
        //     })
        //     .catch((registrationError) => {
        //         console.log('SW registration failed: ', registrationError);
        //     });
    });
}