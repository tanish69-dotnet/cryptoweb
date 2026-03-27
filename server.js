const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Main Route - Render UI
// Route for the main dashboard
app.get('/', (req, res) => {
    res.render('index', { currentPath: '/' });
});

// Route for specific coin detail view
app.get('/coin/:symbol', (req, res) => {
    res.render('coin', { symbol: req.params.symbol, currentPath: `/coin/${req.params.symbol}` });
});

// Dedicated Markets Full-Page Route
app.get('/markets', (req, res) => {
    res.render('markets', { currentPath: '/markets' });
});

// Portfolio Live Feature Route
app.get('/portfolio', (req, res) => {
    res.render('portfolio', { currentPath: '/portfolio' });
});

// Search redirect route matching specific string query formatting requirement
app.get('/price', (req, res) => {
    let coin = req.query.coin;
    if (!coin) return res.redirect('/');
    
    coin = coin.toUpperCase().trim();

    // Natural Language Alias Mapper
    const aliasMap = {
        'BITCOIN': 'BTC',
        'ETHEREUM': 'ETH',
        'SOLANA': 'SOL',
        'RIPPLE': 'XRP',
        'CARDANO': 'ADA',
        'DOGECOIN': 'DOGE',
        'POLKADOT': 'DOT',
        'CHAINLINK': 'LINK',
        'POLYGON': 'MATIC',
        'AVALANCHE': 'AVAX',
        'TETHER': 'USDT',
        'BINANCE COIN': 'BNB',
        'BNB': 'BNB',
        'SHIBA INU': 'SHIB',
        'LITECOIN': 'LTC'
    };

    let baseCoin = coin.replace('-USD', '');
    if (aliasMap[baseCoin]) {
        coin = aliasMap[baseCoin];
    } else {
        coin = baseCoin;
    }

    if (!coin.includes('-USD')) {
        coin += '-USD';
    }
    
    res.redirect(`/coin/${coin}`);
});

const priceCache = {};
const CACHE_DURATION = 10000; // 10 seconds
let backoffUntil = 0;
const BACKOFF_DURATION = 60000; // 1 minute

// Realistic Mock Baselines for Fallback (First-visit & API down scenario)
const BASELINES = {
    'BTC-USD': { price: 64281, change: 2.45 },
    'ETH-USD': { price: 3421, change: -0.82 },
    'SOL-USD': { price: 142.8, change: 12.4 },
    'ADA-USD': { price: 0.45, change: 1.15 },
    'DOT-USD': { price: 7.22, change: -3.42 },
    'XRP-USD': { price: 0.621, change: 0.45 },
    'LINK-USD': { price: 18.55, change: 4.22 },
    'MATIC-USD': { price: 0.724, change: -1.22 },
    'AVAX-USD': { price: 35.12, change: 6.88 }
};

// API Route - Fetch Crypto Price using Axios
app.get('/api/price/:symbol', async (req, res) => {
    const symbol = req.params.symbol;
    const now = Date.now();

    // Check Cache
    if (priceCache[symbol] && (now - priceCache[symbol].timestamp < CACHE_DURATION)) {
        return res.json(priceCache[symbol].data);
    }

    // Check Backoff (if we hit 429 recently)
    if (now < backoffUntil && priceCache[symbol]) {
        console.log(`Backoff active: Returning stale data for ${symbol}`);
        return res.json(priceCache[symbol].data);
    }

    try {
        const response = await axios.get(`https://api.blockchain.com/v3/exchange/tickers/${symbol}`);
        
        // Reset backoff on success
        backoffUntil = 0;
        let history24h = [];
        try {
            const binanceSymbolMap = {
                'BTC-USD': 'BTCUSDT',
                'ETH-USD': 'ETHUSDT',
                'SOL-USD': 'SOLUSDT',
                'XRP-USD': 'XRPUSDT',
                'ADA-USD': 'ADAUSDT',
                'DOGE-USD': 'DOGEUSDT',
                'DOT-USD': 'DOTUSDT',
                'LINK-USD': 'LINKUSDT',
                'MATIC-USD': 'MATICUSDT',
                'AVAX-USD': 'AVAXUSDT'
            };
            const binanceSymbol = binanceSymbolMap[symbol];
            if (binanceSymbol) {
                const klinesRes = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=1h&limit=24`);
                history24h = klinesRes.data.map(kline => parseFloat(kline[4])); // Closing prices
            }
        } catch(historyErr) {
            console.error("Warning: Failed to fetch history", historyErr.message);
        }

        // Silent Failure Fallback: If Blockchain returns healthy 200 OK but 0$ balance
        let apiData = response.data;
        if (!apiData.last_trade_price || parseFloat(apiData.last_trade_price) === 0) {
            if (history24h.length > 0) {
                apiData.last_trade_price = history24h[history24h.length - 1];
                apiData.price_24h = history24h[0];
            } else {
                throw new Error("Asset valuation returned 0.00 from provider.");
            }
        }

        const result = { ...apiData, history24h };
        
        // Update Cache
        priceCache[symbol] = {
            timestamp: now,
            data: result
        };

        res.json(result);
    } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error.message);
        
        // Set backoff on 429
        if (error.response && error.response.status === 429) {
            console.warn("Rate limited (429). Activating backoff...");
            backoffUntil = Date.now() + BACKOFF_DURATION;
        }

        // 1. If we have stale data, return it
        if (priceCache[symbol]) {
            console.log(`Returning stale data for ${symbol}`);
            return res.json(priceCache[symbol].data);
        }

        // 2. If no stale data (e.g. first visit), return Mock Data based on Baselines
        const baseline = BASELINES[symbol] || { price: 10, change: 0 };
        const drift = (Math.random() - 0.5) * 0.002; // 0.2% random drift
        const mockPrice = baseline.price * (1 + drift);
        const mockPrevPrice = mockPrice / (1 + (baseline.change / 100));

        const mockResult = {
            symbol: symbol,
            last_trade_price: mockPrice.toFixed(4),
            price_24h: mockPrevPrice.toFixed(4),
            history24h: Array.from({length: 24}, (_, i) => (mockPrevPrice * (1 + (Math.random() - 0.5) * 0.05)).toFixed(4))
        };

        console.log(`API Down/Rate-Limited: Returning MOCK data for ${symbol}`);
        res.json(mockResult);
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`CryptoPulse Server is running on http://localhost:${PORT}`);
});
