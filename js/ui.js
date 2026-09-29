export const $ = id => document.getElementById(id);
export const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money = n => '$' + Math.round(n).toLocaleString();
export const baht = n => '฿' + Math.round(n).toLocaleString();
export const pts = n => Math.round(n).toLocaleString();
export async function copyText(text, button, success = 'Copied', restore = button.textContent) {
  let ok = false;
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); ok = true; }
    else {
      const field = document.createElement('textarea');
      field.value = text; document.body.append(field); field.select();
      ok = document.execCommand('copy'); field.remove();
    }
  } catch { /* Display the failure without claiming clipboard success. */ }
  button.textContent = ok ? success : "Couldn't copy — try again";
  setTimeout(() => { button.textContent = restore; }, 2600);
  return ok;
}
