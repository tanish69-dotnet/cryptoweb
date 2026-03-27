document.addEventListener('DOMContentLoaded', () => {
    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    
    // Top 3 featured assets mapped to HTML DOM glass cards
    const symbols = ['BTC-USD', 'ETH-USD', 'SOL-USD'];
    const cards = document.querySelectorAll('.glass-card');
    
    const fetchDashboardData = () => {
        symbols.forEach((symbol, index) => {
            fetch(`/api/price/${symbol}`)
                .then(res => res.json())
                .then(data => {
                    const card = cards[index];
                    if (!card) return;
                    
                    const currentPrice = parseFloat(data.last_trade_price);
                    const price24h = parseFloat(data.price_24h);
                    const change = ((currentPrice - price24h) / price24h) * 100;
                    
                    // Update text elements
                    const priceEl = card.querySelector('.text-3xl.font-headline');
                    const changeEl = card.querySelector('.text-sm.font-bold');
                    
                    if (priceEl) priceEl.textContent = formatCurrency(currentPrice);
                    if (changeEl) {
                        changeEl.textContent = `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
                        changeEl.className = `text-sm font-bold ${change > 0 ? 'text-secondary' : 'text-error'}`;
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
        });
    };

    const fetchTableData = () => {
        const rows = document.querySelectorAll('.table-asset-row');
        rows.forEach(row => {
            const sym = row.getAttribute('data-symbol');
            fetch(`/api/price/${sym}`)
                .then(res => res.json())
                .then(data => {
                    const currentPrice = parseFloat(data.last_trade_price);
                    const price24h = parseFloat(data.price_24h);
                    const change = ((currentPrice - price24h) / price24h) * 100;

                    const priceEl = row.querySelector('.row-price');
                    const changeSpan = row.querySelector('.row-change span');

                    if (priceEl && !isNaN(currentPrice)) {
                        priceEl.textContent = currentPrice < 10 
                            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(currentPrice)
                            : formatCurrency(currentPrice);
                    }
                    if (changeSpan && !isNaN(change)) {
                        changeSpan.textContent = `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
                        changeSpan.className = `text-on-surface-variant text-xs font-bold px-2 py-1 rounded-lg ${change >= 0 ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'}`;
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
    
    // Auto-refresh using setInterval (every 3 seconds) to make prices appear live
    setInterval(() => {
        fetchDashboardData();
        fetchTableData();
    }, 3000);
});
