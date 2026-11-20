import { checkAll, listCsv, fmtDate, fmtWhen, STATUS } from "./check.js?v=1";
import { DOCS, POLICY, AS_OF, CLINIC, GPS } from "./samples.js?v=1";

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const icon = (id) => `<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;

const ROW = {
  [STATUS.open]: { word: "Open", cls: "st-fail", glyph: "cross" },
  [STATUS.person]: { word: "Needs a person", cls: "st-none", glyph: "none" },
  [STATUS.ok]: { word: "On track", cls: "st-pass", glyph: "check" },
};
const COND = {
  met: { word: "Met", cls: "st-pass", u: "u" },
  notmet: { word: "Not met", cls: "st-fail", u: "u fail" },
  notfound: { word: "Not found", cls: "st-none", u: "u none" },
  review: { word: "Check", cls: "st-none", u: "u none" },
};

const state = { open: null, listed: new Set(), tab: "results", hl: null, stamped: null };
const summary = checkAll(DOCS, POLICY, AS_OF, GPS);

function fieldValue(docKey, line, field) {
  const v = line[field];
  if (v === "" || v === null || v === undefined) return "(blank)";
  if (field === "gp") return GPS[v] || v;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/.test(v)) return field === "dob" ? v.split("-").reverse().join("/") : fmtWhen(v);
  return String(v);
}
const headFor = (doc, field) => DOCS[doc].heads[DOCS[doc].cols.indexOf(field)] || field;

function quoteHtml(r, uCls) {
  const d = DOCS[r.doc];
  const line = d.lines.find((l) => l.id === r.id);
  if (!line) return "";
  return `<button type="button" class="quote" data-doc="${r.doc}" data-line="${r.id}" data-field="${r.field}">
    <span class="src">${esc(d.file)}, ${esc(r.id)}</span>
    <span class="txt">${esc(headFor(r.doc, r.field))}: <span class="${uCls}">${esc(fieldValue(r.doc, line, r.field))}</span></span>
  </button>`;
}

function metaFor(r) {
  if (r.status === STATUS.ok) {
    const seen = r.conditions.find((c) => c.key === "seen");
    if (seen) return seen.note.split(". Policy")[0];
    if (r.conditions.find((c) => c.key === "attempts")) return "Not reached: 3 calls and a letter on record";
    return r.conditions.find((c) => c.key === "told").note.split(". Policy")[0];
  }
  if (r.status === STATUS.person) {
    if (r.conditions.find((c) => c.key === "identity").status !== "met") return "Result does not match the record";
    if (r.conditions.find((c) => c.key === "active")) return "Record says the patient has left";
    return "No action marked by the GP";
  }
  const c = (k) => r.conditions.find((x) => x.key === k && x.status === "notmet");
  let why = "Not booked";
  if (c("number")) why = "SMS went to the old mobile";
  else if (c("seen") && /leave/.test(c("seen").note)) why = "Booked with a GP on leave";
  else if (c("seen") && /Did not attend/.test(c("seen").note)) why = "Did not attend, not rebooked";
  else if (c("attempts")) why = "2 calls, same time of day, no letter";
  const due = r.due ? ` · seen by ${fmtDate(r.due)}${r.due < AS_OF ? ", passed" : ""} (clinic policy)` : "";
  return why + due;
}

function evidenceHtml(r) {
  const condLi = (c) => {
    const s = COND[c.status];
    const quotes = c.refs.slice(0, 4).map((x) => quoteHtml(x, s.u)).join("");
    return `<li class="cond c-${c.status}"><div>
      <div class="cond-l">${esc(c.label)}<span class="w ${s.cls}">${s.word}</span></div>
      <p class="cond-n">${esc(c.note)}</p>
      ${quotes ? `<div class="quotes">${quotes}</div>` : ""}</div></li>`;
  };
  const bad = r.conditions.filter((c) => c.status !== "met");
  const met = r.conditions.filter((c) => c.status === "met");
  const gpLine = `<p class="gp-line"><span class="lbl">${esc(r.result.gp)} wrote</span> <span class="said">${esc(r.result.comment || "(nothing)")}</span></p>`;

  let act = "";
  if (r.status !== STATUS.ok) {
    act = `<p class="next"><span class="lbl">Next step</span> ${esc(r.next)}</p>`;
    act += state.listed.has(r.id)
      ? `<div class="approve-row done"><span class="approved stamp${state.stamped === r.id ? " thunk" : ""}">${icon("check")}On today's list, ${esc(CLINIC.reviewer)}, ${fmtDate(AS_OF)}</span><button type="button" class="btn text" data-undo="${r.id}">Undo</button></div>`
      : `<div class="approve-row"><button type="button" class="btn primary" data-list="${r.id}">Add to today's list as ${esc(CLINIC.reviewer)}</button></div>`;
  } else {
    act = `<p class="held-line">Nothing to do today.</p>`;
  }
  const badHtml = bad.length ? `<section class="ev-sec ev-open"><h3 class="ev-h">${r.status === STATUS.person ? "Why it waits" : "What is still open"}</h3><ul class="conds">${bad.map(condLi).join("")}</ul></section>` : "";
  const metHtml = met.length ? `<section class="ev-sec ev-met"><h3 class="ev-h">${bad.length ? "Also checked" : "All checked"}</h3><ul class="conds">${met.map(condLi).join("")}</ul></section>` : "";
  return `<div class="evidence enter">${gpLine}${badHtml}<div class="ev-act">${act}</div>${metHtml}</div>`;
}

