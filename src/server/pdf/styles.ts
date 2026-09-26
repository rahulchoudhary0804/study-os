export function pdfCss(accent = "#2563eb", accentDark = "#1e3a8a") {
  return `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap');
:root{ --accent:${accent}; --accent-dark:${accentDark}; --ink:#1a1a2e; --sub:#5b5f73; --line:#e4e6ee; --bg-soft:#f7f8fb;
  --p1:#dc2626; --p1-bg:#fdecec; --p2:#ea580c; --p2-bg:#fef1e7; --p3:#b45309; --p3-bg:#fef7e0; --p4:#16a34a; --p4-bg:#eafbf0; }
*{box-sizing:border-box;}
body{ font-family:'Noto Sans','Noto Sans Devanagari',sans-serif; color:var(--ink); font-size:10px; line-height:1.45; margin:0; }
h1,h2,h3{font-weight:700;margin:0 0 6px 0;}
.cover{ height:270mm; display:flex; flex-direction:column; justify-content:space-between; background:linear-gradient(160deg,var(--accent),var(--accent-dark)); color:#fff; padding:16mm 14mm; }
.cover h1{font-size:30px;color:#fff;}
.cover .kicker{letter-spacing:2px;font-size:10px;opacity:.85;text-transform:uppercase;font-weight:600;}
.cover .foot{font-size:9px;opacity:.8;border-top:1px solid rgba(255,255,255,.3);padding-top:8px;}
.page{padding:14mm 12mm;}
.badge{display:inline-block;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;}
.badge.p1{background:var(--p1-bg);color:var(--p1);} .badge.p2{background:var(--p2-bg);color:var(--p2);}
.badge.p3{background:var(--p3-bg);color:var(--p3);} .badge.p4{background:var(--p4-bg);color:var(--p4);}
.chap{border:1px solid var(--line);border-radius:8px;margin-bottom:10px;break-inside:avoid;}
.chap-head{display:flex;justify-content:space-between;align-items:center;background:var(--bg-soft);padding:7px 11px;border-bottom:1px solid var(--line);font-weight:700;}
.chap-body{padding:8px 11px;}
.lbl{font-weight:700;color:var(--accent-dark);font-size:8.5px;text-transform:uppercase;display:block;margin-bottom:2px;}
ul.tight{margin:2px 0 8px 14px;padding:0;} ul.tight li{margin-bottom:2px;}
table.dtable{width:100%;border-collapse:collapse;margin:6px 0;font-size:9.2px;}
table.dtable th{background:var(--accent-dark);color:#fff;text-align:left;padding:5px 7px;}
table.dtable td{padding:5px 7px;border-bottom:1px solid var(--line);}
.checklist{list-style:none;margin:0;padding:0;} .checklist li{padding:4px 0 4px 20px;position:relative;border-bottom:1px dashed var(--line);}
.checklist li:before{content:'\\2610';position:absolute;left:0;color:var(--accent-dark);}
.small{color:var(--sub);font-size:8.5px;}
`;
}
