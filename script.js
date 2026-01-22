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
let currentMarket = 'bluechip';
let autoRefreshInterval;

// API Keys
const FINNHUB_API_KEY = 'd5p9nnhr01qs8sp4tc30d5p9nnhr01qs8sp4tc3g';

// Market configurations with stock symbols
const markets = {
    bluechip: {
        name: 'BLUE CHIPS',
        currency: 'USD',
        symbols: [
            { symbol: 'JNJ', name: 'Johnson & Johnson' },
            { symbol: 'JPM', name: 'JPMorgan Chase' },
            { symbol: 'V', name: 'Visa Inc.' },
            { symbol: 'PG', name: 'Procter & Gamble' },
            { symbol: 'UNH', name: 'UnitedHealth' },
            { symbol: 'HD', name: 'Home Depot' },
            { symbol: 'MA', name: 'Mastercard' },
            { symbol: 'DIS', name: 'Walt Disney' },
            { symbol: 'KO', name: 'Coca-Cola' },
            { symbol: 'PEP', name: 'PepsiCo' }
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
            { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
            { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
            { id: 'binancecoin', symbol: 'BNB', name: 'Binance Coin' },
            { id: 'ripple', symbol: 'XRP', name: 'Ripple' },
            { id: 'solana', symbol: 'SOL', name: 'Solana' },
            { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
            { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
            { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
            { id: 'matic-network', symbol: 'MATIC', name: 'Polygon' },
            { id: 'litecoin', symbol: 'LTC', name: 'Litecoin' }
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
        let stocks = [];

        if (currentMarket === 'crypto') {
            // Use CoinGecko API for crypto (free, no key needed)
            stocks = await loadCryptoData(market);
        } else {
            // Use Finnhub API for stocks
            stocks = await loadStockData(market);
        }
        
        displayStocks(stocks, market);
        updateStatus('SYSTEM ONLINE');
        updateLastUpdate();

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('stocks').innerHTML = `
            <div class="no-data">
                ERROR: ${error.message}<br>
                <small>Retrying in 60 seconds...</small>
            </div>
        `;
        updateStatus('ERROR - RETRYING...');
    }
}

async function loadCryptoData(market) {
    const ids = market.symbols.map(s => s.id).join(',');
    const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
    );
    
    if (!response.ok) {
        throw new Error('CoinGecko API failed');
    }
    
    const data = await response.json();
    
    return data.map(coin => {
        const config = market.symbols.find(s => s.id === coin.id);
        return {
            symbol: config?.symbol || coin.symbol.toUpperCase(),
            name: config?.name || coin.name,
            price: coin.current_price,
            change: coin.price_change_24h,
            changePercent: coin.price_change_percentage_24h,
            isOpen: true, // Crypto is always open
            currency: 'USD'
        };
    });
}

async function loadStockData(market) {
    const stocks = [];
    
    // Finnhub requires individual requests per symbol
    const promises = market.symbols.map(async (stockConfig, index) => {
        // Add small delay to avoid rate limiting (60 req/min)
        await new Promise(resolve => setTimeout(resolve, index * 100));
        
        const response = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${stockConfig.symbol}&token=${FINNHUB_API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error(`Finnhub API failed for ${stockConfig.symbol}`);
        }
        
        const data = await response.json();
        
        // c = current price, d = change, dp = percent change, o = open
        return {
            symbol: stockConfig.symbol,
            name: stockConfig.name,
            price: data.c,
            change: data.d,
            changePercent: data.dp,
            isOpen: data.c !== data.pc && data.t > 0,
            currency: market.currency
        };
    });
    
    return Promise.all(promises);
}

function displayStocks(stocks, market) {
    const stocksContainer = document.getElementById('stocks');

    if (!stocks || stocks.length === 0) {
        stocksContainer.innerHTML = '<div class="no-data">NO DATA AVAILABLE</div>';
        return;
    }

    let html = '';

    stocks.forEach(stock => {
        const price = stock.price?.toFixed(2) || 'N/A';
        const change = stock.change?.toFixed(2) || 0;
        const changePercent = stock.changePercent?.toFixed(2) || 0;
        const isPositive = parseFloat(change) >= 0;
        const isOpen = stock.isOpen;
        const currency = stock.currency || market.currency;

        html += `
            <div class="stock-card">
                <div class="stock-info">
                    <div class="stock-symbol">
                        ${stock.symbol}
                        <span class="stock-status ${isOpen ? 'open' : 'closed'}">${isOpen ? 'OPEN' : 'CLOSED'}</span>
                    </div>
                    <div class="stock-name">${stock.name}</div>
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
                        ${isPositive ? '▲' : '▼'} ${Math.abs(changePercent).toFixed(2)}%
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
