/**
 * Dashboard Client Controller
 */

function initDashboard() {
  const items = FinderApp.getItems();
  const lostCount = items.filter(i => i.type === 'lost' && (i.isUserReport || i.reporterName === 'Alex' || i.reporterName === 'Alex Morgan')).length;
  const foundCount = items.filter(i => i.type === 'found' && (i.isUserReport || i.reporterName === 'Alex' || i.reporterName === 'Alex Morgan')).length;

  const lostEl = document.getElementById('dash-lost-count');
  const foundEl = document.getElementById('dash-found-count');
  if (lostEl) lostEl.textContent = lostCount;
  if (foundEl) foundEl.textContent = foundCount;
}

document.addEventListener('DOMContentLoaded', initDashboard);
