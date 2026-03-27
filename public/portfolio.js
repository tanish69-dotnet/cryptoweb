document.addEventListener('DOMContentLoaded', async () => {
    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    // Static Fallback & Caching Logic (for GitHub Pages compatibility)
    const BASELINES = {
        'BTC-USD': { price: 64281, change: 2.45 },
        'ETH-USD': { price: 3421, change: -0.82 },
        'SOL-USD': { price: 142.8, change: 12.4 }
    };

    const fetchPrice = async (symbol) => {
        try {
            const res = await fetch(`https://api.blockchain.com/v3/exchange/tickers/${symbol}`);
            if (!res.ok) throw new Error(res.status);
            const data = await res.json();
            return { last_trade_price: data.last_trade_price };
        } catch (err) {
            console.warn(`Using fallback for ${symbol}`);
            return { last_trade_price: BASELINES[symbol]?.price || 10 };
        }
    };

    // Mock Holdings Map
    const holdings = [
        { symbol: 'BTC-USD', name: 'Bitcoin', icon: 'currency_bitcoin', amount: 0.45 },
        { symbol: 'ETH-USD', name: 'Ethereum', icon: 'token', amount: 4.2 },
        { symbol: 'SOL-USD', name: 'Solana', icon: 'stat_3', amount: 145.5 }
    ];

    const tbody = document.getElementById('holdings-list');
    const totalBalanceEl = document.getElementById('total-balance');
    
    let totalPortfolioValue = 0;

    for (const asset of holdings) {
        try {
            const data = await fetchPrice(asset.symbol);
            const currentPrice = data.last_trade_price ? parseFloat(data.last_trade_price) : NaN;
            
            // Calculate accurate local holding vault value dynamically!
            const holdingValue = !isNaN(currentPrice) ? (currentPrice * asset.amount) : 0;
            if (!isNaN(currentPrice)) {
                totalPortfolioValue += holdingValue;
            }

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-surface-container transition-colors group cursor-pointer';
            tr.onclick = () => window.location.href = `coin.html#${asset.symbol}`;
            
            tr.innerHTML = `
                <td class="px-8 py-5">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-surface-container-highest border border-outline-variant/30 flex items-center justify-center">
                            <span class="material-symbols-outlined text-on-surface">${asset.icon}</span>
                        </div>
                        <div>
                            <div class="font-bold text-sm bg-gradient-to-r from-primary to-secondary bg-clip-text group-hover:text-transparent transition-all">${asset.name}</div>
                            <div class="text-xs text-on-surface-variant font-medium mt-0.5">${asset.symbol.split('-')[0]}</div>
                        </div>
                    </div>
                </td>
                <td class="px-8 py-5">
                    <div class="font-bold text-sm text-on-surface">${asset.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${asset.symbol.split('-')[0]}</div>
                </td>
                <td class="px-8 py-5 font-mono text-sm text-on-surface-variant">${!isNaN(currentPrice) ? formatCurrency(currentPrice) : '---'}</td>
                <td class="px-8 py-5 text-right font-mono font-bold text-sm text-primary group-hover:text-secondary transition-colors">${!isNaN(currentPrice) ? formatCurrency(holdingValue) : '---'}</td>
            `;
            tbody.appendChild(tr);

        } catch(err) {
            console.error(`Failed to load and resolve ${asset.symbol}`, err);
        }
    }

    // Animate total balance dynamically counting up cleanly
    const duration = 1200;
    const startTime = performance.now();
    
    const animateBalance = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentDisplayValue = totalPortfolioValue * easeOutQuart;
        
        totalBalanceEl.textContent = formatCurrency(currentDisplayValue);
        
        if (progress < 1) {
            requestAnimationFrame(animateBalance);
        } else {
            totalBalanceEl.textContent = formatCurrency(totalPortfolioValue);
        }
    };
    requestAnimationFrame(animateBalance);
});
