/**
 * Authentication Client Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // Demo fill helper
  const demoBtn = document.getElementById('demo-fill-btn');
  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      const email = document.getElementById('login-email');
      const pwd = document.getElementById('login-password');
      if (email && pwd) {
        email.value = 'alex.morgan@campus.edu';
        pwd.value = 'demo12345';
        FinderApp.showToast('Demo account credentials populated!', 'info');
      }
    });
  }

  // Password toggle
  const toggleBtn = document.getElementById('toggle-password');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      const input = document.getElementById('login-password') || document.getElementById('reg-password');
      if (!input) return;
      const icon = this.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
      }
    });
  }
});
