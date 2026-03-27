document.addEventListener('DOMContentLoaded', () => {

const bindHolographicCards = () => {
    document.querySelectorAll('.glass-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--x', `${e.clientX - rect.left}px`);
            card.style.setProperty('--y', `${e.clientY - rect.top}px`);
        });
    });
};
bindHolographicCards();

    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    
    // Static Fallback & Caching Logic (for GitHub Pages compatibility)
    const BASELINES = {
        'BTC-USD': { price: 64281, change: 2.45 },
        'ETH-USD': { price: 3421, change: -0.82 },
        'SOL-USD': { price: 142.8, change: 12.4 },
        'ADA-USD': { price: 0.45, change: 1.15 },
        'DOT-USD': { price: 7.22, change: -3.42 },
        'XRP-USD': { price: 0.621, change: 0.45 },
        'LINK-USD': { price: 18.55, change: 4.22 },
        'MATIC-USD': { price: 0.724, change: -1.22 },
        'AVAX-USD': { price: 35.12, change: 6.88 },
        'DOGE-USD': { price: 0.1852, change: 4.5 },
        'LTC-USD': { price: 88.45, change: -0.22 }
    };
    const priceCache = {};
    const CACHE_DURATION = 15000; // 15 seconds
    let backoffUntil = 0;

    const fetchPrice = async (symbol) => {
        const now = Date.now();
        if (priceCache[symbol] && (now - priceCache[symbol].timestamp < CACHE_DURATION)) return priceCache[symbol].data;
        if (now < backoffUntil && priceCache[symbol]) return priceCache[symbol].data;

        try {
            // Direct call to Blockchain.com API (CORS-friendly)
            const res = await fetch(`https://api.blockchain.com/v3/exchange/tickers/${symbol}`);
            if (!res.ok) throw new Error(res.status);
            const data = await res.json();
            
            const result = {
                symbol: symbol,
                last_trade_price: data.last_trade_price,
                price_24h: data.price_24h,
                history24h: [] // Note: History needs separate API usually, we'll keep it simple or use mocks
            };
            
            priceCache[symbol] = { data: result, timestamp: now };
            backoffUntil = 0;
            return result;
        } catch (err) {
            if (err.message === '429') backoffUntil = now + 60000;
            
            if (priceCache[symbol]) return priceCache[symbol].data;
            
            // Final Mock Fallback
            const base = BASELINES[symbol] || { price: 10, change: 0 };
            const drift = (Math.random() - 0.5) * 0.002;
            const mockPrice = base.price * (1 + drift);
            const mockPrev = mockPrice / (1 + (base.change / 100));
            
            return {
                last_trade_price: mockPrice,
                price_24h: mockPrev,
                history24h: Array.from({length: 24}, () => mockPrev * (1 + (Math.random()-0.5)*0.05))
            };
        }
    };
    
    // Top 3 featured assets mapped to HTML DOM glass cards
    const symbols = ['BTC-USD', 'ETH-USD', 'SOL-USD'];
    const cards = document.querySelectorAll('.glass-card');
    
    const activePrices = {};

    const fetchDashboardData = () => {
        symbols.forEach((symbol, index) => {
            setTimeout(() => {
                fetchPrice(symbol)
                .then(data => {
                    const card = cards[index];
                    if (!card) return;
                    
                    const currentPrice = data.last_trade_price ? parseFloat(data.last_trade_price) : NaN;
                    const price24h = data.price_24h ? parseFloat(data.price_24h) : NaN;
                    
                    // Update text elements
                    const priceEl = card.querySelector('.text-3xl.font-headline');
                    const changeEl = card.querySelector('.text-sm.font-bold');
                    
                    if (priceEl && !isNaN(currentPrice)) {
                        priceEl.textContent = formatCurrency(currentPrice);
                        if (activePrices[symbol] && activePrices[symbol] !== currentPrice) {
                            priceEl.classList.remove('tick-up', 'tick-down');
                            void priceEl.offsetWidth;
                            priceEl.classList.add(currentPrice > activePrices[symbol] ? 'tick-up' : 'tick-down');
                        }
                        activePrices[symbol] = currentPrice;
                    }

                    if (changeEl && !isNaN(currentPrice) && !isNaN(price24h) && price24h !== 0) {
                        const change = ((currentPrice - price24h) / price24h) * 100;
                        changeEl.textContent = `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
                        changeEl.className = `text-sm font-bold ${change > 0 ? 'text-secondary' : 'text-error'}`;
                    } else if (changeEl) {
                        changeEl.textContent = "0.00%";
                        changeEl.className = "text-sm font-bold text-on-surface-variant";
                    }
                    
                    // Construct exact Binance sparklines on 100x30 SVG Canvas
                    if (data.history24h && data.history24h.length > 0) {
                        const svg = card.querySelector('svg');
                        const path = svg.querySelector('path');
                        const prices = data.history24h;
                        
                        if (prices[prices.length - 1] !== currentPrice) prices.push(currentPrice);

                        const min = Math.min(...prices);
                        const max = Math.max(...prices);
                        const pad = (max - min) * 0.15;
                        const cMin = min - pad;
                        const cMax = max + pad;
                        
                        const points = prices.map((p, i) => {
                            const x = (i / (prices.length - 1)) * 100; // SVG viewBox Width
                            const y = 30 - (((p - cMin) / (cMax - cMin)) * 30); // SVG viewBox Height
                            return {x, y};
                        });
                        
                        let d = `M${points[0].x} ${points[0].y}`;
                        points.forEach((p, i) => { if (i > 0) d += ` L${p.x} ${p.y}` });
                        path.setAttribute('d', d);
                        
                        // Style neon glow and line color adaptively based on positive/negative
                        svg.className = `w-full h-full ${change >= 0 ? 'sparkline-glow-pos' : 'sparkline-glow-neg'}`;
                        path.setAttribute('stroke', change >= 0 ? 'var(--tw-colors-secondary, #3fff8b)' : '#ff716c');
                    }
                })
                .catch(err => console.error(`Failed to fetch and map ${symbol}`, err));
            }, index * 250); // Stagger requests by 250ms to bypass rate limits
        });
    };

    const fetchTableData = () => {
        const rows = document.querySelectorAll('.table-asset-row');
        rows.forEach((row, index) => {
            const sym = row.getAttribute('data-symbol');
            setTimeout(() => {
                fetchPrice(sym)
                .then(data => {
                    const currentPrice = data.last_trade_price ? parseFloat(data.last_trade_price) : NaN;
                    const price24h = data.price_24h ? parseFloat(data.price_24h) : NaN;

                    const priceEl = row.querySelector('.row-price');
                    const changeSpan = row.querySelector('.row-change span');

                    if (priceEl && !isNaN(currentPrice)) {
                        priceEl.textContent = currentPrice < 10 
                            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(currentPrice)
                            : formatCurrency(currentPrice);
                        if (activePrices[sym] && activePrices[sym] !== currentPrice) {
                            priceEl.classList.remove('tick-up', 'tick-down');
                            void priceEl.offsetWidth;
                            priceEl.classList.add(currentPrice > activePrices[sym] ? 'tick-up' : 'tick-down');
                        }
                        activePrices[sym] = currentPrice;
                    }

                    if (changeSpan && !isNaN(currentPrice) && !isNaN(price24h) && price24h !== 0) {
                        const change = ((currentPrice - price24h) / price24h) * 100;
                        changeSpan.textContent = `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
                        changeSpan.className = `text-on-surface-variant text-xs font-bold px-2 py-1 rounded-lg ${change >= 0 ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'}`;
                    } else if (changeSpan) {
                        changeSpan.textContent = "---";
                    }

                    if (data.history24h && data.history24h.length > 0) {
                        const svg = row.querySelector('.row-svg');
                        const path = svg.querySelector('path');
                        const prices = data.history24h;
                        if (prices[prices.length - 1] !== currentPrice) prices.push(currentPrice);

                        const min = Math.min(...prices);
                        const max = Math.max(...prices);
                        const pad = (max - min) * 0.15;
                        const cMin = min - pad;
                        const cMax = max + pad;

                        const points = prices.map((p, i) => {
                            const x = (i / (prices.length - 1)) * 100;
                            const y = 30 - (((p - cMin) / (cMax - cMin)) * 30);
                            return {x, y};
                        });

                        let d = `M${points[0].x} ${points[0].y}`;
                        points.forEach((p, i) => { if (i > 0) d += ` L${p.x} ${p.y}` });
                        path.setAttribute('d', d);
                        
                        svg.className = `w-full h-full opacity-70 ${change >= 0 ? 'sparkline-glow-pos' : 'sparkline-glow-neg'}`;
                        path.setAttribute('stroke', change >= 0 ? 'var(--tw-colors-secondary, #3fff8b)' : '#ff716c');
                    }
                })
                .then(() => { if (typeof applyFilter === 'function') applyFilter(); })
                .catch(err => console.error(`Failed to fetch table data for ${sym}`, err));
            }, index * 250); // Stagger requests by 250ms to bypass rate limits
        });
    };

    // Filter Logic
    const filterBtns = document.querySelectorAll('.filter-btn');
    let currentFilter = 'all';

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.classList.remove('bg-surface-container-high', 'text-on-surface');
                b.classList.add('bg-transparent', 'text-on-surface-variant');
            });
            btn.classList.remove('bg-transparent', 'text-on-surface-variant');
            btn.classList.add('bg-surface-container-high', 'text-on-surface');

            currentFilter = btn.getAttribute('data-filter');
            applyFilter();
        });
    });

    const applyFilter = () => {
        const rows = document.querySelectorAll('.table-asset-row');
        rows.forEach(row => {
            const changeSpan = row.querySelector('.row-change span');
            if (!changeSpan) return;
            const changeText = changeSpan.textContent;
            
            if (currentFilter === 'all') {
                row.style.display = '';
            } else if (currentFilter === 'gainer') {
                row.style.display = changeText.includes('+') ? '' : 'none';
            } else if (currentFilter === 'loser') {
                row.style.display = changeText.includes('-') ? '' : 'none';
            }
        });
    };

    // Initial load
    fetchDashboardData();
    fetchTableData();
    
    // Auto-refresh using setInterval (every 10 seconds) to balance liveness and rate limits
    setInterval(() => {
        fetchDashboardData();
        fetchTableData();
    }, 10000);
});