function renderSummary() {
  const sep = `<span class="sep"> · </span>`;
  $("#summary").innerHTML = `<span class="sum-main">${summary.open} of ${summary.results.length} open</span>
    <span class="sum-side"><span class="bx">${summary.person} need a person</span><span class="muted">${sep}<span class="bx">${summary.ontrack} on track</span>${summary.oldestOpen ? `${sep}<span class="bx wide">oldest open since ${fmtDate(summary.oldestOpen)}</span>` : ""}</span></span>`;
}

function renderGroups() {
  const order = [[STATUS.open, "Open, with the next step"], [STATUS.person, "Waits for a person"], [STATUS.ok, "On track"]];
  $("#groups").innerHTML = order.map(([st, h]) => {
    // Open recalls: the one whose seen-by date passed first comes first.
    const rs = summary.results.filter((r) => r.status === st).sort((a, b) => (st === STATUS.open ? ((a.due || "9") < (b.due || "9") ? -1 : (a.due || "9") > (b.due || "9") ? 1 : 0) : 0));
    if (!rs.length) return "";
    return `<div class="group"><h2 class="group-h">${h}</h2><div class="rows">${rs.map((r) => {
      const s = ROW[r.status];
      const open = state.open === r.id;
      return `<div class="row-item"><button type="button" class="row" data-row="${r.id}" aria-expanded="${open}">
        <span class="status ${s.cls}">${icon(s.glyph)}${s.word}</span>
        <span class="what"><b>${esc(r.result.name)} · ${esc(r.result.action || "No action marked")}</b><span class="meta">${esc(metaFor(r))}</span><span class="meta ref">${esc(r.id)} · ${esc(r.result.gp)} · ${esc(fmtWhen(r.result.actioned))}</span></span>
      </button>${open ? evidenceHtml(r) : ""}</div>`;
    }).join("")}</div></div>`;
  }).join("");
  state.stamped = null;
}

function renderList() {
  const n = state.listed.size;
  $("#list-sub").textContent = n
    ? `${n} recall${n === 1 ? "" : "s"} on today's list, each with the number on file, the next step and the record lines behind it.`
    : "Add an open recall and it lands here, with the number on file and the next step.";
  $("#csv").disabled = n === 0;
}

function renderDocs() {
  const keys = Object.keys(DOCS);
  $("#doc-tabs").innerHTML = keys.map((k) => `<button type="button" class="tab" data-tab="${k}" aria-pressed="${state.tab === k}">${esc(DOCS[k].title)}</button>`).join("");
  const d = DOCS[state.tab];
  const rows = d.lines.map((l) => {
    const hl = state.hl && state.hl.id === l.id;
    return `<tr id="ln-${l.id}"${hl ? ' class="hl"' : ""}>${d.cols.map((c) => `<td${hl && state.hl.field === c ? ' class="hit"' : ""}>${esc(c === "id" ? l.id : (l[c] === "" || l[c] == null ? "" : fieldValue(state.tab, l, c)))}</td>`).join("")}</tr>`;
  }).join("");
  $("#doc-file").textContent = d.file;
  $("#doc-grid").innerHTML = `<table class="grid"><thead><tr>${d.heads.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
}

function render() { renderSummary(); renderGroups(); renderList(); renderDocs(); }

document.addEventListener("click", (e) => {
  const row = e.target.closest("[data-row]");
  if (row) { state.open = state.open === row.dataset.row ? null : row.dataset.row; renderGroups(); return; }
  const q = e.target.closest(".quote");
  if (q) {
    state.tab = q.dataset.doc; state.hl = { id: q.dataset.line, field: q.dataset.field };
    renderDocs();
    const tr = document.getElementById("ln-" + q.dataset.line);
    $("#docs").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    if (tr) setTimeout(() => tr.scrollIntoView({ block: "nearest", inline: "nearest" }), 300);
    return;
  }
  const li = e.target.closest("[data-list]");
  if (li) { state.listed.add(li.dataset.list); state.stamped = li.dataset.list; renderGroups(); renderList(); return; }
  const un = e.target.closest("[data-undo]");
  if (un) { state.listed.delete(un.dataset.undo); renderGroups(); renderList(); return; }
  const tab = e.target.closest("[data-tab]");
  if (tab) { state.tab = tab.dataset.tab; state.hl = null; renderDocs(); return; }
  if (e.target.closest("#why-btn")) {
    const b = $("#why-btn"), open = b.getAttribute("aria-expanded") !== "true";
    b.setAttribute("aria-expanded", String(open)); $("#why").hidden = !open; return;
  }
  if (e.target.closest("#csv")) {
    const blob = new Blob([listCsv(summary.results, state.listed, AS_OF)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `recall-list-${AS_OF}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return;
  }
  if (e.target.closest("#reset")) {
    state.open = null; state.listed.clear(); state.tab = "results"; state.hl = null;
    render(); window.scrollTo({ top: 0 });
  }
});

render();
