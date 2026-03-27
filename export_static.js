const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const views = [
    { template: 'index.ejs', output: 'index.html', data: { currentPath: '/' } },
    { template: 'markets.ejs', output: 'markets.html', data: { currentPath: '/markets' } },
    { template: 'portfolio.ejs', output: 'portfolio.html', data: { currentPath: '/portfolio' } },
    { template: 'coin.ejs', output: 'coin.html', data: { currentPath: '/coin' } } // This one might need more work for dynamic routes, but we'll start here.
];

const viewsDir = path.join(__dirname, 'views');

views.forEach(view => {
    ejs.renderFile(path.join(viewsDir, view.template), view.data, {
        root: viewsDir // Critical for partials to work
    }, (err, str) => {
        if (err) {
            console.error(`Error rendering ${view.template}:`, err);
            return;
        }
        
        // Update links from /route to route.html
        let outputStr = str
            .replace(/href="\/"/g, 'href="index.html"')
            .replace(/href="\/markets"/g, 'href="markets.html"')
            .replace(/href="\/portfolio"/g, 'href="portfolio.html"')
            .replace(/href="\/coin\//g, 'href="coin.html#') // Simplified for static
            .replace(/window\.location\.href='\/coin\//g, "window.location.href='coin.html#")
            .replace(/window\.location\.href='\/markets'/g, "window.location.href='markets.html'")
            .replace(/window\.location\.href='\/'/g, "window.location.href='index.html'");

        fs.writeFileSync(path.join(__dirname, view.output), outputStr);
        console.log(`Successfully exported ${view.output}`);
    });
});
