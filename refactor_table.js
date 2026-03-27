const fs = require('fs');

const path = 'views/index.ejs';
let content = fs.readFileSync(path, 'utf8');

const regex = /<tbody class="divide-y divide-outline-variant\/5">[\s\S]*?<\/tbody>/;
const replacement = `<tbody class="divide-y divide-outline-variant/5">
<%
const tableAssets = [
  { symbol: 'ADA-USD', name: 'Cardano', icon: 'star', base: 'ADA', mcap: '$16.1B' },
  { symbol: 'DOT-USD', name: 'Polkadot', icon: 'hub', base: 'DOT', mcap: '$10.2B' },
  { symbol: 'AVAX-USD', name: 'Avalanche', icon: 'terrain', base: 'AVAX', mcap: '$13.3B' },
  { symbol: 'LINK-USD', name: 'Chainlink', icon: 'link', base: 'LINK', mcap: '$10.9B' },
  { symbol: 'MATIC-USD', name: 'Polygon', icon: 'layers', base: 'MATIC', mcap: '$6.9B' }
];
%>
<% tableAssets.forEach(asset => { %>
<tr id="row-<%= asset.symbol %>" data-symbol="<%= asset.symbol %>" onclick="window.location.href='/coin/<%= asset.symbol %>'" class="hover:bg-surface-container transition-colors group cursor-pointer table-asset-row">
<td class="px-8 py-5">
<div class="flex items-center gap-3">
<div class="w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant/20 flex items-center justify-center">
<span class="material-symbols-outlined text-sm text-on-surface"><%= asset.icon %></span>
</div>
<div>
<p class="font-bold text-sm bg-gradient-to-r from-primary to-secondary bg-clip-text group-hover:text-transparent transition-all"><%= asset.name %></p>
<p class="text-[10px] text-on-surface-variant uppercase"><%= asset.base %></p>
</div>
</div>
</td>
<td class="px-4 py-5 font-mono text-sm font-medium row-price text-on-surface">...</td>
<td class="px-4 py-5 row-change">
<span class="text-on-surface-variant text-xs font-bold px-2 py-1 rounded-lg">...</span>
</td>
<td class="px-4 py-5 text-sm text-on-surface-variant"><%= asset.mcap %></td>
<td class="px-4 py-5">
<div class="w-24 h-6"><svg class="w-full h-full opacity-70 row-svg" viewbox="0 0 100 30"><path d="" fill="none" stroke="#737679" stroke-linecap="round" stroke-width="2"></path></svg></div>
</td>
<td class="px-8 py-5 text-right"><button class="opacity-0 group-hover:opacity-100 bg-primary/10 text-primary px-4 py-1.5 rounded-lg text-xs font-bold transition-all">Trade</button></td>
</tr>
<% }) %>
</tbody>`;

content = content.replace(regex, replacement);
fs.writeFileSync(path, content);
console.log("Updated index.ejs table successfully!");
