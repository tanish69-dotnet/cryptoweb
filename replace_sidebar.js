const fs = require('fs');

['views/index.ejs', 'views/coin.ejs'].forEach(f => {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/<!-- SideNavBar -->[\s\S]*?<\/aside>/, "<%- include('partials/sidebar', { currentPath: currentPath }) %>");
    fs.writeFileSync(f, c);
    console.log(`Replaced sidebar in ${f}`);
});
