/* Power at Sea dashboard. Depends on d3 v7, topojson-client, data.js, world.js, i18n.js */
(() => {
  "use strict";
  const D = window.PAS;
  const I18N = window.PAS_I18N;
  const CODEBOOK = window.PAS_CODEBOOK;
  const Y0 = D.years[0], Y1 = D.years[1];
  const YEARS = d3.range(Y0, Y1 + 1);

  /* ---------- storage (best effort) ---------- */
  const store = {
    get(k) { try { return localStorage.getItem("pas:" + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem("pas:" + k, v); } catch (e) { /* ignore */ } },
  };

  /* ---------- data model ---------- */
  const C = new Map();
  for (const c of D.countries) {
    c.idx = new Map(c.y.map((y, i) => [y, i]));
    C.set(c.cow, c);
  }
  const raw = (c, f, y) => { const i = c.idx.get(y); return i === undefined ? null : c.v[f][i]; };
  const has = (c, y) => c.idx.has(y);
  const tonTotal = (c, y) => { const i = c.idx.get(y); return i === undefined ? null : c.v.grandtotal_ton[i] + c.v.ballsub_ton[i]; };

  const sysTotal = new Map();
  for (const y of YEARS) {
    let s = 0;
    for (const c of D.countries) { const v = tonTotal(c, y); if (v) s += v; }
    sysTotal.set(y, s);
  }

  const field = (f) => (c, y) => raw(c, f, y);
  const MEASURES = [
    { key: "ton_total", group: "tonnage", kind: "ton", scale: "log", value: tonTotal },
    { key: "share", group: "tonnage", kind: "pct", scale: "log", value: (c, y) => { const v = tonTotal(c, y); return v === null ? null : v / sysTotal.get(y); } },
    { key: "base_ton", group: "tonnage", kind: "ton", scale: "log", value: field("base_ton") },
    { key: "base_assault_ton", group: "tonnage", kind: "ton", scale: "log", value: field("base_assault_ton") },
    { key: "amp_tonFULL", group: "tonnage", kind: "ton", scale: "log", value: field("amp_tonFULL") },
    { key: "ballsub_ton", group: "tonnage", kind: "ton", scale: "log", value: field("ballsub_ton") },
    { key: "strength", group: "power", kind: "idx", scale: "log", value: field("navy_strength") },
    { key: "ships", group: "power", kind: "count", scale: "sqrt", value: field("grandtotal_count") },
    { key: "carriers", group: "fleet", kind: "count", scale: "sqrt", value: field("AircraftCarriers") },
    { key: "battleships", group: "fleet", kind: "count", scale: "sqrt", value: field("Battleships") },
    { key: "ssn", group: "fleet", kind: "count", scale: "sqrt", value: field("NukeAttSubs") },
    { key: "ssk", group: "fleet", kind: "count", scale: "sqrt", value: field("DieselSubs") },
    { key: "ssbn", group: "fleet", kind: "count", scale: "sqrt", value: field("BallisticSubs") },
    { key: "assault", group: "fleet", kind: "count", scale: "sqrt", value: field("assault_ships") },
    { key: "logistic", group: "fleet", kind: "count", scale: "sqrt", value: field("maj_logistic") },
    { key: "big10k", group: "fleet", kind: "count", scale: "sqrt", value: field("bigship10k") },
    { key: "big5k", group: "fleet", kind: "count", scale: "sqrt", value: field("bigship5k") },
  ];
  const M = Object.fromEntries(MEASURES.map((m) => [m.key, m]));
  // Fixed colour domain per measure across all years, so the map is comparable over time.
  for (const m of MEASURES) {
    let lo = Infinity, hi = 0;
    for (const c of D.countries) for (const y of c.y) {
      const v = m.value(c, y);
      if (v > 0) { if (v < lo) lo = v; if (v > hi) hi = v; }
    }
    m.lo = lo; m.hi = hi;
  }

  // Region -> fixed categorical slot (colour follows the entity, never rank)
  const REGION_SLOT = { 1: "--s1", 4: "--s2", 3: "--s3", 2: "--s4", 5: "--s7" };
  const REGION_ORDER = [5, 1, 4, 2, 3];
  const SERIES = ["--s1", "--s2", "--s3", "--s4", "--s5", "--s6", "--s7", "--s8"];

  /* ---------- state ---------- */
  const navLang = (navigator.language || "en").slice(0, 2);
  const state = {
    lang: I18N[store.get("lang")] ? store.get("lang") : (I18N[navLang] ? navLang : "en"),
    measure: "ton_total",
    year: Y1,
    region: 0,
    tab: "map",
    topN: 10,
    evo: [2, 200, 365, 710, 740, 220],
    evoLog: false,
    mode: "abs",
    evoFrom: Y0,
    evoTo: Y1,
    cmpA: 710,
    cmpB: 2,
    playing: null,
    sort: { key: null, dir: -1 },
    search: "",
  };

  /* ---------- helpers ---------- */
  const $ = (s) => document.querySelector(s);
  const T = () => I18N[state.lang];
  const tr = (key, vars) => {
    let s = T()[key];
    if (s === undefined) return key;
    if (vars) for (const k in vars) s = s.split("{" + k + "}").join(vars[k]);
    return s;
  };
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const cname = (c) => c.n[state.lang] || c.n.en;
  const mname = (key) => T().measures[key][0];
  const mdesc = (key) => T().measures[key][1];
  const el = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "text") e.textContent = attrs[k];
      else if (k === "style") e.style.cssText = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    for (const k of kids) if (k != null) e.append(k);
    return e;
  };

  let NF0, NF1, NFC, NFP;
  function setFormats() {
    const loc = T().locale;
    NF0 = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 });
    NF1 = new Intl.NumberFormat(loc, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
    NFC = new Intl.NumberFormat(loc, { notation: "compact", maximumFractionDigits: 1 });
    NFP = new Intl.NumberFormat(loc, { style: "percent", maximumFractionDigits: 1, minimumFractionDigits: 1 });
  }
  function fmt(kind, v, compact) {
    if (v === null || v === undefined || Number.isNaN(v)) return "–";
    switch (kind) {
      case "ton": return (compact ? NFC.format(v) : NF0.format(v)) + " t";
      case "pct": return NFP.format(v);
      case "idx": return NFC.format(v);
      default: return NF0.format(v);
    }
  }
  function tickFmt(kind) {
    const loc = T().locale;
    if (kind === "pct") { const f = new Intl.NumberFormat(loc, { style: "percent", maximumFractionDigits: 0 }); return (v) => f.format(v); }
    if (kind === "count") { const f = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }); return (v) => f.format(v); }
    const f = new Intl.NumberFormat(loc, { notation: "compact", maximumFractionDigits: 1 });
    return (v) => f.format(v);
  }
  const signedPct = (v) => (v > 0 ? "+" : "") + NF1.format(v * 100) + "%";

  function rowsFor(measureKey, year, region) {
    const m = M[measureKey];
    const out = [];
    for (const c of D.countries) {
      if (!has(c, year)) continue;
      if (region && c.reg !== region) continue;
      const v = m.value(c, year);
      out.push({ c, v: v || 0 });
    }
    out.sort((a, b) => b.v - a.v);
    return out;
  }

  /* ---------- tooltip ---------- */
  const tip = $("#tooltip");
  function showTip(evt, spec) {
    tip.replaceChildren();
    if (spec.title) tip.append(el("div", { class: "tt-title", text: spec.title }));
    if (spec.big) tip.append(el("div", { class: "tt-big", text: spec.big }));
    if (spec.sub) for (const s of [].concat(spec.sub)) tip.append(el("div", { class: "tt-sub", text: s }));
    if (spec.rows) for (const r of spec.rows) {
      tip.append(el("div", { class: "tt-row" },
        el("span", { class: "k", style: "border-color:" + (r.color || "transparent") }),
        el("span", { class: "n", text: r.name }),
        el("span", { class: "v", text: r.value })));
    }
    tip.hidden = false;
    moveTip(evt);
  }
  function moveTip(evt) {
    const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
    let x = evt.clientX + pad, y = evt.clientY + pad;
    if (x + w > window.innerWidth - 8) x = evt.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = evt.clientY - h - pad;
    tip.style.left = Math.max(8, x) + "px";
    tip.style.top = Math.max(8, y) + "px";
  }
  const hideTip = () => { tip.hidden = true; };

  /* ---------- static text / i18n ---------- */
  function applyLang() {
    setFormats();
    document.documentElement.lang = state.lang;
    document.querySelectorAll("[data-i18n]").forEach((e) => { e.textContent = tr(e.dataset.i18n); });
    document.querySelectorAll("#lang-group button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === state.lang)));
    $("#lang-group").setAttribute("aria-label", tr("language"));
    $("#theme-btn").setAttribute("aria-label", tr("theme"));
    document.querySelectorAll("#tablist button").forEach((b) => { b.textContent = T().tabs[b.dataset.tab]; });
    // measure select
    const sel = $("#measure");
    sel.replaceChildren();
    for (const g of ["tonnage", "power", "fleet"]) {
      const og = el("optgroup", { label: T().groups[g] });
      for (const m of MEASURES.filter((x) => x.group === g)) og.append(el("option", { value: m.key, text: mname(m.key) }));
      sel.append(og);
    }
    sel.value = state.measure;
    // region select
    const rs = $("#region");
    rs.replaceChildren(el("option", { value: "0", text: tr("all_regions") }));
    for (const r of REGION_ORDER) rs.append(el("option", { value: String(r), text: T().regions[r] }));
    rs.value = String(state.region);
    // top-n
    document.querySelectorAll("#topn-group button").forEach((b) => {
      const n = +b.dataset.n;
      b.textContent = n === 40 ? tr("all") : tr("top_n", { n });
    });
    document.querySelectorAll(".mode-group button").forEach((b) => { b.textContent = tr(b.dataset.mode === "pct" ? "mode_pct" : "mode_abs"); });
    $("#table-search").placeholder = tr("search");
    $("#table-search").setAttribute("aria-label", tr("search"));
    $("#dl-csv").textContent = tr("download_csv");
    $("#dl-dta").textContent = tr("download_dta");
    $("#dl-pdf").textContent = tr("download_pdf");
    $("#method").replaceChildren(...T().method_text.map((p) => el("p", { text: p })));
    renderCitations();
    $("#dl-doi").textContent = tr("dataverse");
    $("#foot-text").replaceChildren("Crisher (2026), Power at Sea 2.0 · ",
      el("a", { href: CITE.doi, target: "_blank", rel: "noopener", text: "doi:10.7910/DVN/CW50N0" }), ". " + tr("built_with"));
    $("#map-note").textContent = tr("map_note");
    // codebook
    const li = { en: 1, pt: 2, es: 3 }[state.lang];
    const cb = $("#codebook");
    cb.replaceChildren(
      el("thead", null, el("tr", null, el("th", { text: tr("field") }), el("th", { text: tr("meaning") }))),
      el("tbody", null, ...CODEBOOK.map((r) => el("tr", null, el("td", { text: r[0] }), el("td", { text: r[li] })))));
    fillCountrySelects();
    renderPresets();
    syncPlayLabel();
  }

  const CITE = window.PAS_CITE;
  function citeBlock(label, text) {
    // the DOI inside the reference becomes a link
    const p = el("p", { class: "cite" });
    const at = text.indexOf("https://doi.org/");
    if (at >= 0) p.append(text.slice(0, at), el("a", { href: CITE.doi, target: "_blank", rel: "noopener", text: CITE.doi }), text.slice(at + CITE.doi.length));
    else p.textContent = text;
    const btn = el("button", { type: "button", class: "copy-btn", text: tr("copy") });
    btn.addEventListener("click", () => {
      const done = () => { btn.textContent = tr("copied"); setTimeout(() => { btn.textContent = tr("copy"); }, 1600); };
      const fallback = () => { const r = document.createRange(); r.selectNodeContents(p); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
      try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
    });
    return el("div", { class: "cite-item" }, el("div", { class: "cite-head" }, el("span", { class: "ctl-label", text: label }), btn), p);
  }
  function renderCitations() {
    $("#cite").replaceChildren(el("p", { text: tr("cite_intro") }), citeBlock(tr("cite_v2_label"), CITE.v2), citeBlock(tr("cite_v1_label"), CITE.v1));
  }

  function sortedCountries() {
    return [...D.countries].sort((a, b) => cname(a).localeCompare(cname(b), T().locale));
  }
  function fillCountrySelects() {
    const list = sortedCountries();
    for (const id of ["#cmp-a", "#cmp-b"]) {
      const s = $(id);
      s.replaceChildren(...list.map((c) => el("option", { value: String(c.cow), text: `${cname(c)} (${c.y[0]}–${c.y[c.y.length - 1]})` })));
    }
    $("#cmp-a").value = String(state.cmpA);
    $("#cmp-b").value = String(state.cmpB);
    const add = $("#evo-add");
    add.setAttribute("aria-label", tr("add_country"));
    add.replaceChildren(el("option", { value: "", text: tr("add_country") }),
      ...list.filter((c) => !state.evo.includes(c.cow)).map((c) => el("option", { value: String(c.cow), text: cname(c) })));
  }

  /* ---------- KPIs ---------- */
  function renderKpis() {
    const y = state.year;
    const rows = rowsFor("ton_total", y, 0);
    const total = sysTotal.get(y);
    const prevY = Math.max(Y0, y - 10);
    const prev = sysTotal.get(prevY);
    const leader = rows[0];
    const mrows = rowsFor(state.measure, y, 0).filter((r) => r.v > 0);
    const msum = d3.sum(mrows, (r) => r.v);
    const top5 = msum ? d3.sum(mrows.slice(0, 5), (r) => r.v) / msum : 0;
    const carriers = d3.sum(rows, (r) => raw(r.c, "AircraftCarriers", y));
    const prevCarriers = d3.sum(rowsFor("ton_total", prevY, 0), (r) => raw(r.c, "AircraftCarriers", prevY));
    const k = (label, value, foot) => el("div", { class: "kpi" }, el("span", { class: "kpi-label", text: label }), el("span", { class: "kpi-value", text: value }), foot ? el("span", { class: "kpi-foot" }, ...[].concat(foot)) : null);
    const delta = (now, then) => {
      if (y === prevY || !then) return null;
      const d = (now - then) / then;
      return el("span", { class: d >= 0 ? "delta-up" : "delta-down", text: tr("change_since", { delta: signedPct(d), year: prevY }) });
    };
    $("#kpis").replaceChildren(
      k(tr("kpi_total"), fmt("ton", total, true), delta(total, prev)),
      k(tr("kpi_navies"), NF0.format(rows.length), delta(rows.length, rowsFor("ton_total", prevY, 0).length)),
      k(tr("kpi_leader"), leader ? cname(leader.c) : "–", leader ? `${NFP.format(leader.v / total)} ${tr("kpi_of_total")}` : null),
      k(tr("kpi_top5"), NFP.format(top5), `${tr("kpi_share_top5")} · ${mname(state.measure)}`),
      k(tr("kpi_carriers"), NF0.format(carriers), delta(carriers, prevCarriers)),
    );
  }

  /* ---------- reading text ---------- */
  function readingNodes() {
    const y = state.year, m = M[state.measure];
    const rows = rowsFor(state.measure, y, state.region).filter((r) => r.v > 0);
    const out = [];
    if (!rows.length) { out.push(el("p", { text: tr("no_data") })); return out; }
    const sum = d3.sum(rows, (r) => r.v);
    const lead = rows[0];
    const strong = (t) => el("strong", { text: t });
    const sentence = (tpl, vars) => {
      // build a <p> where {vars} become <strong>
      const p = el("p");
      const parts = T()[tpl].split(/(\{\w+\})/);
      for (const part of parts) {
        const mm = part.match(/^\{(\w+)\}$/);
        if (mm && vars[mm[1]] !== undefined) p.append(strong(vars[mm[1]])); else p.append(part);
      }
      return p;
    };
    const shareTxt = m.kind === "pct" ? NFP.format(lead.v / sum) : NFP.format(lead.v / sum);
    out.push(sentence("read_lead", { year: String(y), leader: cname(lead.c), measure: mname(m.key).toLowerCase(), value: fmt(m.kind, lead.v), share: shareTxt }));
    if (rows[1]) out.push(sentence("read_second", { second: cname(rows[1].c), value2: fmt(m.kind, rows[1].v), ratio: NF1.format(lead.v / rows[1].v) }));
    const top5 = d3.sum(rows.slice(0, 5), (r) => r.v) / sum;
    out.push(sentence("read_top5", { top5: NFP.format(top5), n: NF0.format(rowsFor("ton_total", y, state.region).length) }));
    const py = y - 10;
    if (py >= Y0) {
      const prevRows = rowsFor(state.measure, py, state.region).filter((r) => r.v > 0);
      if (prevRows[0] && prevRows[0].c !== lead.c) out.push(sentence("read_newleader", { year: String(py), old: cname(prevRows[0].c) }));
      const a = state.region ? d3.sum(rowsFor("ton_total", y, state.region), (r) => r.v) : sysTotal.get(y);
      const b = state.region ? d3.sum(rowsFor("ton_total", py, state.region), (r) => r.v) : sysTotal.get(py);
      if (b) out.push(sentence("read_change", { delta: signedPct((a - b) / b) }));
    }
    out.push(el("p", { class: "hint", text: tr("selected_hint") }));
    return out;
  }

  /* ---------- colour scale ---------- */
  function colorScale(m) {
    const interp = d3.interpolateRgb.gamma(1.2)(css("--seq-lo"), css("--seq-hi"));
    if (m.scale === "log") return d3.scaleSequentialLog(interp).domain([m.lo, m.hi]).clamp(true);
    return d3.scaleSequentialSqrt(interp).domain([0, m.hi]).clamp(true);
  }

  /* ---------- MAP ---------- */
  const mapState = { built: false, width: 0 };
  const owners = new Map(); // iso -> [countries]
  for (const c of D.countries) for (const iso of c.iso) { if (!owners.has(iso)) owners.set(iso, []); owners.get(iso).push(c); }
  function ownerFor(iso, y) {
    const list = owners.get(iso);
    if (!list) return null;
    // a successor with data that year wins; modern states before historical ones
    for (const c of list) if (has(c, y)) return c;
    return null;
  }

  function buildMap() {
    const box = $("#map");
    const w = box.clientWidth || 800, h = w / 1.9;
    mapState.width = w;
    const world = topojson.feature(window.PAS_WORLD, window.PAS_WORLD.objects.countries);
    world.features = world.features.filter((f) => f.id !== "010");
    const proj = d3.geoNaturalEarth1().fitExtent([[4, 4], [w - 4, h - 4]], { type: "Sphere" });
    const path = d3.geoPath(proj);
    const svg = d3.select(box).html("").append("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("role", "img");
    svg.append("path").attr("class", "sea").attr("d", path({ type: "Sphere" }));
    svg.append("path").attr("class", "graticule").attr("d", path(d3.geoGraticule10()));
    svg.append("g").selectAll("path").data(world.features).join("path")
      .attr("class", "country").attr("d", path)
      .on("pointermove", (e, f) => mapTip(e, ownerFor(f.id, state.year)))
      .on("pointerleave", hideTip)
      .on("click", (e, f) => { const c = ownerFor(f.id, state.year); if (c) pickCountry(c.cow); });
    const markers = D.countries.filter((c) => c.mk);
    svg.append("g").selectAll("circle").data(markers).join("circle")
      .attr("class", "marker").attr("r", 5)
      .attr("cx", (c) => proj(c.mk)[0]).attr("cy", (c) => proj(c.mk)[1])
      .on("pointermove", (e, c) => mapTip(e, has(c, state.year) ? c : null, c))
      .on("pointerleave", hideTip)
      .on("click", (e, c) => { if (has(c, state.year)) pickCountry(c.cow); });
    mapState.svg = svg;
    mapState.built = true;
  }

  function mapTip(e, c, fallback) {
    const y = state.year, m = M[state.measure];
    if (!c) {
      showTip(e, { title: fallback ? cname(fallback) : tr("no_data"), sub: fallback ? tr("absent", { year: y }) : String(y) });
      return;
    }
    const rows = rowsFor(state.measure, y, 0);
    const rank = rows.findIndex((r) => r.c === c) + 1;
    const v = m.value(c, y);
    showTip(e, {
      title: cname(c),
      big: fmt(m.kind, v),
      sub: [mname(m.key) + " · " + y, tr("tip_rank", { rank, n: rows.length })],
      rows: [
        { name: mname("ton_total"), value: fmt("ton", tonTotal(c, y), true) },
        { name: mname("share"), value: fmt("pct", tonTotal(c, y) / sysTotal.get(y)) },
        { name: mname("ships"), value: fmt("count", raw(c, "grandtotal_count", y)) },
      ],
    });
  }

  function updateMap() {
    if (!mapState.built || Math.abs($("#map").clientWidth - mapState.width) > 2) buildMap();
    const y = state.year, m = M[state.measure];
    const scale = colorScale(m);
    const land = css("--land");
    const fillFor = (c) => {
      if (!c) return land;
      const v = m.value(c, y);
      return v > 0 ? scale(v) : land;
    };
    const dimFor = (c) => state.region && (!c || c.reg !== state.region);
    mapState.svg.selectAll("path.country")
      .classed("empty", (f) => { const c = ownerFor(f.id, y); return !c || !(m.value(c, y) > 0); })
      .classed("dim", (f) => dimFor(ownerFor(f.id, y)))
      .attr("fill", (f) => fillFor(ownerFor(f.id, y)));
    mapState.svg.selectAll("circle.marker")
      .attr("display", (c) => (has(c, y) ? null : "none"))
      .classed("dim", (c) => dimFor(c))
      .attr("fill", (c) => fillFor(has(c, y) ? c : null));
    $("#map-title").textContent = `${mname(m.key)} · ${y}`;
    $("#map-sub").textContent = mdesc(m.key);
    renderRampLegend($("#map-legend"), m, scale);
    $("#reading-map").replaceChildren(...readingNodes());
    renderTopList();
  }

  function renderRampLegend(host, m, scale) {
    const stops = d3.range(0, 1.0001, 0.1).map((t) => {
      const v = m.scale === "log" ? Math.exp(Math.log(m.lo) + t * (Math.log(m.hi) - Math.log(m.lo))) : t * t * m.hi;
      return `${scale(v)} ${t * 100}%`;
    });
    let ticks;
    if (m.scale === "log") {
      const lo = Math.log(m.lo), hi = Math.log(m.hi);
      ticks = [0, 1 / 3, 2 / 3, 1].map((t) => fmt(m.kind, Math.exp(lo + t * (hi - lo)), true));
    } else {
      ticks = [0, 0.25, 0.5, 1].map((t) => fmt(m.kind, Math.round(t * t * m.hi), true));
    }
    host.replaceChildren(
      el("div", { class: "legend-ramp" },
        el("div", { class: "bar", style: `background:linear-gradient(90deg, ${stops.join(",")})` }),
        el("div", { class: "ticks" }, ...ticks.map((t) => el("span", { text: t })))),
      el("span", { class: "legend-empty" }, el("span", { class: "legend-rect", style: "background:var(--land)" }), tr("no_data")));
  }

  function renderTopList() {
    const y = state.year, m = M[state.measure];
    const rows = rowsFor(m.key, y, state.region).filter((r) => r.v > 0).slice(0, 10);
    const sum = d3.sum(rowsFor(m.key, y, 0), (r) => r.v);
    $("#toplist").replaceChildren(...rows.map((r, i) => {
      const li = el("li", { tabindex: "0" },
        el("span", { class: "rk", text: String(i + 1) }),
        el("span", { class: "nm", text: cname(r.c) }),
        el("span", { class: "vl", text: fmt(m.kind, r.v, true) }),
        el("span", { class: "sh", text: m.kind !== "pct" ? NFP.format(r.v / sum) : "" }));
      li.addEventListener("click", () => pickCountry(r.c.cow));
      li.addEventListener("keydown", (e) => { if (e.key === "Enter") pickCountry(r.c.cow); });
      return li;
    }));
  }

  /* ---------- RANKING ---------- */
  function renderRanking() {
    const host = $("#ranking");
    const y = state.year, m = M[state.measure];
    const all = rowsFor(m.key, y, state.region).filter((r) => r.v > 0);
    const rows = state.topN >= 40 ? all : all.slice(0, state.topN);
    const sum = d3.sum(rowsFor(m.key, y, 0), (r) => r.v);
    $("#rank-title").textContent = `${mname(m.key)} · ${y}`;
    $("#rank-sub").textContent = mdesc(m.key);
    document.querySelectorAll("#topn-group button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.n === state.topN)));
    const w = host.clientWidth || 700;
    const narrow = w < 520;
    const rowH = 26, top = 4;
    const labelW = narrow ? 118 : 190, valueW = narrow ? 70 : 120;
    const h = top + Math.max(1, rows.length) * rowH + 4;
    const x = d3.scaleLinear().domain([0, d3.max(rows, (r) => r.v) || 1]).range([0, Math.max(40, w - labelW - valueW - 8)]);
    let svg = d3.select(host).select("svg");
    if (svg.empty()) { svg = d3.select(host).append("svg"); svg.append("g").attr("class", "rows"); }
    svg.attr("viewBox", `0 0 ${w} ${h}`).attr("width", "100%").attr("height", h);
    const dur = state.playing ? 120 : 350;
    const g = svg.select("g.rows").selectAll("g.row").data(rows, (r) => r.c.cow);
    const enter = g.enter().append("g").attr("class", "row").attr("transform", (r, i) => `translate(0,${top + (i + 0.5) * rowH + 20})`).attr("opacity", 0);
    enter.append("text").attr("class", "bar-rank").attr("x", 0).attr("dy", "0.35em");
    enter.append("text").attr("class", "bar-label").attr("x", narrow ? 22 : 28).attr("dy", "0.35em");
    enter.append("rect").attr("class", "bar").attr("x", labelW).attr("y", -8).attr("height", 16).attr("rx", 3);
    enter.append("text").attr("class", "bar-value").attr("dy", "0.35em");
    const merged = enter.merge(g);
    merged.transition().duration(dur).attr("transform", (r, i) => `translate(0,${top + (i + 0.5) * rowH})`).attr("opacity", 1);
    merged.select(".bar-rank").text((r, i) => i + 1);
    merged.select(".bar-label").text((r) => {
      const n = cname(r.c); const max = narrow ? 13 : 24;
      return n.length > max ? n.slice(0, max - 1) + "…" : n;
    });
    merged.select("rect.bar")
      .attr("fill", (r) => css(REGION_SLOT[r.c.reg]))
      .on("pointermove", (e, r) => showTip(e, { title: cname(r.c), big: fmt(m.kind, r.v), sub: [T().regions[r.c.reg], m.kind !== "pct" ? NFP.format(r.v / sum) + " · " + y : String(y)] }))
      .on("pointerleave", hideTip)
      .on("click", (e, r) => pickCountry(r.c.cow))
      .transition().duration(dur).attr("width", (r) => Math.max(2, x(r.v)));
    merged.select(".bar-value").transition().duration(dur).attr("x", (r) => labelW + Math.max(2, x(r.v)) + 6)
      .text((r) => fmt(m.kind, r.v, true));
    g.exit().transition().duration(dur).attr("opacity", 0).remove();
    $("#reading-rank").replaceChildren(...readingNodes(), regionLegend());
  }
  function regionLegend() {
    return el("div", { class: "legend-row" }, ...REGION_ORDER.map((r) =>
      el("span", { class: "legend-item" }, el("span", { class: "legend-rect", style: `background:var(${REGION_SLOT[r]})` }), T().regions[r])));
  }

  /* ---------- generic line chart ---------- */
  function lineChart(host, opt) {
    const w = host.clientWidth || 700;
    const h = opt.height || Math.max(240, Math.min(420, w * 0.5));
    const margin = { top: 14, right: opt.endLabels ? 96 : 18, bottom: 26, left: 56 };
    if (w < 520 && opt.endLabels) margin.right = 18;
    const series = opt.series;
    const [x0, x1] = opt.xDomain;
    const vals = series.flatMap((s) => s.values.filter((d) => d[0] >= x0 && d[0] <= x1).map((d) => d[1]));
    const pos = vals.filter((v) => v > 0);
    const log = opt.log && pos.length;
    const y = log
      ? d3.scaleLog().domain([d3.min(pos), d3.max(pos)]).nice()
      : d3.scaleLinear().domain([0, opt.yMax || d3.max(vals) || 1]).nice();
    y.range([h - margin.bottom, margin.top]);
    const x = d3.scaleLinear().domain([x0, x1]).range([margin.left, w - margin.right]);
    const tf = tickFmt(opt.kind);
    const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("width", "100%").attr("height", h).attr("role", "img");
    let yTicks = log ? y.ticks(5).filter((t, i, a) => a.length <= 6 || Math.log10(t) % 1 === 0) : y.ticks(5);
    if (opt.kind === "count") yTicks = yTicks.filter((t) => Number.isInteger(t));
    svg.append("g").attr("class", "grid").selectAll("line").data(yTicks).join("line")
      .attr("x1", margin.left).attr("x2", w - margin.right).attr("y1", y).attr("y2", y);
    svg.append("g").selectAll("text").data(yTicks).join("text")
      .attr("x", margin.left - 8).attr("y", y).attr("dy", "0.32em").attr("text-anchor", "end").text(tf);
    const xt = x.ticks(w < 520 ? 4 : 8).filter((t) => Number.isInteger(t));
    svg.append("g").selectAll("text").data(xt).join("text")
      .attr("x", x).attr("y", h - 6).attr("text-anchor", "middle").text((d) => d);
    svg.append("line").attr("class", "axis baseline").attr("x1", margin.left).attr("x2", w - margin.right)
      .attr("y1", h - margin.bottom).attr("y2", h - margin.bottom).attr("stroke", css("--rule"));
    if (opt.marker && opt.marker >= x0 && opt.marker <= x1) {
      svg.append("line").attr("class", "year-marker").attr("x1", x(opt.marker)).attr("x2", x(opt.marker)).attr("y1", margin.top).attr("y2", h - margin.bottom);
      const nearEnd = x(opt.marker) > w - margin.right - 40;
      svg.append("text").attr("class", "year-marker-label").attr("x", x(opt.marker) + (nearEnd ? -4 : 4)).attr("y", margin.top + 8)
        .attr("text-anchor", nearEnd ? "end" : "start").text(opt.marker);
    }
    const line = d3.line().defined((d) => d[1] !== null && (!log || d[1] > 0)).x((d) => x(d[0])).y((d) => y(d[1]));
    if (opt.area && series.length === 1) {
      const area = d3.area().defined((d) => d[1] !== null).x((d) => x(d[0])).y0(y(y.domain()[0])).y1((d) => y(d[1]));
      svg.append("path").attr("d", area(series[0].values.filter((d) => d[0] >= x0 && d[0] <= x1))).attr("fill", series[0].color).attr("opacity", 0.14);
    }
    for (const s of series) {
      svg.append("path").attr("fill", "none").attr("stroke", s.color).attr("stroke-width", 2).attr("stroke-linejoin", "round")
        .attr("d", line(s.values.filter((d) => d[0] >= x0 && d[0] <= x1)));
    }
    // end labels (<= 4 series)
    if (opt.endLabels && series.length <= 4 && w >= 520) {
      const ends = series.map((s) => {
        const pts = s.values.filter((d) => d[0] >= x0 && d[0] <= x1 && d[1] !== null && (!log || d[1] > 0));
        const last = pts[pts.length - 1];
        return last ? { s, x: x(last[0]), y: y(last[1]) } : null;
      }).filter(Boolean).sort((a, b) => a.y - b.y);
      for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
      svg.append("g").selectAll("text").data(ends).join("text").attr("class", "dlabel")
        .attr("x", (d) => d.x + 6).attr("y", (d) => d.y).attr("dy", "0.32em")
        .text((d) => (d.s.name.length > 14 ? d.s.name.slice(0, 13) + "…" : d.s.name));
      svg.append("g").selectAll("circle").data(ends).join("circle").attr("cx", (d) => d.x).attr("cy", (d) => y(d.s.values.filter((v) => v[0] <= x1 && v[1] !== null).slice(-1)[0][1]))
        .attr("r", 3.5).attr("fill", (d) => d.s.color).attr("stroke", css("--surface")).attr("stroke-width", 2);
    }
    // crosshair
    const ch = svg.append("line").attr("class", "crosshair").attr("y1", margin.top).attr("y2", h - margin.bottom).attr("opacity", 0);
    const dots = svg.append("g");
    svg.append("rect").attr("x", margin.left).attr("y", 0).attr("width", Math.max(0, w - margin.left - margin.right)).attr("height", h)
      .attr("fill", "transparent")
      .on("pointermove", (e) => {
        const [mx] = d3.pointer(e);
        const yr = Math.round(x.invert(mx));
        if (yr < x0 || yr > x1) return;
        ch.attr("x1", x(yr)).attr("x2", x(yr)).attr("opacity", 1);
        const rows = series.map((s) => { const d = s.values.find((v) => v[0] === yr); return { s, v: d ? d[1] : null }; })
          .sort((a, b) => (b.v ?? -1) - (a.v ?? -1));
        dots.selectAll("circle").data(rows.filter((r) => r.v !== null && (!log || r.v > 0))).join("circle")
          .attr("cx", x(yr)).attr("cy", (r) => y(r.v)).attr("r", 4).attr("fill", (r) => r.s.color).attr("stroke", css("--surface")).attr("stroke-width", 2);
        showTip(e, { title: String(yr), rows: rows.map((r) => ({ color: r.s.color, name: r.s.name, value: r.v === null ? "–" : fmt(opt.kind, r.v, opt.kind === "ton" || opt.kind === "idx") })) });
      })
      .on("pointerleave", () => { ch.attr("opacity", 0); dots.selectAll("circle").remove(); hideTip(); });
    if (opt.legend) {
      opt.legend.replaceChildren(...series.map((s) => el("span", { class: "legend-item" }, el("span", { class: "legend-line", style: "border-color:" + s.color }), s.name)));
    }
  }

  function stackedArea(host, opt) {
    const w = host.clientWidth || 700;
    const h = Math.max(240, Math.min(380, w * 0.5));
    const margin = { top: 14, right: 18, bottom: 26, left: 48 };
    const x = d3.scaleLinear().domain(d3.extent(opt.data, (d) => d.year)).range([margin.left, w - margin.right]);
    const y = d3.scaleLinear().domain([0, 1]).range([h - margin.bottom, margin.top]);
    const stack = d3.stack().keys(opt.keys)(opt.data);
    const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("width", "100%").attr("height", h);
    const area = d3.area().x((d) => x(d.data.year)).y0((d) => y(d[0])).y1((d) => y(d[1]));
    svg.append("g").selectAll("path").data(stack).join("path").attr("d", area)
      .attr("fill", (s) => opt.color(s.key)).attr("stroke", css("--surface")).attr("stroke-width", 1);
    const tf = tickFmt("pct");
    svg.append("g").selectAll("text").data(y.ticks(4)).join("text").attr("x", margin.left - 8).attr("y", y).attr("dy", "0.32em").attr("text-anchor", "end").text(tf);
    svg.append("g").selectAll("text").data(x.ticks(w < 520 ? 4 : 8)).join("text").attr("x", x).attr("y", h - 6).attr("text-anchor", "middle").text((d) => d);
    if (opt.marker) {
      svg.append("line").attr("class", "year-marker").attr("x1", x(opt.marker)).attr("x2", x(opt.marker)).attr("y1", margin.top).attr("y2", h - margin.bottom).attr("stroke", css("--surface")).attr("stroke-width", 1.5).attr("stroke-dasharray", "4 3");
    }
    const ch = svg.append("line").attr("class", "crosshair").attr("y1", margin.top).attr("y2", h - margin.bottom).attr("opacity", 0).attr("stroke", css("--ink"));
    svg.append("rect").attr("x", margin.left).attr("width", w - margin.left - margin.right).attr("height", h).attr("fill", "transparent")
      .on("pointermove", (e) => {
        const yr = Math.round(x.invert(d3.pointer(e)[0]));
        const d = opt.data.find((r) => r.year === yr);
        if (!d) return;
        ch.attr("x1", x(yr)).attr("x2", x(yr)).attr("opacity", 0.6);
        showTip(e, { title: String(yr), rows: [...opt.keys].reverse().map((k) => ({ color: opt.color(k), name: opt.name(k), value: NFP.format(d[k]) })) });
      })
      .on("pointerleave", () => { ch.attr("opacity", 0); hideTip(); });
    opt.legend.replaceChildren(...[...opt.keys].reverse().map((k) => el("span", { class: "legend-item" }, el("span", { class: "legend-rect", style: "background:" + opt.color(k) }), opt.name(k))));
  }

  /* ---------- EVOLUTION ---------- */
  const PRESETS = {
    preset_great: [200, 255, 220, 2, 365, 740, 325, 300],
    preset_cold: [2, 365, 200, 220, 710, 260],
    preset_asia: [710, 740, 732, 750, 900],
    preset_sa: [160, 155, 140, 135],
    preset_p5: [2, 200, 220, 365, 710],
  };
  const PRESET_RANGE = { preset_great: [1865, 1945], preset_cold: [1946, 1991], preset_asia: [1990, 2025], preset_sa: [1865, 1930], preset_p5: [1946, 2025] };
  function renderPresets() {
    $("#evo-presets").replaceChildren(...Object.keys(PRESETS).map((k) => {
      const b = el("button", { type: "button", text: tr(k) });
      b.addEventListener("click", () => {
        state.evo = PRESETS[k].slice();
        [state.evoFrom, state.evoTo] = PRESET_RANGE[k];
        $("#evo-from").value = state.evoFrom; $("#evo-to").value = state.evoTo;
        fillCountrySelects(); renderEvolution();
      });
      return b;
    }));
  }
  const evoColor = new Map();
  function colorForEvo(cow) {
    // colour follows the navy: keep its slot while it stays on the chart
    for (const k of [...evoColor.keys()]) if (!state.evo.includes(k)) evoColor.delete(k);
    if (!evoColor.has(cow)) {
      const used = new Set(evoColor.values());
      evoColor.set(cow, SERIES.find((s) => !used.has(s)) || SERIES[0]);
    }
    return css(evoColor.get(cow));
  }
  // World total of any indicator in a year (cached), used for "% of world total"
  const worldCache = new Map();
  function worldSum(m, y) {
    const k = m.key + "|" + y;
    if (!worldCache.has(k)) {
      let t = 0;
      for (const c of D.countries) { if (has(c, y)) { const v = m.value(c, y); if (v > 0) t += v; } }
      worldCache.set(k, t);
    }
    return worldCache.get(k);
  }
  const pctOfWorld = (m, c, y) => { if (!has(c, y)) return null; const t = worldSum(m, y); return t ? (m.value(c, y) || 0) / t : 0; };
  function seriesFor(c, m) {
    if (state.mode === "pct") return YEARS.map((y) => [y, pctOfWorld(m, c, y)]);
    return YEARS.map((y) => [y, has(c, y) ? m.value(c, y) : null]);
  }
  const modeKind = (m) => (state.mode === "pct" ? "pct" : m.kind);
  function chartTitles(titleEl, subEl, m) {
    if (state.mode === "pct" && m.key !== "share") {
      titleEl.textContent = tr("pct_title", { measure: mname(m.key) });
      subEl.textContent = tr("pct_sub");
    } else {
      titleEl.textContent = tr("over_time", { measure: mname(m.key) });
      subEl.textContent = mdesc(m.key);
    }
  }
  function syncModeButtons() {
    document.querySelectorAll(".mode-group button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === state.mode)));
  }
  function renderEvolution() {
    const m = M[state.measure];
    chartTitles($("#evo-title"), $("#evo-sub"), m);
    syncModeButtons();
    const series = state.evo.map((cow) => C.get(cow)).filter(Boolean).map((c) => ({ name: cname(c), color: colorForEvo(c.cow), values: seriesFor(c, m), cow: c.cow }));
    $("#evo-chips").replaceChildren(...series.map((s) => {
      const btn = el("button", { type: "button", "aria-label": tr("remove") + " " + s.name, text: "×" });
      btn.addEventListener("click", () => { state.evo = state.evo.filter((x) => x !== s.cow); fillCountrySelects(); renderEvolution(); });
      return el("span", { class: "chip" }, el("span", { class: "key", style: "border-color:" + s.color }), s.name, btn);
    }));
    $("#evo-log").checked = state.evoLog;
    const from = Math.min(state.evoFrom, state.evoTo - 1), to = Math.max(state.evoTo, state.evoFrom + 1);
    lineChart($("#evolution"), { series, kind: modeKind(m), log: state.evoLog, xDomain: [from, to], marker: state.year, legend: $("#evo-legend"), endLabels: true });
  }

  /* ---------- COMPARE ---------- */
  const COMP = ["carriers", "battleships", "ssn", "ssk", "ssbn", "assault", "logistic", "big10k", "big5k"];
  function profile(host, c, colorVar) {
    const y = state.year;
    const head = el("h2", null, el("span", { class: "legend-line", style: `border-color:var(${colorVar});width:22px;border-top-width:3px` }), cname(c));
    const tag = el("div", { class: "region-tag", text: `${T().regions[c.reg]} · COW ${c.cow} · ${c.y[0]}–${c.y[c.y.length - 1]}` });
    if (!has(c, y)) { host.replaceChildren(head, tag, el("p", { class: "absent", text: tr("absent", { year: y }) })); return; }
    const rows = rowsFor("ton_total", y, 0);
    const rank = rows.findIndex((r) => r.c === c) + 1;
    const item = (label, value) => [el("div", null, el("dt", { text: label }), el("dd", { text: value }))];
    host.replaceChildren(head, tag, el("dl", null,
      ...item(tr("rank_in_year", { year: y }), `${rank} / ${rows.length}`),
      ...item(mname("ton_total"), fmt("ton", tonTotal(c, y), true)),
      ...item(mname("share"), fmt("pct", tonTotal(c, y) / sysTotal.get(y))),
      ...item(mname("ships"), fmt("count", raw(c, "grandtotal_count", y))),
      ...item(mname("strength"), fmt("idx", raw(c, "navy_strength", y))),
      ...item(mname("big10k"), fmt("count", raw(c, "bigship10k", y))),
    ));
  }
  function butterfly(host, a, b) {
    const y = state.year;
    const w = host.clientWidth || 600;
    const narrow = w < 480;
    const mid = narrow ? 112 : 170;
    const rowH = 30, top = 6;
    const h = top + COMP.length * rowH + 6;
    const pct = state.mode === "pct";
    const abs = (c) => COMP.map((k) => (has(c, y) ? M[k].value(c, y) : 0) || 0);
    const aa = abs(a), ab = abs(b);
    const share = (vals) => vals.map((v, i) => { const t = worldSum(M[COMP[i]], y); return t ? v / t : 0; });
    const va = pct ? share(aa) : aa, vb = pct ? share(ab) : ab;
    const show = (v) => (pct ? NFP.format(v) : NF0.format(v));
    const tipVal = (v, n) => (pct ? `${NFP.format(v)} (${NF0.format(n)})` : NF0.format(v));
    const half = (w - mid) / 2;
    const x = d3.scaleLinear().domain([0, d3.max([...va, ...vb]) || 1]).range([0, half - (pct ? 50 : 34)]);
    const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("width", "100%").attr("height", h);
    const ca = css("--s1"), cb = css("--s2");
    COMP.forEach((k, i) => {
      const cy = top + i * rowH + rowH / 2;
      const g = svg.append("g");
      g.append("line").attr("x1", 0).attr("x2", w).attr("y1", cy + rowH / 2).attr("y2", cy + rowH / 2).attr("stroke", css("--grid"));
      g.append("text").attr("x", w / 2).attr("y", cy).attr("dy", "0.35em").attr("text-anchor", "middle").attr("class", "bar-label")
        .style("font-size", narrow ? "11px" : "12px").text(shortName(k, narrow));
      const wa = va[i] ? Math.max(3, x(va[i])) : 0, wb = vb[i] ? Math.max(3, x(vb[i])) : 0;
      const tipFn = (e) => showTip(e, { title: mname(k), sub: String(y), rows: [{ color: ca, name: cname(a), value: tipVal(va[i], aa[i]) }, { color: cb, name: cname(b), value: tipVal(vb[i], ab[i]) }] });
      g.append("rect").attr("x", half - wa).attr("y", cy - 8).attr("width", wa).attr("height", 16).attr("rx", 3).attr("fill", ca).on("pointermove", tipFn).on("pointerleave", hideTip);
      g.append("rect").attr("x", half + mid).attr("y", cy - 8).attr("width", wb).attr("height", 16).attr("rx", 3).attr("fill", cb).on("pointermove", tipFn).on("pointerleave", hideTip);
      g.append("text").attr("class", "bar-value").attr("x", half - wa - 5).attr("y", cy).attr("dy", "0.35em").attr("text-anchor", "end").text(show(va[i]));
      g.append("text").attr("class", "bar-value").attr("x", half + mid + wb + 5).attr("y", cy).attr("dy", "0.35em").text(show(vb[i]));
      g.append("rect").attr("x", 0).attr("y", cy - rowH / 2).attr("width", w).attr("height", rowH).attr("fill", "transparent").lower()
        .on("pointermove", tipFn).on("pointerleave", hideTip);
    });
  }
  const SHORT = {
    en: { ton_total: "Tonnage", share: "Share", ships: "Ships", strength: "Strength", carriers: "Carriers", battleships: "Battleships", ssn: "SSN / SSGN", ssk: "Diesel subs", ssbn: "SSBN", assault: "Assault ships", logistic: "LPD / LSD", big10k: "≥ 10,000 t", big5k: "≥ 5,000 t" },
    pt: { ton_total: "Tonelagem", share: "Part.", ships: "Navios", strength: "Força", carriers: "Porta-aviões", battleships: "Encouraçados", ssn: "SSN / SSGN", ssk: "Subs. convencionais", ssbn: "SSBN", assault: "Navios de assalto", logistic: "LPD / LSD", big10k: "≥ 10.000 t", big5k: "≥ 5.000 t" },
    es: { ton_total: "Tonelaje", share: "Part.", ships: "Buques", strength: "Fuerza", carriers: "Portaaviones", battleships: "Acorazados", ssn: "SSN / SSGN", ssk: "Subs. convencionales", ssbn: "SSBN", assault: "Buques de asalto", logistic: "LPD / LSD", big10k: "≥ 10.000 t", big5k: "≥ 5.000 t" },
  };
  function shortName(k, narrow) {
    const s = SHORT[state.lang][k];
    return narrow && s.length > 15 ? s.slice(0, 14) + "…" : s;
  }
  function renderCompare() {
    const a = C.get(state.cmpA), b = C.get(state.cmpB);
    $("#cmp-a").value = String(state.cmpA); $("#cmp-b").value = String(state.cmpB);
    profile($("#cmp-profile-a"), a, "--s1");
    profile($("#cmp-profile-b"), b, "--s2");
    syncModeButtons();
    worldSlice(a, b);
    $("#cmp-comp-sub").textContent = tr(state.mode === "pct" ? "composition_pct_note" : "composition_note", { year: state.year });
    butterfly($("#cmp-butterfly"), a, b);
    const m = M[state.measure];
    chartTitles($("#cmp-line-title"), $("#cmp-line-sub"), m);
    const first = Math.min(a.y[0], b.y[0]);
    lineChart($("#cmp-line"), {
      series: [{ name: cname(a), color: css("--s1"), values: seriesFor(a, m) }, { name: cname(b), color: css("--s2"), values: seriesFor(b, m) }],
      kind: modeKind(m), log: false, xDomain: [first, Y1], marker: state.year, legend: $("#cmp-legend"), endLabels: true, height: 300,
    });
  }

  // One 100% bar: navy A, navy B and the rest of the world's tonnage
  function worldSlice(a, b) {
    const y = state.year, m = M.share;
    const sa = has(a, y) ? m.value(a, y) : 0, sb = has(b, y) ? m.value(b, y) : 0;
    const rest = Math.max(0, 1 - sa - sb);
    $("#cmp-slice-title").textContent = tr("world_slice", { year: y });
    const host = $("#cmp-slice");
    const w = host.clientWidth || 700, h = 34, gap = 2;
    const segs = [
      { name: cname(a), v: sa, color: css("--s1"), ton: has(a, y) ? tonTotal(a, y) : 0 },
      { name: cname(b), v: sb, color: css("--s2"), ton: has(b, y) ? tonTotal(b, y) : 0 },
      { name: tr("rest_world"), v: rest, color: css("--land"), ton: sysTotal.get(y) * rest },
    ];
    const svg = d3.select(host).html("").append("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("width", "100%").attr("height", h).attr("role", "img");
    let x0 = 0;
    for (const sg of segs) {
      const sw = sg.v * w;
      if (sw > 0) {
        const r = svg.append("rect").attr("class", "slice-seg").attr("x", x0).attr("y", 0).attr("height", h).attr("rx", 3)
          .attr("width", Math.max(1, sw - (sg === segs[2] ? 0 : gap))).attr("fill", sg.color);
        r.on("pointermove", (e) => showTip(e, { title: sg.name, big: NFP.format(sg.v), sub: [fmt("ton", sg.ton) + " · " + y] })).on("pointerleave", hideTip);
        if (sw > 64) {
          svg.append("text").attr("x", x0 + 8).attr("y", h / 2).attr("dy", "0.35em").attr("pointer-events", "none")
            .style("fill", sg === segs[2] ? css("--ink-2") : "#fff").style("font", "500 13px " + css("--f-mono")).text(NFP.format(sg.v));
        }
      }
      x0 += sw;
    }
    $("#cmp-slice-legend").replaceChildren(...segs.map((sg) => el("span", { class: "legend-item" },
      el("span", { class: "legend-rect", style: "background:" + sg.color }), `${sg.name} · ${NFP.format(sg.v)}`)));
    const p = $("#cmp-slice-text");
    const strongs = (tpl, vars) => {
      const parts = T()[tpl].split(/(\{\w+\})/);
      const frag = [];
      for (const part of parts) { const mm = part.match(/^\{(\w+)\}$/); frag.push(mm ? el("strong", { text: vars[mm[1]] }) : part); }
      return frag;
    };
    if (!has(a, y) || !has(b, y)) {
      const who = !has(a, y) ? cname(a) : cname(b);
      p.replaceChildren(...strongs("slice_one", { who, year: String(y) }));
      return;
    }
    const [hi, lo] = sa >= sb ? [segs[0], segs[1]] : [segs[1], segs[0]];
    const gapPP = NF1.format(Math.abs(sa - sb) * 100);
    const ratio = lo.v > 0 ? NF1.format(hi.v / lo.v) : "∞";
    p.replaceChildren(...strongs("slice_gap", { gap: gapPP, lead: hi.name, ratio, other: lo.name }), " ",
      ...strongs("slice_hist", { sum: NFP.format(sa + sb) }));
  }

  /* ---------- SYSTEM ---------- */
  let sysCache = null;
  function systemData() {
    if (sysCache) return sysCache;
    const region = [], conc = [], cap = { carriers: [], battleships: [], ssn: [], ssbn: [], assault: [] }, big = { big10k: [], big7500: [], big5k: [] }, count = [];
    for (const y of YEARS) {
      const rows = rowsFor("ton_total", y, 0);
      const tot = sysTotal.get(y);
      const r = { year: y };
      for (const k of REGION_ORDER) r[k] = 0;
      for (const row of rows) r[row.c.reg] += row.v / tot;
      region.push(r);
      conc.push([y, rows[0].v / tot, d3.sum(rows.slice(0, 5), (d) => d.v) / tot]);
      for (const k in cap) cap[k].push([y, d3.sum(rows, (d) => M[k].value(d.c, y))]);
      big.big10k.push([y, d3.sum(rows, (d) => raw(d.c, "bigship10k", y))]);
      big.big7500.push([y, d3.sum(rows, (d) => raw(d.c, "bigship7500", y))]);
      big.big5k.push([y, d3.sum(rows, (d) => raw(d.c, "bigship5k", y))]);
      count.push([y, rows.length]);
    }
    sysCache = { region, conc, cap, big, count };
    return sysCache;
  }
  function renderSystem() {
    const s = systemData();
    stackedArea($("#sys-region"), {
      data: s.region, keys: [3, 2, 4, 1, 5], marker: state.year,
      color: (k) => css(REGION_SLOT[k]), name: (k) => T().regions[k], legend: $("#sys-region-legend"),
    });
    lineChart($("#sys-conc"), {
      series: [
        { name: tr("leader_share"), color: css("--s1"), values: s.conc.map((d) => [d[0], d[1]]) },
        { name: tr("top5_share"), color: css("--s2"), values: s.conc.map((d) => [d[0], d[2]]) },
      ], kind: "pct", xDomain: [Y0, Y1], marker: state.year, legend: $("#sys-conc-legend"), yMax: 1, endLabels: true,
    });
    const capKeys = ["battleships", "carriers", "ssn", "ssbn", "assault"];
    lineChart($("#sys-capital"), {
      series: capKeys.map((k, i) => ({ name: SHORT[state.lang][k], color: css(SERIES[i]), values: s.cap[k] })),
      kind: "count", xDomain: [1900, Y1], marker: state.year, legend: $("#sys-capital-legend"),
    });
    const bigNames = { big10k: "≥ 10.000 t", big7500: "≥ 7.500 t", big5k: "≥ 5.000 t" };
    const loc = T().locale;
    const nm = (k) => (loc === "en-US" ? bigNames[k].replace(".", ",") : bigNames[k]);
    lineChart($("#sys-big"), {
      series: ["big10k", "big7500", "big5k"].map((k, i) => ({ name: nm(k), color: css(SERIES[i]), values: s.big[k] })),
      kind: "count", xDomain: [Y0, Y1], marker: state.year, legend: $("#sys-big-legend"), endLabels: true,
    });
    lineChart($("#sys-count"), {
      series: [{ name: tr("navies_count"), color: css("--s1"), values: s.count }],
      kind: "count", xDomain: [Y0, Y1], marker: state.year, area: true, height: 240,
    });
  }

  /* ---------- DATA TABLE ---------- */
  const COLS = [
    { key: "rank", label: () => "#", get: (r) => r.rank, fmt: (v) => v },
    { key: "country", label: () => tr("country"), get: (r) => cname(r.c), fmt: (v) => v, text: true },
    { key: "region", label: () => tr("region"), get: (r) => T().regions[r.c.reg], fmt: (v) => v, text: true },
    { key: "ton_total", m: true },
    { key: "share", m: true },
    { key: "ships", m: true },
    { key: "strength", m: true },
    { key: "carriers", m: true },
    { key: "battleships", m: true },
    { key: "ssn", m: true },
    { key: "ssk", m: true },
    { key: "ssbn", m: true },
    { key: "assault", m: true },
    { key: "big10k", m: true },
  ];
  function renderTable() {
    const y = state.year;
    $("#table-title").textContent = tr("table_title", { year: y });
    let rows = rowsFor("ton_total", y, state.region).map((r, i) => ({ c: r.c, rank: i + 1 }));
    const q = state.search.trim().toLowerCase();
    if (q) rows = rows.filter((r) => Object.values(r.c.n).some((n) => n.toLowerCase().includes(q)));
    const sortKey = state.sort.key || (COLS.some((c) => c.key === state.measure) ? state.measure : "ton_total");
    const col = COLS.find((c) => c.key === sortKey);
    const getv = (r, c) => (c.m ? M[c.key].value(r.c, y) : c.get(r));
    rows.sort((a, b) => {
      const va = getv(a, col), vb = getv(b, col);
      if (col.text) return state.sort.dir * String(va).localeCompare(String(vb), T().locale);
      return state.sort.dir * ((va || 0) - (vb || 0));
    });
    const thead = el("tr", null, ...COLS.map((c) => {
      const th = el("th", { scope: "col", tabindex: "0", text: c.m ? (SHORT[state.lang][c.key] || mname(c.key)) : c.label() });
      if (c.key === sortKey) th.setAttribute("aria-sort", state.sort.dir === 1 ? "ascending" : "descending");
      const act = () => {
        if (c.key === sortKey) state.sort = { key: c.key, dir: -state.sort.dir };
        else state.sort = { key: c.key, dir: c.text || c.key === "rank" ? 1 : -1 };
        renderTable();
      };
      th.addEventListener("click", act);
      th.addEventListener("keydown", (e) => { if (e.key === "Enter") act(); });
      return th;
    }));
    const body = rows.map((r) => el("tr", null, ...COLS.map((c) => {
      const v = getv(r, c);
      return el("td", { text: c.m ? fmt(M[c.key].kind, v, M[c.key].kind === "idx") : c.fmt(v) });
    })));
    $("#table").replaceChildren(el("thead", null, thead), el("tbody", null, ...body));
  }

  /* ---------- interactions ---------- */
  function pickCountry(cow) {
    if (!state.evo.includes(cow)) {
      state.evo.push(cow);
      if (state.evo.length > 8) state.evo.shift();
    }
    if (cow !== state.cmpA) state.cmpB = cow;
    fillCountrySelects();
  }

  function render() {
    renderKpis();
    switch (state.tab) {
      case "map": updateMap(); break;
      case "ranking": renderRanking(); break;
      case "evolution": renderEvolution(); break;
      case "compare": renderCompare(); break;
      case "system": renderSystem(); break;
      case "data": renderTable(); break;
    }
  }

  function setTab(tab, push) {
    if (!T().tabs[tab]) tab = "map";
    state.tab = tab;
    document.querySelectorAll("#tablist button").forEach((b) => {
      const on = b.dataset.tab === tab;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    document.querySelectorAll(".panel").forEach((p) => { p.hidden = p.id !== "panel-" + tab; });
    $(".ctl-region").hidden = !["map", "ranking", "data"].includes(tab);
    if (push && location.hash !== "#" + tab) { try { history.replaceState(null, "", "#" + tab); } catch (e) { /* ignore */ } }
    hideTip();
    render();
  }

  function setYear(y) {
    state.year = Math.max(Y0, Math.min(Y1, y));
    $("#year").value = state.year;
    $("#year-out").textContent = state.year;
    render();
  }
  function syncPlayLabel() {
    const b = $("#play");
    b.classList.toggle("playing", !!state.playing);
    b.setAttribute("aria-label", state.playing ? tr("pause") : tr("play"));
  }
  function togglePlay() {
    if (state.playing) { clearInterval(state.playing); state.playing = null; syncPlayLabel(); render(); return; }
    if (state.year >= Y1) setYear(Y0);
    state.playing = setInterval(() => {
      if (state.year >= Y1) { togglePlay(); return; }
      setYear(state.year + 1);
    }, 160);
    syncPlayLabel();
  }

  function effectiveTheme() {
    const t = document.documentElement.dataset.theme;
    if (t) return t;
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function init() {
    const savedTheme = store.get("theme");
    if (savedTheme === "light" || savedTheme === "dark") document.documentElement.dataset.theme = savedTheme;
    applyLang();
    $("#year").min = Y0; $("#year").max = Y1;
    $("#year").addEventListener("input", (e) => setYear(+e.target.value));
    $("#play").addEventListener("click", togglePlay);
    $("#measure").addEventListener("change", (e) => { state.measure = e.target.value; state.sort = { key: null, dir: -1 }; render(); });
    $("#region").addEventListener("change", (e) => { state.region = +e.target.value; render(); });
    document.querySelectorAll("#lang-group button").forEach((b) => b.addEventListener("click", () => {
      state.lang = b.dataset.lang; store.set("lang", state.lang); applyLang(); render();
    }));
    $("#theme-btn").addEventListener("click", () => {
      const next = effectiveTheme() === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next; store.set("theme", next);
      mapState.built = false; render();
    });
    if (window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { mapState.built = false; render(); });
    document.querySelectorAll("#tablist button").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab, true)));
    $("#tablist").addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const tabs = [...document.querySelectorAll("#tablist button")];
      const i = tabs.findIndex((t) => t.dataset.tab === state.tab);
      const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      setTab(n.dataset.tab, true); n.focus();
    });
    document.querySelectorAll("#topn-group button").forEach((b) => b.addEventListener("click", () => { state.topN = +b.dataset.n; renderRanking(); }));
    $("#evo-add").addEventListener("change", (e) => {
      const v = +e.target.value; if (!v) return;
      state.evo.push(v); if (state.evo.length > 8) state.evo.shift();
      fillCountrySelects(); renderEvolution();
    });
    document.querySelectorAll(".mode-group button").forEach((b) => b.addEventListener("click", () => {
      state.mode = b.dataset.mode; render();
    }));
    $("#evo-log").addEventListener("change", (e) => { state.evoLog = e.target.checked; renderEvolution(); });
    const range = () => {
      const f = +$("#evo-from").value, t = +$("#evo-to").value;
      if (f >= Y0 && f <= Y1) state.evoFrom = f;
      if (t >= Y0 && t <= Y1) state.evoTo = t;
      renderEvolution();
    };
    $("#evo-from").addEventListener("change", range);
    $("#evo-to").addEventListener("change", range);
    $("#cmp-a").addEventListener("change", (e) => { state.cmpA = +e.target.value; renderCompare(); });
    $("#cmp-b").addEventListener("change", (e) => { state.cmpB = +e.target.value; renderCompare(); });
    $("#table-search").addEventListener("input", (e) => { state.search = e.target.value; renderTable(); });
    window.addEventListener("scroll", hideTip, { passive: true });
    let rt;
    const ro = new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { mapState.built = false; render(); }, 150); });
    ro.observe($("#main"));
    const hash = (location.hash || "").replace("#", "");
    setTab(T().tabs[hash] ? hash : "map", false);
    window.addEventListener("hashchange", () => { const h = location.hash.replace("#", ""); if (T().tabs[h] && h !== state.tab) setTab(h, false); });
  }

  init();
})();
