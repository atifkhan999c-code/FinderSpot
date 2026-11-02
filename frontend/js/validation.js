/**
 * Client-side Form Validation Utility
 */

const FormValidator = {
  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  },

  isStrongPassword(password) {
    return password && password.length >= 6;
  },

  isValidPhone(phone) {
    const cleaned = String(phone).replace(/\D/g, '');
    return cleaned.length >= 7;
  },

  showError(inputElement, message) {
    inputElement.classList.add('form-error');
    let errorEl = inputElement.parentElement.querySelector('.form-error-msg');
    if (!errorEl) {
      errorEl = document.createElement('p');
      errorEl.className = 'form-error-msg';
      inputElement.parentElement.appendChild(errorEl);
    }
    errorEl.textContent = message;
  },

  clearError(inputElement) {
    inputElement.classList.remove('form-error');
    const errorEl = inputElement.parentElement.querySelector('.form-error-msg');
    if (errorEl) {
      errorEl.remove();
    }
  }
};

window.FormValidator = FormValidator;
