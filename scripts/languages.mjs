// Gera um card SVG com as linguagens mais usadas, incluindo repositórios privados
// (requer um token com escopo `repo` em GH_TOKEN; com o GITHUB_TOKEN padrão só vê os públicos).
import { writeFileSync, mkdirSync } from "node:fs";

const user = process.env.GH_USER || "vitormondardo";
const token = process.env.GH_TOKEN;
const query = `query($u:String!,$after:String){user(login:$u){repositories(first:100,after:$after,ownerAffiliations:OWNER,isFork:false){pageInfo{hasNextPage endCursor}nodes{languages(first:10,orderBy:{field:SIZE,direction:DESC}){edges{size node{name color}}}}}}}`;

const totals = new Map();
let after = null, repos = 0;
for (;;) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { u: user, after } }),
  });
  const json = await res.json();
  if (!json.data) throw new Error(JSON.stringify(json));
  const r = json.data.user.repositories;
  for (const repo of r.nodes) {
    repos++;
    for (const e of repo.languages.edges) {
      const cur = totals.get(e.node.name) ?? { size: 0, color: e.node.color || "#8b949e" };
      cur.size += e.size;
      totals.set(e.node.name, cur);
    }
  }
  if (!r.pageInfo.hasNextPage) break;
  after = r.pageInfo.endCursor;
}

const sum = [...totals.values()].reduce((a, b) => a + b.size, 0) || 1;
const top = [...totals.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 8);
const W = 340, pad = 20, barW = W - pad * 2, rowH = 22;
const H = 70 + Math.ceil(top.length / 2) * rowH + 16;

let x = pad, bar = "", legend = "";
top.forEach(([name, v], i) => {
  const w = (v.size / sum) * barW;
  bar += `<rect x="${x.toFixed(2)}" y="42" width="${Math.max(w, 1).toFixed(2)}" height="10" fill="${v.color}"/>`;
  x += w;
  const col = i % 2, row = Math.floor(i / 2);
  const lx = pad + col * (barW / 2), ly = 76 + row * rowH;
  legend += `<circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${v.color}"/><text x="${lx + 16}" y="${ly}" font-size="12" fill="#c0caf5">${name} <tspan fill="#787c99">${((v.size / sum) * 100).toFixed(1)}%</tspan></text>`;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
<style>.b{opacity:0;animation:in .8s ease forwards}@keyframes in{to{opacity:1}}@media (prefers-reduced-motion:reduce){.b{animation:none;opacity:1}}</style>
<rect width="${W}" height="${H}" rx="8" fill="#1a1b27"/>
<text x="${pad}" y="28" font-size="15" font-weight="700" fill="#70a5fd">Top Languages</text>
<clipPath id="r"><rect x="${pad}" y="42" width="${barW}" height="10" rx="5"/></clipPath>
<g class="b" clip-path="url(#r)">${bar}</g>
<g class="b">${legend}</g>
</svg>`;

mkdirSync("assets", { recursive: true });
writeFileSync("assets/top-languages.svg", svg);
console.log(`OK: ${repos} repos, ${top.map(([n, v]) => `${n} ${((v.size / sum) * 100).toFixed(1)}%`).join(", ")}`);
