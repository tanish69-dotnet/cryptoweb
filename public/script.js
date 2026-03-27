document.addEventListener('DOMContentLoaded', () => {
    const fetchBtn = document.getElementById('fetch-btn');
    const cryptoSelect = document.getElementById('crypto-select');
    const resultsCard = document.getElementById('results-card');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');

    // DOM Elements for data
    const symbolNameEl = document.getElementById('symbol-name');
    const currentPriceEl = document.getElementById('current-price');
    const price24hEl = document.getElementById('price-24h');
    const volume24hEl = document.getElementById('volume-24h');
    const priceTrendEl = document.getElementById('price-trend');

    // Chart Paths
    const chartLine = document.getElementById('chart-line');
    const chartFill = document.getElementById('chart-fill');
    const chartHighlight = document.getElementById('chart-highlight');

    const formatCurrency = (value) => {
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        }).format(num);
    };

    const formatNumber = (value) => {
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        return new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 4
        }).format(num);
    };

    const fetchCryptoData = async () => {
        const symbol = cryptoSelect.value;
        if (!symbol) return;
        
        resultsCard.classList.remove('visible');
        errorMessage.classList.add('hidden');
        
        setTimeout(() => {
            resultsCard.classList.add('hidden');
            loader.classList.remove('hidden');
        }, 300);

        try {
            const response = await fetch(`/api/price/${symbol}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch data');
            }

            // Populate specific fields
            symbolNameEl.textContent = data.symbol;
            currentPriceEl.textContent = formatCurrency(data.last_trade_price);
            
            const currentPrice = parseFloat(data.last_trade_price);
            const price24h = parseFloat(data.price_24h);
            const difference = currentPrice - price24h;
            const percentChange = (difference / price24h) * 100;
            
            // Set trend logic using secondary (green) and error (red) colors provided by Tailwind classes
            priceTrendEl.className = 'font-body text-xl'; // reset
            if (difference > 0) {
                priceTrendEl.classList.add('positive-trend');
                priceTrendEl.textContent = `+${percentChange.toFixed(2)}% ▲`;
            } else if (difference < 0) {
                priceTrendEl.classList.add('negative-trend');
                priceTrendEl.textContent = `${percentChange.toFixed(2)}% ▼`;
            } else {
                priceTrendEl.textContent = `0.00% -`;
            }
            
            price24hEl.textContent = formatCurrency(data.price_24h);
            volume24hEl.textContent = formatNumber(data.volume_24h);

            // Dynamically Draw SVM Points
            if (data.history24h && data.history24h.length > 0) {
                const prices = data.history24h;
                
                // Add current price as exact latest close
                if (prices[prices.length - 1] !== currentPrice) prices.push(currentPrice);

                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                
                // Buffer to avoid paths directly touching the edge
                const padding = (maxPrice - minPrice) * 0.15; 
                let chartMin = minPrice - padding;
                let chartMax = maxPrice + padding;
                
                // Edge case if 0 volatility
                if(chartMin === chartMax) { chartMin -= 1; chartMax += 1; }

                // Map exact path to SVG 1000x300 canvas
                const points = prices.map((price, i) => {
                    const x = (i / (prices.length - 1)) * 1000;
                    const y = 300 - (((price - chartMin) / (chartMax - chartMin)) * 300);
                    return {x, y};
                });
                
                // Generate path line
                let pathD = `M${points[0].x},${points[0].y}`;
                // Draw curve using Quadratic Beziers to make it smooth (if desired) or simple straight L paths:
                points.forEach((p, i) => {
                    if (i > 0) pathD += ` L${p.x},${p.y}`;
                });
                
                if(chartLine) chartLine.setAttribute('d', pathD);
                if(chartFill) chartFill.setAttribute('d', `${pathD} V300 H0 Z`);
                
                // Set the specific glowing blip dot coordinates!
                const lastPoint = points[points.length - 1];
                if(chartHighlight) {
                    chartHighlight.setAttribute('cx', lastPoint.x);
                    chartHighlight.setAttribute('cy', lastPoint.y);
                }
            }

            setTimeout(() => {
                loader.classList.add('hidden');
                resultsCard.classList.remove('hidden');
                
                setTimeout(() => {
                    resultsCard.classList.add('visible');
                }, 50);
            }, 600);

        } catch (error) {
            console.error(error);
            setTimeout(() => {
                loader.classList.add('hidden');
                errorText.textContent = error.message;
                errorMessage.classList.remove('hidden');
            }, 600);
        }
    };

    fetchBtn.addEventListener('click', fetchCryptoData);
    cryptoSelect.addEventListener('change', fetchCryptoData);
    
    // Auto-initialize if routed from dashboard
    if (window.INITIAL_COIN_SYMBOL) {
        // Dynamically add the symbol to the dropdown if it's uniquely searched
        let optionExists = Array.from(cryptoSelect.options).some(opt => opt.value === window.INITIAL_COIN_SYMBOL);
        if (!optionExists) {
            const newOpt = new Option(window.INITIAL_COIN_SYMBOL, window.INITIAL_COIN_SYMBOL);
            cryptoSelect.add(newOpt);
        }
        cryptoSelect.value = window.INITIAL_COIN_SYMBOL;
        fetchCryptoData();
    }
    
    // Auto-refresh using setInterval (every 3 seconds) to make prices appear live
    setInterval(() => {
        if (cryptoSelect.value) fetchCryptoData();
    }, 3000);
});
