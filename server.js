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

// API Route - Fetch Crypto Price using Axios
app.get('/api/price/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol;
        const response = await axios.get(`https://api.blockchain.com/v3/exchange/tickers/${symbol}`);
        
        // Fetch graph coordinates
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

        res.json({ ...apiData, history24h });
    } catch (error) {
        console.error("Error fetching data from Blockchain API:", error.message);
        res.status(500).json({ 
            error: 'Failed to fetch cryptocurrency data', 
            details: error.response ? error.response.data : error.message 
        });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`CryptoPulse Server is running on http://localhost:${PORT}`);
});
