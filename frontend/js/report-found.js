/**
 * Report Found Item Controller
 */

function setupReportFound() {
  const dateInput = document.getElementById('item-date');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

document.addEventListener('DOMContentLoaded', setupReportFound);
