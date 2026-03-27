const fs = require('fs');

const styles = `/* public/styles.css - Kinetic Ledger V2 Aesthetic Protocol */
.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; vertical-align: middle; }
.glass-card { background: rgba(34, 38, 43, 0.4); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); position: relative; overflow: hidden; }

/* Holographic Tracking Glow */
.glass-card::before {
    content: ''; position: absolute; top: var(--y, 50%); left: var(--x, 50%);
    transform: translate(-50%, -50%); width: 450px; height: 450px;
    background: radial-gradient(circle, rgba(161, 250, 255, 0.12) 0%, transparent 60%);
    opacity: 0; transition: opacity 0.5s ease; pointer-events: none; z-index: 0;
}
.glass-card:hover::before { opacity: 1; }
.glass-card > div.relative { z-index: 10; } /* Priority index over glow */

/* Sparkline Base Shadow Nodes */
.sparkline-glow-pos { filter: drop-shadow(0 0 6px rgba(63, 255, 139, 0.4)); }
.sparkline-glow-neg { filter: drop-shadow(0 0 6px rgba(255, 113, 108, 0.4)); }

/* Dynamic SVG Path Render Algorithm */
@keyframes drawPath { from { stroke-dasharray: 2000; stroke-dashoffset: 2000; } to { stroke-dasharray: 2000; stroke-dashoffset: 0; } }
.sparkline-glow-pos path, .sparkline-glow-neg path, .row-svg path {
    animation: drawPath 2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
}

/* Data Tick Animations */
@keyframes flashGreen {
    0% { color: #3fff8b; text-shadow: 0 0 20px rgba(63,255,139,0.8); transform: translateY(-2px); }
    100% { color: inherit; text-shadow: none; transform: translateY(0); }
}
@keyframes flashRed {
    0% { color: #ff716c; text-shadow: 0 0 20px rgba(255,113,108,0.8); transform: translateY(2px); }
    100% { color: inherit; text-shadow: none; transform: translateY(0); }
}
.tick-up { animation: flashGreen 0.8s ease-out forwards; display: inline-block; }
.tick-down { animation: flashRed 0.8s ease-out forwards; display: inline-block; }

/* Cybernetic Ambient Grid Algorithm */
@keyframes gridScan { 0% { background-position: 0 0; } 100% { background-position: 0 50px; } }
.ambient-grid {
    position: fixed; top: -50px; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: -1;
    background-image: linear-gradient(to right, rgba(161, 250, 255, 0.03) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(161, 250, 255, 0.03) 1px, transparent 1px);
    background-size: 50px 50px; animation: gridScan 4s linear infinite;
    mask-image: radial-gradient(circle at center 30%, black 10%, transparent 80%);
    -webkit-mask-image: radial-gradient(circle at center 30%, black 10%, transparent 80%);
}
`;
fs.writeFileSync('public/styles.css', styles);

// 1. Process Frontend Core Structures
function processStyles(path) {
    let content = fs.readFileSync(path, 'utf8');
    
    // Abstract out the legacy <style> block into the robust global mapped layout
    content = content.replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="/styles.css">');
    if (!content.includes('styles.css')) content = content.replace('</head>', '    <link rel="stylesheet" href="/styles.css">\n</head>');
    
    // Force DOM implementation of Grid Matrix
    if (!content.includes('ambient-grid')) content = content.replace(/<body([^>]*)>/, '<body$1>\n<div class="ambient-grid"></div>');
    
    // Inject complex 3D hover array directly into generic classes
    content = content.replace(/class="glass-card"/g, 'class="glass-card transform transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(0,244,254,0.15)]"');
    content = content.replace(/class="glass-card(.*?)hover:shadow-\[0_0_20px_rgba\(161,250,255,0\.1\)\]"/g, 'class="glass-card$1hover:-translate-y-2 hover:shadow-[0_25px_40px_rgba(0,244,254,0.15)]"');

    fs.writeFileSync(path, content);
}
['views/index.ejs', 'views/coin.ejs', 'views/portfolio.ejs'].forEach(processStyles);

