// Evidence Drawer: right-hand slide-over for one failed check. Deep link: #case/<caseId>/<dimension>.
// The agent's output is untrusted text: it is only ever set with textContent and never altered.
import { esc, parsePairs, prettyValue } from './format.js';
import { ruleText, ruleStatement, dimensionLabel, batchName } from './labels.js';
import { isCritical, isApiError } from './rules.js';
import { icon } from './icons.js';

let root, panel, opener = null, onCloseCb = null, current = null;

export function initDrawer(onClose) {
  onCloseCb = onClose;
  root = document.createElement('div');
  root.className = 'drawer-root';
  root.hidden = true;
  root.innerHTML = `<div class="scrim" data-close></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawerTitle" tabindex="-1"></aside>`;
  document.body.appendChild(root);
  panel = root.querySelector('.drawer');
  root.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) onCloseCb(); });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onCloseCb(); return; }
    if (e.key === 'Tab') trap(e);
    if ((e.key === '[' || e.key === ']') && !e.target.closest('input,textarea')) {
      const a = panel.querySelector(e.key === '[' ? '[data-nav=prev]' : '[data-nav=next]');
      if (a && !a.hasAttribute('aria-disabled')) { e.preventDefault(); a.click(); }
    }
  });
}

function trap(e) {
  const f = [...panel.querySelectorAll('a[href],button:not([disabled]),[tabindex="0"]')].filter((x) => x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

const key = (f) => `${f.caseId}/${f.dimension}`;
const href = (f) => `#case/${encodeURIComponent(f.caseId)}/${encodeURIComponent(f.dimension)}`;

function pairsTable(text, title) {
  const pairs = parsePairs(text);
  if (!pairs) return '';
  return `<dl class="kv" aria-label="${esc(title)}">${pairs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd class="num">${esc(prettyValue(v))}</dd></div>`).join('')}</dl>`;
}

/** Pulls the amount the agent recommended, if the output states one. */
function recommended(out) {
  const m = /recommended=(-?\d+(?:\.\d+)?)/.exec(out || '');
  return m ? m[1] : null;
}

/**
 * Opens (or updates) the drawer.
 * @param {object|null} f the finding, or null when the link does not match the current run
 * @param {Array} list ordered findings for previous/next
 * @param {object} ctx { caseId, dimension, runNumber }
 */
export function openDrawer(f, list, ctx) {
  if (root.hidden) opener = document.activeElement;
  root.hidden = false;
  document.body.classList.add('drawer-open');
  requestAnimationFrame(() => root.classList.add('open'));
  current = f;
  if (!f) {
    panel.innerHTML = `<header class="dh"><div><h2 id="drawerTitle">Finding not in this run</h2></div>
      <button class="btn btn-quiet btn-icon" type="button" data-close aria-label="Close">${icon('close')}</button></header>
      <div class="db"><p class="muted">${esc(ctx.caseId || 'This case')} has no failed ${esc(dimensionLabel(ctx.dimension || ''))} check in ${ctx.runNumber ? `run #${ctx.runNumber}` : 'the current report'}. The link may be from an earlier run; case-level results are not saved between runs.</p></div>`;
    panel.focus();
    return;
  }
  const i = list.findIndex((x) => key(x) === key(f));
  const prev = i > 0 ? list[i - 1] : null;
  const next = i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  const crit = isCritical(f);
  const err = isApiError(f);
  const rec = recommended(f.agentOutput);
  const sev = err ? '<span class="sev sev-error">API error</span>' : crit ? '<span class="sev sev-crit">Critical</span>' : '<span class="sev">Standard</span>';

  panel.innerHTML = `
    <header class="dh">
      <div>
        <p class="dh-meta"><span class="mono">${esc(f.caseId)}</span> · Batch ${esc(f.batch)}, ${esc(batchName(f.batch))} · ${esc(dimensionLabel(f.dimension))}</p>
        <h2 id="drawerTitle">${esc(ruleText(f.ruleViolated))}</h2>
        <p class="dh-rule">${sev}<code class="mono">${esc(f.ruleViolated || '')}</code>${crit ? '<span class="muted">Could cause a wrong payout</span>' : ''}</p>
      </div>
      <button class="btn btn-quiet btn-icon" type="button" data-close aria-label="Close evidence">${icon('close')}</button>
    </header>
    <div class="db">
      <section class="ev-compare" aria-label="Expected versus actual">
        <div class="ev-col">
          <h3>What the rule requires</h3>
          <p class="ev-rule">${esc(ruleStatement(f.ruleViolated))}</p>
          <h4>Values the checker compared</h4>
          ${pairsTable(f.expectedVsActual, 'Values compared') || ''}
          <pre class="raw" data-raw="expected"></pre>
        </div>
        <div class="ev-col ev-agent">
          <h3>What the agent did</h3>
          ${rec ? `<p class="ev-big num">${esc(prettyValue(rec))}<span>recommended</span></p>` : ''}
          <p class="ev-note">Raw output, exactly as returned:</p>
          <pre class="raw raw-agent" data-raw="agent" tabindex="0" aria-label="Agent output, raw text"></pre>
        </div>
      </section>
      <section class="ev-input">
        <h3>Input snapshot</h3>
        ${pairsTable(f.inputSnapshot, 'Input snapshot') || ''}
        <pre class="raw" data-raw="input"></pre>
        <p class="ev-note">The report carries this snapshot only; claim documents are not part of the API response.</p>
      </section>
    </div>
    <footer class="df">
      <a class="btn btn-s" data-nav="prev" href="${prev ? href(prev) : '#'}" ${prev ? '' : 'aria-disabled="true" tabindex="-1"'}>${icon('left')}Previous</a>
      <span class="df-pos num">${i + 1} of ${list.length}</span>
      <a class="btn btn-s" data-nav="next" href="${next ? href(next) : '#'}" ${next ? '' : 'aria-disabled="true" tabindex="-1"'}>Next${icon('right')}</a>
      <button class="btn btn-s btn-quiet" type="button" data-copy>${icon('link')}Copy link</button>
    </footer>`;
  // Untrusted text: textContent only, unchanged.
  panel.querySelector('[data-raw=expected]').textContent = f.expectedVsActual || '';
  panel.querySelector('[data-raw=agent]').textContent = f.agentOutput || '(no output)';
  panel.querySelector('[data-raw=input]').textContent = f.inputSnapshot || '';
  panel.querySelector('[data-copy]').addEventListener('click', async (e) => {
    const url = location.href;
    try { await navigator.clipboard.writeText(url); e.currentTarget.lastChild.textContent = 'Link copied'; } catch { e.currentTarget.lastChild.textContent = 'Copy the address bar'; }
  });
  panel.focus();
}

export function closeDrawer() {
  if (!root || root.hidden) return;
  root.classList.remove('open');
  document.body.classList.remove('drawer-open');
  const done = () => { root.hidden = true; };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) done();
  else setTimeout(done, 260);
  if (opener && document.contains(opener)) opener.focus();
  opener = null;
  current = null;
}

export const drawerOpen = () => root && !root.hidden;
