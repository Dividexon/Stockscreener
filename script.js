// Matrix Background Animation
const canvas = document.getElementById('matrix-bg');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const matrixChars = '01$€£¥₿%+-×÷=<>[]{}ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const fontSize = 14;
const columns = canvas.width / fontSize;
const drops = [];

for (let i = 0; i < columns; i++) {
    drops[i] = Math.random() * canvas.height / fontSize;
}

function drawMatrix() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#4a9f8c';
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
        const text = matrixChars[Math.floor(Math.random() * matrixChars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

setInterval(drawMatrix, 35);

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Stock Screener Logic
let currentMarket = 'dax';
let autoRefreshInterval;

// Market configurations with stock symbols
const markets = {
    dax: {
        name: 'DAX',
        currency: 'EUR',
        symbols: [
            { symbol: 'SAP.DE', name: 'SAP SE' },
            { symbol: 'SIE.DE', name: 'Siemens AG' },
            { symbol: 'ALV.DE', name: 'Allianz SE' },
            { symbol: 'DTE.DE', name: 'Deutsche Telekom' },
            { symbol: 'BAS.DE', name: 'BASF SE' },
            { symbol: 'MRK.DE', name: 'Merck KGaA' },
            { symbol: 'BMW.DE', name: 'BMW AG' },
            { symbol: 'VOW3.DE', name: 'Volkswagen AG' },
            { symbol: 'ADS.DE', name: 'Adidas AG' },
            { symbol: 'MUV2.DE', name: 'Munich Re' }
        ]
    },
    tech: {
        name: 'TECH',
        currency: 'USD',
        symbols: [
            { symbol: 'AAPL', name: 'Apple Inc.' },
            { symbol: 'MSFT', name: 'Microsoft Corp.' },
            { symbol: 'GOOGL', name: 'Alphabet Inc.' },
            { symbol: 'AMZN', name: 'Amazon.com Inc.' },
            { symbol: 'NVDA', name: 'NVIDIA Corp.' },
            { symbol: 'META', name: 'Meta Platforms' },
            { symbol: 'TSLA', name: 'Tesla Inc.' },
            { symbol: 'AMD', name: 'AMD Inc.' },
            { symbol: 'NFLX', name: 'Netflix Inc.' },
            { symbol: 'CRM', name: 'Salesforce Inc.' }
        ]
    },
    crypto: {
        name: 'CRYPTO',
        currency: 'USD',
        symbols: [
            { symbol: 'BTC-USD', name: 'Bitcoin' },
            { symbol: 'ETH-USD', name: 'Ethereum' },
            { symbol: 'BNB-USD', name: 'Binance Coin' },
            { symbol: 'XRP-USD', name: 'Ripple' },
            { symbol: 'SOL-USD', name: 'Solana' },
            { symbol: 'ADA-USD', name: 'Cardano' },
            { symbol: 'DOGE-USD', name: 'Dogecoin' },
            { symbol: 'DOT-USD', name: 'Polkadot' },
            { symbol: 'MATIC-USD', name: 'Polygon' },
            { symbol: 'LTC-USD', name: 'Litecoin' }
        ]
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadStocks();
    startAutoRefresh();
});

function setupEventListeners() {
    // Market buttons
    document.querySelectorAll('.matrix-btn[data-market]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.matrix-btn[data-market]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentMarket = e.target.dataset.market;
            loadStocks();
        });
    });

    // Refresh button
    document.getElementById('refresh').addEventListener('click', () => {
        loadStocks();
    });
}

async function loadStocks() {
    const stocksContainer = document.getElementById('stocks');
    stocksContainer.innerHTML = `
        <div class="loading">
            <span class="loading-text">LOADING MARKET DATA...</span>
            <div class="loading-bar"></div>
        </div>
    `;

    updateStatus('FETCHING DATA...');

    try {
        const market = markets[currentMarket];
        const symbols = market.symbols.map(s => s.symbol).join(',');
        
        // Using Yahoo Finance API via a CORS proxy
        const response = await fetch(
            `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`
        );

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        const quotes = data.quoteResponse?.result || [];
        
        displayStocks(quotes, market);
        updateStatus('SYSTEM ONLINE');
        updateLastUpdate();

    } catch (error) {
        console.error('Error:', error);
        // Fallback: Show demo data if API fails (CORS issues on GitHub Pages)
        displayDemoData();
        updateStatus('DEMO MODE');
        updateLastUpdate();
    }
}

function displayDemoData() {
    const market = markets[currentMarket];
    const demoStocks = market.symbols.map(stock => ({
        symbol: stock.symbol,
        shortName: stock.name,
        regularMarketPrice: (Math.random() * 500 + 50).toFixed(2),
        regularMarketChange: (Math.random() * 20 - 10).toFixed(2),
        regularMarketChangePercent: (Math.random() * 10 - 5).toFixed(2),
        marketState: Math.random() > 0.5 ? 'REGULAR' : 'CLOSED',
        currency: market.currency
    }));
    
    displayStocks(demoStocks, market);
}

function displayStocks(stocks, market) {
    const stocksContainer = document.getElementById('stocks');

    if (!stocks || stocks.length === 0) {
        stocksContainer.innerHTML = '<div class="no-data">NO DATA AVAILABLE</div>';
        return;
    }

    let html = '';

    stocks.forEach(stock => {
        const price = stock.regularMarketPrice?.toFixed(2) || 'N/A';
        const change = stock.regularMarketChange?.toFixed(2) || 0;
        const changePercent = stock.regularMarketChangePercent?.toFixed(2) || 0;
        const isPositive = parseFloat(change) >= 0;
        const isOpen = stock.marketState === 'REGULAR' || stock.marketState === 'PRE' || stock.marketState === 'POST';
        const currency = stock.currency || market.currency;
        
        // Find the display name from our config
        const stockConfig = market.symbols.find(s => s.symbol === stock.symbol);
        const displayName = stockConfig?.name || stock.shortName || stock.symbol;
        const displaySymbol = stock.symbol.replace('-USD', '').replace('.DE', '');

        html += `
            <div class="stock-card">
                <div class="stock-info">
                    <div class="stock-symbol">
                        ${displaySymbol}
                        <span class="stock-status ${isOpen ? 'open' : 'closed'}">${isOpen ? 'OPEN' : 'CLOSED'}</span>
                    </div>
                    <div class="stock-name">${displayName}</div>
                </div>

                <div class="stock-price">
                    <div class="price-value">${price}</div>
                    <div class="price-currency">${currency}</div>
                </div>

                <div class="stock-change">
                    <div class="change-value ${isPositive ? 'positive' : 'negative'}">
                        ${isPositive ? '+' : ''}${change}
                    </div>
                    <div class="change-percent ${isPositive ? 'positive' : 'negative'}">
                        ${isPositive ? '▲' : '▼'} ${Math.abs(changePercent)}%
                    </div>
                </div>
            </div>
        `;
    });

    stocksContainer.innerHTML = html;
}

function updateStatus(text) {
    document.getElementById('status').textContent = text;
}

function updateLastUpdate() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('de-DE');
    document.getElementById('last-update').textContent = `LAST UPDATE: ${timeString}`;
}

function startAutoRefresh() {
    // Refresh every 60 seconds
    autoRefreshInterval = setInterval(() => {
        loadStocks();
    }, 60000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
});

// Add scanline effect
const scanline = document.createElement('div');
scanline.className = 'scanline';
document.body.appendChild(scanline);
