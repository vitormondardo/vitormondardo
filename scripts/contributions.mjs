// Gera um SVG animado do gráfico de contribuições (fade-in suave, coluna por coluna, da esquerda para a direita).
import { writeFileSync, mkdirSync } from "node:fs";

const user = process.env.GH_USER || "vitormondardo";
const token = process.env.GH_TOKEN;
const query = `query($u:String!){user(login:$u){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{contributionCount date weekday}}}}}}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables: { u: user } }),
});
const json = await res.json();
if (!json.data) throw new Error(JSON.stringify(json));
const cal = json.data.user.contributionsCollection.contributionCalendar;

const themes = {
  dark: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
  light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
};
const cell = 11, gap = 3, step = cell + gap, left = 30, top = 24;
const width = left + cal.weeks.length * step + 10;
const height = top + 7 * step + 28;
const max = Math.max(1, ...cal.weeks.flatMap((w) => w.contributionDays.map((d) => d.contributionCount)));
const level = (n) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));

function build(mode) {
  const p = themes[mode];
  const text = mode === "dark" ? "#8b949e" : "#57606a";
  let rects = "";
  cal.weeks.forEach((w, i) => {
    w.contributionDays.forEach((d) => {
      const x = left + i * step, y = top + d.weekday * step;
      rects += `<rect class="c" style="animation-delay:${(i * 0.045).toFixed(3)}s" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${p[level(d.contributionCount)]}"><title>${d.contributionCount} contribuições em ${d.date}</title></rect>`;
    });
  });
  const days = ["Seg", "Qua", "Sex"].map((t, k) => `<text x="0" y="${top + (k * 2 + 1) * step + 9}" font-size="9">${t}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif" fill="${text}">
<style>
.c{opacity:0;transform-box:fill-box;transform-origin:center;animation:in .7s cubic-bezier(.22,1,.36,1) forwards}
@keyframes in{from{opacity:0;transform:translateX(-6px) scale(.6)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.c{animation:none;opacity:1}}
</style>
<text x="${left}" y="14" font-size="12" font-weight="600">${cal.totalContributions} contribuições no último ano</text>
${days}
${rects}
</svg>`;
}

mkdirSync("assets", { recursive: true });
for (const m of ["dark", "light"]) writeFileSync(`assets/contributions-${m}.svg`, build(m));
console.log(`OK: ${cal.totalContributions} contribuições, ${cal.weeks.length} semanas`);
