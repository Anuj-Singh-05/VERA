// Approve / Reject dialog for one batch. Native <dialog> (focus trap, Esc, inert page come free).
// Persists through POST /api/review/{batch}. Guards against double submits; shows failures inline.
import { esc } from './format.js';
import { batchName, statusLabel } from './labels.js';
import { icon } from './icons.js';

let dlg;
let busy = false;

function build() {
  dlg = document.createElement('dialog');
  dlg.className = 'rdlg';
  dlg.setAttribute('aria-labelledby', 'rdlgTitle');
  dlg.innerHTML = `<form method="dialog" class="rdlg-f" novalidate>
    <header><h2 id="rdlgTitle"></h2><button class="btn btn-quiet btn-icon" type="button" data-cancel aria-label="Close">${icon('close')}</button></header>
    <p class="rdlg-effect"></p>
    <label class="field"><span>Reviewer name <b aria-hidden="true">*</b></span>
      <input name="reviewer" autocomplete="name" required maxlength="80" aria-describedby="rdlgNameErr">
      <small class="field-err" id="rdlgNameErr" hidden>Enter your name. Every decision is logged with who made it.</small></label>
    <label class="field"><span>Note <i>(optional)</i></span>
      <textarea name="reason" rows="3" maxlength="500" placeholder="Why you made this decision"></textarea></label>
    <div class="rdlg-err" role="alert" hidden></div>
    <footer><button class="btn" type="button" data-cancel>Cancel</button>
      <button class="btn btn-primary" type="submit" data-ok></button></footer>
  </form>`;
  document.body.appendChild(dlg);
  dlg.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', () => { if (!busy) dlg.close('cancel'); }));
  dlg.addEventListener('cancel', (e) => { if (busy) e.preventDefault(); });
}

/**
 * Opens the dialog. Resolves true after a decision is saved, false if cancelled.
 * @param {object} b BatchSummary
 * @param {boolean} approve
 * @param {(name:string, note:string)=>Promise<void>} submit
 */
export function openReview(b, approve, submit) {
  if (!dlg) build();
  const form = dlg.querySelector('form');
  const ok = dlg.querySelector('[data-ok]');
  const err = dlg.querySelector('.rdlg-err');
  const name = form.elements.reviewer;
  const note = form.elements.reason;
  const nameErr = dlg.querySelector('#rdlgNameErr');
  dlg.dataset.kind = approve ? 'approve' : 'reject';
  dlg.querySelector('h2').textContent = `${approve ? 'Approve' : 'Reject'} batch ${b.batch}: ${batchName(b.batch)}?`;
  dlg.querySelector('.rdlg-effect').innerHTML = approve
    ? `The automatic result was <b>${esc(statusLabel(b.autoStatus))}</b>. Approving marks this batch <b>Certified</b> for this run, signed off by you.`
    : `The automatic result was <b>${esc(statusLabel(b.autoStatus))}</b>. Rejecting marks this batch <b>Blocked</b> for this run, signed off by you.`;
  ok.textContent = approve ? 'Approve batch' : 'Reject batch';
  ok.disabled = false;
  ok.removeAttribute('aria-busy');
  busy = false;
  try { name.value = localStorage.getItem('vera-reviewer') || ''; } catch { name.value = ''; }
  note.value = '';
  err.hidden = true;
  nameErr.hidden = true;
  name.removeAttribute('aria-invalid');

  return new Promise((resolve) => {
    const onSubmit = async (e) => {
      e.preventDefault();
      if (busy) return;
      const who = name.value.trim();
      if (!who) { nameErr.hidden = false; name.setAttribute('aria-invalid', 'true'); name.focus(); return; }
      nameErr.hidden = true; name.removeAttribute('aria-invalid');
      busy = true;
      ok.disabled = true;
      ok.setAttribute('aria-busy', 'true');
      ok.textContent = 'Saving…';
      err.hidden = true;
      try {
        await submit(who, note.value.trim());
        try { localStorage.setItem('vera-reviewer', who); } catch { /* storage blocked */ }
        busy = false;
        cleanup();
        dlg.close('saved');
        resolve(true);
      } catch (ex) {
        busy = false;
        ok.disabled = false;
        ok.removeAttribute('aria-busy');
        ok.textContent = approve ? 'Try again: approve' : 'Try again: reject';
        err.innerHTML = `${icon('alert')}<span>The decision was not saved. ${esc(ex && ex.message ? ex.message : 'Unknown error.')} Nothing changed; you can try again.</span>`;
        err.hidden = false;
      }
    };
    const onClose = () => { if (dlg.returnValue !== 'saved') { cleanup(); resolve(false); } };
    function cleanup() { form.removeEventListener('submit', onSubmit); dlg.removeEventListener('close', onClose); }
    form.addEventListener('submit', onSubmit);
    dlg.addEventListener('close', onClose);
    dlg.returnValue = '';
    dlg.showModal();
    (name.value ? note : name).focus();
  });
}