// 2. Process active price tracking and DOM binding for Dashboard
function patchDashboard() {
    let js = fs.readFileSync('public/dashboard.js', 'utf8');
    
    const trackingBindings = `
const bindHolographicCards = () => {
    document.querySelectorAll('.glass-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--x', \`\${e.clientX - rect.left}px\`);
            card.style.setProperty('--y', \`\${e.clientY - rect.top}px\`);
        });
    });
};
bindHolographicCards();
`;
    if (!js.includes('bindHolographicCards')) js = js.replace("document.addEventListener('DOMContentLoaded', () => {", "document.addEventListener('DOMContentLoaded', () => {\n" + trackingBindings);
    if (!js.includes('const activePrices = {};')) js = js.replace("const fetchDashboardData = async () => {", "const activePrices = {};\n    const fetchDashboardData = async () => {");
    
    const tTarget = "priceEl.textContent = formatCurrency(currentPrice);";
    const tReplace = `priceEl.textContent = formatCurrency(currentPrice);
                    if (activePrices[symbol] && activePrices[symbol] !== currentPrice) {
                        priceEl.classList.remove('tick-up', 'tick-down');
                        void priceEl.offsetWidth;
                        priceEl.classList.add(currentPrice > activePrices[symbol] ? 'tick-up' : 'tick-down');
                    }
                    activePrices[symbol] = currentPrice;`;
    js = js.replace(tTarget, tReplace);

    const tblTarget = /priceEl\.textContent = currentPrice < 10 ([\s\S]*?) : formatCurrency\(currentPrice\);/g;
    const tblReplace = `priceEl.textContent = currentPrice < 10 $1 : formatCurrency(currentPrice);
                        if (activePrices[sym] && activePrices[sym] !== currentPrice) {
                            priceEl.classList.remove('tick-up', 'tick-down');
                            void priceEl.offsetWidth;
                            priceEl.classList.add(currentPrice > activePrices[sym] ? 'tick-up' : 'tick-down');
                        }
                        activePrices[sym] = currentPrice;`;
    js = js.replace(tblTarget, tblReplace);

    fs.writeFileSync('public/dashboard.js', js);
}
patchDashboard();

// 3. Process active price tracking for Script (Details view)
function patchScript() {
    let js = fs.readFileSync('public/script.js', 'utf8');
    if (!js.includes('let lastKnownPrice = null;')) js = js.replace("const fetchCryptoData = async () => {", "let lastKnownPrice = null;\n    const fetchCryptoData = async () => {");
    
    const target = "currentPriceEl.textContent = formatCurrency(data.last_trade_price);";
    const injection = `currentPriceEl.textContent = formatCurrency(data.last_trade_price);
            if (lastKnownPrice !== null && lastKnownPrice !== parseFloat(data.last_trade_price)) {
                currentPriceEl.classList.remove('tick-up', 'tick-down');
                void currentPriceEl.offsetWidth; // trigger reflow
                currentPriceEl.classList.add(parseFloat(data.last_trade_price) > lastKnownPrice ? 'tick-up' : 'tick-down');
            }
            lastKnownPrice = parseFloat(data.last_trade_price);`;
    js = js.replace(target, injection);
    fs.writeFileSync('public/script.js', js);
}
patchScript();

// 4. Process live metrics tracking on Portfolio
function patchPortfolio() {
    let js = fs.readFileSync('public/portfolio.js', 'utf8');
    if (!js.includes('let lastTotal = null;')) js = js.replace("const fetchPortfolioData = async () => {", "let lastTotal = null;\n    const fetchPortfolioData = async () => {");
    
    const target = "totalValueEl.textContent = formatCurrency(totalValue);";
    const injection = `totalValueEl.textContent = formatCurrency(totalValue);
            if (lastTotal !== null && lastTotal !== totalValue) {
                totalValueEl.classList.remove('tick-up', 'tick-down');
                void totalValueEl.offsetWidth; // reflow
                totalValueEl.classList.add(totalValue > lastTotal ? 'tick-up' : 'tick-down');
            }
            lastTotal = totalValue;`;
    js = js.replace(target, injection);
    fs.writeFileSync('public/portfolio.js', js);
}
patchPortfolio();

console.log("V2 Aesthetic Implementation Execution Concluded Successfully.");
