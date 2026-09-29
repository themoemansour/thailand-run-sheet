const pages = [{"file":"index","title":"The calendar","number":"01"},{"file":"sharing","title":"Share calendar and ledger","number":"02"},{"file":"activities","title":"The list","number":"03"},{"file":"important","title":"Read this part twice","number":"04"},{"file":"before-you-fly","title":"Before you fly","number":"05"},{"file":"transport","title":"Moving between places","number":"06"},{"file":"hotels","title":"Hotels and the credit burn","number":"07"},{"file":"expenses","title":"Settle up","number":"08"},{"file":"food","title":"Eating — and the pork problem","number":"09"},{"file":"health","title":"Health, and what Thai pharmacies will hand you","number":"10"},{"file":"money","title":"Money on the ground","number":"11"},{"file":"scams","title":"Scams, ranked by how often they land","number":"12"},{"file":"unresolved","title":"Still to resolve","number":"13"},{"file":"checklist","number":"14","title":"Checklist"},{"file":"emergency","title":"If something goes wrong","number":"15"},{"file":"links","title":"Links","number":"16"}];
export function initNav() {
  const nav = document.getElementById('pageNav');
  if (!nav) return;
  const page = document.body.dataset.page || 'index';
  const links = pages.map(({file,title,number}) => {
    const a = document.createElement('a');
    a.href = file === 'index' ? 'index.html#calendar'
      : file === 'activities' ? 'index.html#activities'
      : file + '.html';
    a.innerHTML = '<span class="nav-num">' + number + '</span><span>' + title + '</span>';
    return a;
  });
  nav.replaceChildren(...links);
  function updateCurrent() {
    const active = page === 'index' && location.hash === '#activities' ? 'activities' : page;
    links.forEach((link, index) => {
      if (pages[index].file === active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
  updateCurrent();
  window.addEventListener('hashchange', updateCurrent);
}
