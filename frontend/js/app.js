/**
 * FinderSpot Application Controller & Live API Bridge
 * Unified Client Bridge with Real-Time WebSockets (Socket.IO)
 * Connects Frontend UI Forms directly to Node/Express REST APIs, MongoDB, and Live Push Alerts
 */

(function () {
  'use strict';

  // 1. Centralized REST API Client
  if (!window.API) {
    const API_BASE_URL = '/api';

    window.API = {
      getToken() {
        return localStorage.getItem('lf_jwt_token') || '';
      },

      setToken(token) {
        if (token) {
          localStorage.setItem('lf_jwt_token', token);
        } else {
          localStorage.removeItem('lf_jwt_token');
        }
      },

      async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = options.headers || {};
        const token = this.getToken();

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        if (!(options.body instanceof FormData) && !headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }

        try {
          const response = await fetch(url, { ...options, headers });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || `API error (${response.status})`);
          }
          return data;
        } catch (error) {
          console.warn(`[API] Error on ${endpoint}:`, error.message);
          throw error;
        }
      },

      auth: {
        async register(userData) {
          const res = await window.API.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
          });
          if (res.data && res.data.token) {
            window.API.setToken(res.data.token);
            localStorage.setItem('lf_user_session', JSON.stringify(res.data));
          }
          return res;
        },

        async login(email, password) {
          const res = await window.API.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });
          if (res.data && res.data.token) {
            window.API.setToken(res.data.token);
            localStorage.setItem('lf_user_session', JSON.stringify(res.data));
          }
          return res;
        },

        async getProfile() {
          return await window.API.request('/auth/profile');
        },

        logout() {
          window.API.setToken(null);
          localStorage.removeItem('lf_user_session');
          window.location.href = 'login.html';
        },
      },

      items: {
        async getAllLost(params = {}) {
          const query = new URLSearchParams(params).toString();
          return await window.API.request(`/lost-items${query ? '?' + query : ''}`);
        },

        async getAllFound(params = {}) {
          const query = new URLSearchParams(params).toString();
          return await window.API.request(`/found-items${query ? '?' + query : ''}`);
        },

        async getLostById(id) {
          return await window.API.request(`/lost-items/${id}`);
        },

        async getFoundById(id) {
          return await window.API.request(`/found-items/${id}`);
        },

        async createLost(itemData) {
          const isFormData = itemData instanceof FormData;
          return await window.API.request('/lost-items', {
            method: 'POST',
            body: isFormData ? itemData : JSON.stringify(itemData),
          });
        },

        async createFound(itemData) {
          const isFormData = itemData instanceof FormData;
          return await window.API.request('/found-items', {
            method: 'POST',
            body: isFormData ? itemData : JSON.stringify(itemData),
          });
        },

        async search(params = {}) {
          const query = new URLSearchParams(params).toString();
          return await window.API.request(`/search${query ? '?' + query : ''}`);
        },
      },

      claims: {
        async submit(claimData) {
          const isFormData = claimData instanceof FormData;
          return await window.API.request('/claims', {
            method: 'POST',
            body: isFormData ? claimData : JSON.stringify(claimData),
          });
        },
      },

      notifications: {
        async getAll() {
          return await window.API.request('/notifications');
        },
        async markRead(id) {
          return await window.API.request(`/notifications/${id}/read`, { method: 'PUT' });
        },
      },

      admin: {
        async getStats() {
          return await window.API.request('/admin/stats');
        },
        async getAnalytics() {
          return await window.API.request('/admin/analytics');
        },
        async getAuditLogs(params = {}) {
          const query = new URLSearchParams(params).toString();
          return await window.API.request(`/admin/audit-logs${query ? '?' + query : ''}`);
        },
        async getUsers() {
          return await window.API.request('/admin/users');
        },
        async updateUser(id, updates) {
          return await window.API.request(`/admin/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
          });
        },
        async getClaims() {
          return await window.API.request('/admin/claims');
        },
        async updateClaimDecision(id, status, reviewerNotes = '', pickupLocker = '') {
          return await window.API.request(`/admin/claims/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, reviewerNotes, pickupLocker }),
          });
        },
        async logCustody(custodyData) {
          return await window.API.request('/admin/custody', {
            method: 'POST',
            body: JSON.stringify(custodyData),
          });
        },
        async deleteItem(type, id) {
          return await window.API.request(`/admin/items/${type}/${id}`, { method: 'DELETE' });
        },
      },

      async checkHealth() {
        return await window.API.request('/health');
      },
    };
  }

  // 2. Audio Chime Synthesizer (Web Audio API - No external files required)
  function playAudioChime(type = 'match') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'match') {
        // Joyful two-tone ascending match chime (587Hz -> 880Hz -> 1174Hz)
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.15);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(880.0, now);
        osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15);
      } else {
        // Soft chime alert
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440.0, now);
        osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now);
        osc2.frequency.exponentialRampToValueAtTime(880.0, now + 0.12);
      }

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.8);
      osc2.stop(now + 0.8);
    } catch (e) {
      // Audio playback blocked or unsupported, fail gracefully
    }
  }

  // Toast Helper
  function notify(msg, type = 'success') {
    if (window.LFApp && typeof window.LFApp.showToast === 'function') {
      window.LFApp.showToast(msg, type);
    } else {
      let toastBox = document.getElementById('toast-container');
      if (!toastBox) {
        toastBox = document.createElement('div');
        toastBox.id = 'toast-container';
        toastBox.style.cssText =
          'position:fixed;bottom:24px;right:24px;z-index:999999;display:flex;flex-direction:column;gap:12px;max-width:380px;';
        document.body.appendChild(toastBox);
      }
      const el = document.createElement('div');
      const bg =
        type === 'error'
          ? '#ef4444'
          : type === 'warning'
          ? '#f59e0b'
          : type === 'info'
          ? '#3b82f6'
          : '#10b981';
      el.style.cssText = `background:${bg};color:#fff;padding:14px 20px;border-radius:14px;font-weight:600;font-size:13px;box-shadow:0 12px 30px rgba(0,0,0,0.18);line-height:1.4;display:flex;align-items:center;gap:10px;animation:slideInUp 0.3s ease;`;
      el.innerHTML = `<span>${msg}</span>`;
      toastBox.appendChild(el);
      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(10px)';
        el.style.transition = 'all 0.3s ease';
        setTimeout(() => el.remove(), 300);
      }, 4000);
    }
  }

  // 3. Instant Live Match Popup Modal (Full Interactive Real-Time Modal)
  function showLiveMatchModal(matchData) {
    playAudioChime('match');

    // Remove existing modal if any
    const existing = document.getElementById('live-match-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'live-match-modal';
    modal.className =
      'fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200';

    const item = matchData.item || {};
    const title = item.title || 'Matching Property Item';
    const category = item.category || 'General';
    const location = item.location || 'Campus Grounds';
    const image =
      item.image ||
      'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80';
    const link = matchData.link || (item._id ? `item-details.html?id=${item._id}` : 'browse-items.html');

    modal.innerHTML = `
      <div class="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-emerald-500 animate-in zoom-in-95 duration-200">
        <!-- Top Flash Header -->
        <div class="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl animate-pulse">
              <i class="fas fa-sparkles"></i>
            </div>
            <div>
              <span class="text-xs font-black tracking-widest uppercase text-emerald-100 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span> Real-Time Match Detected
              </span>
              <h3 class="font-extrabold text-base leading-tight">Instant Property Overlap Alert!</h3>
            </div>
          </div>
          <button id="close-match-modal-btn" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Content Body -->
        <div class="p-6">
          <p class="text-xs text-slate-500 mb-4 font-medium">
            Our automated matching engine just detected a newly submitted item that matches your reported lost property:
          </p>

          <div class="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 mb-5">
            <img src="${image}" alt="${title}" class="w-20 h-20 rounded-xl object-cover border border-slate-200 shadow-sm flex-shrink-0" onerror="this.src='https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=300&q=80'">
            <div class="flex-grow min-w-0">
              <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 uppercase tracking-wider">${category}</span>
              <h4 class="font-bold text-slate-900 text-sm mt-1 truncate">${title}</h4>
              <p class="text-xs text-slate-500 mt-1 flex items-center gap-1.5 truncate">
                <i class="fas fa-map-marker-alt text-emerald-500"></i> ${location}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <a href="${link}" class="flex-grow py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs text-center shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2">
              <i class="fas fa-check-circle"></i> View Matched Item & Verify
            </a>
            <button id="dismiss-match-modal-btn" class="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    document.getElementById('close-match-modal-btn').onclick = close;
    document.getElementById('dismiss-match-modal-btn').onclick = close;

    // Update Notification Bell Count
    updateNotificationBadge();
  }

  // 4. Instant Live Claim Alert Popup
  function showLiveClaimModal(claimData) {
    playAudioChime('alert');

    notify(
      `🔔 Claim Notice: ${claimData.claimantName || 'Someone'} submitted an ownership claim for your found item!`,
      'info'
    );
    updateNotificationBadge();
  }

  // Helper to bump notification badge on UI
  function updateNotificationBadge() {
    document.querySelectorAll('.notification-badge').forEach((badge) => {
      let current = parseInt(badge.textContent, 10) || 0;
      current += 1;
      badge.textContent = current;
      badge.classList.remove('hidden');
      badge.classList.add('animate-bounce');
      setTimeout(() => badge.classList.remove('animate-bounce'), 2000);
    });
  }

  // 5. Initialize Real-Time WebSockets Client (Socket.IO)
  let socketInstance = null;

  function initRealtimeSocket() {
    if (typeof io === 'undefined') {
      console.warn('Socket.IO client library not loaded yet.');
      return;
    }

    try {
      socketInstance = io(window.location.origin, {
        transports: ['websocket', 'polling'],
      });
      window.socket = socketInstance;

      socketInstance.on('connect', () => {
        console.log('⚡ [WebSockets] Connected to FinderSpot Live Server via Socket.IO:', socketInstance.id);

        // Join user's personal channel if logged in
        const userSession = JSON.parse(localStorage.getItem('lf_user_session') || '{}');
        const userId = userSession._id || userSession.id;
        if (userId) {
          socketInstance.emit('join_user_room', userId);
          console.log(`👤 [WebSockets] Subscribed to real-time events for User ID: ${userId}`);
        }
      });

      // Listen for Live Match Alert
      socketInstance.on('match_alert', (data) => {
        console.log('🎉 [WebSockets] Match Alert Received:', data);
        showLiveMatchModal(data);
      });

      // Listen for Live Claim Alert
      socketInstance.on('claim_alert', (data) => {
        console.log('🔔 [WebSockets] Claim Alert Received:', data);
        showLiveClaimModal(data);
      });

      // Listen for Broadcasted New Items
      socketInstance.on('new_found_item', (item) => {
        console.log('📢 [WebSockets] New Found Item Broadcasted:', item.title);
        notify(`📢 New found item reported: "${item.title}" at ${item.location}`, 'info');
        if (typeof syncLiveItems === 'function') {
          syncLiveItems();
        }
      });

      socketInstance.on('new_lost_item', (item) => {
        console.log('📢 [WebSockets] New Lost Item Broadcasted:', item.title);
        notify(`⚠️ New lost report posted: "${item.title}" (${item.category})`, 'warning');
        if (typeof syncLiveItems === 'function') {
          syncLiveItems();
        }
      });

      socketInstance.on('disconnect', () => {
        console.log('⚡ [WebSockets] Disconnected from server. Reconnecting automatically...');
      });
    } catch (err) {
      console.warn('WebSocket connection error:', err.message);
    }
  }

  // Inject Socket.IO script dynamically if not present
  function ensureSocketClientScript() {
    if (typeof io !== 'undefined') {
      initRealtimeSocket();
      return;
    }

    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.onload = () => {
      initRealtimeSocket();
    };
    script.onerror = () => {
      // Fallback to CDN if local script fails
      const cdnScript = document.createElement('script');
      cdnScript.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
      cdnScript.onload = () => {
        initRealtimeSocket();
      };
      document.head.appendChild(cdnScript);
    };
    document.head.appendChild(script);
  }

  // 6. Hook Auth Forms (Login & Register)
  function setupAuthForms() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const pwd = document.getElementById('login-password').value;
        const errBox = document.getElementById('login-error-alert');
        const btn = loginForm.querySelector('button[type="submit"]');
        const originalBtnHtml = btn ? btn.innerHTML : 'Sign In to FinderSpot';

        if (errBox) errBox.classList.add('hidden');
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Authenticating...';
        }

        try {
          const res = await window.API.auth.login(email, pwd);
          notify(`Welcome back, ${res.data.name}! Redirecting...`, 'success');
          localStorage.setItem('lf_user_session', JSON.stringify(res.data));

          // Join Socket room immediately on login
          if (socketInstance && res.data._id) {
            socketInstance.emit('join_user_room', res.data._id);
          }

          const urlParams = new URLSearchParams(window.location.search);
          const redirectTarget = urlParams.get('redirect') || 'dashboard.html';
          setTimeout(() => {
            window.location.href = redirectTarget;
          }, 600);
        } catch (err) {
          const msg = err.message || 'Invalid email address or password';
          notify(msg, 'error');
          if (errBox) {
            errBox.textContent = msg;
            errBox.classList.remove('hidden');
          }
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalBtnHtml;
          }
        }
      };
    }

    const regForm = document.getElementById('register-form');
    if (regForm) {
      regForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const phone = document.getElementById('reg-phone') ? document.getElementById('reg-phone').value.trim() : '';
        const role = document.getElementById('reg-role') ? document.getElementById('reg-role').value : 'Student';
        const studentId = document.getElementById('reg-id') ? document.getElementById('reg-id').value.trim() : '';
        const password = document.getElementById('reg-password').value;
        const confirmPwd = document.getElementById('reg-confirm-password').value;
        const errBox = document.getElementById('register-error-alert');
        const btn = regForm.querySelector('button[type="submit"]');
        const originalBtnHtml = btn ? btn.innerHTML : 'Create Account & Continue';

        if (errBox) errBox.classList.add('hidden');
        if (password.length < 6) {
          const msg = 'Password must be at least 6 characters long.';
          notify(msg, 'warning');
          if (errBox) {
            errBox.textContent = msg;
            errBox.classList.remove('hidden');
          }
          return;
        }
        if (password !== confirmPwd) {
          const msg = 'Passwords do not match. Please verify both fields.';
          notify(msg, 'error');
          if (errBox) {
            errBox.textContent = msg;
            errBox.classList.remove('hidden');
          }
          return;
        }

        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Creating Account...';
        }

        try {
          const res = await window.API.auth.register({ name, email, phone, role, studentId, password });
          notify(`Account created! Welcome, ${res.data.name}`, 'success');
          localStorage.setItem('lf_user_session', JSON.stringify(res.data));

          if (socketInstance && res.data._id) {
            socketInstance.emit('join_user_room', res.data._id);
          }

          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 700);
        } catch (err) {
          const msg = err.message || 'Registration failed. Please check your details.';
          notify(msg, 'error');
          if (errBox) {
            errBox.textContent = msg;
            errBox.classList.remove('hidden');
          }
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalBtnHtml;
          }
        }
      };
    }
  }

  // 7. Hook Item Reporting (Lost & Found)
  function setupReportingForms() {
    const lostForm = document.getElementById('lost-report-form');
    if (lostForm) {
      lostForm.onsubmit = async (e) => {
        e.preventDefault();
        const btn = lostForm.querySelector('button[type="submit"]');
        const fileInput = document.getElementById('image-file-input');
        const formData = new FormData();

        formData.append('title', document.getElementById('item-title').value.trim());
        formData.append('category', document.getElementById('item-category').value);
        formData.append('location', document.getElementById('item-location').value.trim());
        if (document.getElementById('item-lat') && document.getElementById('item-lat').value) {
          formData.append('lat', document.getElementById('item-lat').value);
        }
        if (document.getElementById('item-lng') && document.getElementById('item-lng').value) {
          formData.append('lng', document.getElementById('item-lng').value);
        }
        formData.append('date', document.getElementById('item-date').value);
        if (document.getElementById('item-time')) formData.append('time', document.getElementById('item-time').value);
        if (document.getElementById('item-reward')) formData.append('reward', document.getElementById('item-reward').value.trim());
        formData.append('description', document.getElementById('item-desc').value.trim());
        if (document.getElementById('item-tags') && document.getElementById('item-tags').value) {
          formData.append('tags', document.getElementById('item-tags').value.trim());
        }
        if (document.getElementById('item-security-q')) formData.append('securityQuestion', document.getElementById('item-security-q').value.trim());

        if (fileInput && fileInput.files && fileInput.files[0]) {
          formData.append('image', fileInput.files[0]);
        }

        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving to Database...';
        }

        try {
          const res = await window.API.items.createLost(formData);
          notify('Lost item report saved in MongoDB database!', 'success');
          setTimeout(() => {
            window.location.href = `item-details.html?id=${res.data._id}&type=lost`;
          }, 800);
        } catch (err) {
          console.error(err);
          notify('Saved locally: ' + err.message, 'info');
          if (window.LFApp && window.LFApp.saveItem) {
            const local = window.LFApp.saveItem({
              title: document.getElementById('item-title').value.trim(),
              type: 'lost',
              category: document.getElementById('item-category').value,
              location: document.getElementById('item-location').value.trim(),
              date: document.getElementById('item-date').value,
              description: document.getElementById('item-desc').value.trim(),
            });
            setTimeout(() => {
              window.location.href = `item-details.html?id=${local.id}`;
            }, 800);
          }
        }
      };
    }

    const foundForm = document.getElementById('found-report-form');
    if (foundForm) {
      foundForm.onsubmit = async (e) => {
        e.preventDefault();
        const btn = foundForm.querySelector('button[type="submit"]');
        const fileInput = document.getElementById('image-file-input');
        const formData = new FormData();

        formData.append('title', document.getElementById('item-title').value.trim());
        formData.append('category', document.getElementById('item-category').value);
        formData.append('location', document.getElementById('item-location').value.trim());
        if (document.getElementById('item-lat') && document.getElementById('item-lat').value) {
          formData.append('lat', document.getElementById('item-lat').value);
        }
        if (document.getElementById('item-lng') && document.getElementById('item-lng').value) {
          formData.append('lng', document.getElementById('item-lng').value);
        }
        formData.append('date', document.getElementById('item-date').value);
        formData.append('description', document.getElementById('item-desc').value.trim());
        if (document.getElementById('item-tags') && document.getElementById('item-tags').value) {
          formData.append('tags', document.getElementById('item-tags').value.trim());
        }
        if (document.getElementById('item-security-q')) formData.append('securityQuestion', document.getElementById('item-security-q').value.trim());

        if (fileInput && fileInput.files && fileInput.files[0]) {
          formData.append('image', fileInput.files[0]);
        }

        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Running Matching Engine...';
        }

        try {
          const res = await window.API.items.createFound(formData);
          notify('Found report submitted! Matching scan complete.', 'success');
          setTimeout(() => {
            window.location.href = `item-details.html?id=${res.data._id}&type=found`;
          }, 800);
        } catch (err) {
          console.error(err);
          notify('Saved locally: ' + err.message, 'info');
          if (window.LFApp && window.LFApp.saveItem) {
            const local = window.LFApp.saveItem({
              title: document.getElementById('item-title').value.trim(),
              type: 'found',
              category: document.getElementById('item-category').value,
              location: document.getElementById('item-location').value.trim(),
              date: document.getElementById('item-date').value,
              description: document.getElementById('item-desc').value.trim(),
            });
            setTimeout(() => {
              window.location.href = `item-details.html?id=${local.id}`;
            }, 800);
          }
        }
      };
    }
  }

  // 8. Synchronize Live MongoDB Items with Frontend UI (Only when signed in)
  async function syncLiveItems() {
    const token = window.API ? window.API.getToken() : localStorage.getItem('lf_jwt_token');
    if (!token) return; // Never fetch or render reports before login

    const path = window.location.pathname.toLowerCase();
    const isBrowse = path.includes('browse-items');
    const isDashboard = path.includes('dashboard');
    const isHome = path.endsWith('index.html') || path === '/';

    if (!isBrowse && !isDashboard && !isHome) return;

    try {
      const [lostRes, foundRes] = await Promise.allSettled([
        window.API.items.getAllLost({ limit: 40 }),
        window.API.items.getAllFound({ limit: 40 }),
      ]);

      const lostItems = (lostRes.status === 'fulfilled' && lostRes.value && lostRes.value.data) || [];
      const foundItems = (foundRes.status === 'fulfilled' && foundRes.value && foundRes.value.data) || [];
      const items = [];

      lostItems.forEach((item) => {
        items.push({
          id: item._id,
          title: item.title,
          type: 'lost',
          category: item.category,
          location: item.location,
          date: item.date ? String(item.date).split('T')[0] : 'Recent',
          time: item.time || '',
          reward: item.reward || '',
          status: item.status || 'active',
          description: item.description,
          image: item.image || 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&w=800&q=80',
          reporterName: item.reporterName || 'Member',
          isUserReport: false,
        });
      });

      foundItems.forEach((item) => {
        items.push({
          id: item._id,
          title: item.title,
          type: 'found',
          category: item.category,
          location: item.location,
          date: item.date ? String(item.date).split('T')[0] : 'Recent',
          time: item.time || '',
          reward: '',
          status: item.status || 'active',
          description: item.description,
          image: item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
          reporterName: item.reporterName || 'Community Member',
          isUserReport: false,
        });
      });

      localStorage.setItem('lf_items_data', JSON.stringify(items));

      if (typeof window.renderItems === 'function') {
        window.renderItems();
      }

      // Render Homepage Grids if on index.html
      if (isHome) {
        const lostGrid = document.getElementById('home-lost-grid');
        const foundGrid = document.getElementById('home-found-grid');

        if (lostGrid) {
          const topLost = items.filter((i) => i.type === 'lost').slice(0, 4);
          lostGrid.innerHTML =
            topLost.length === 0
              ? '<div class="col-span-full text-center py-8 text-slate-400 text-sm">No lost item reports yet.</div>'
              : topLost
                  .map(
                    (i) => `
                <div class="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-lg transition-all group flex flex-col">
                  <div class="relative h-48 overflow-hidden bg-slate-100">
                    <img src="${i.image}" alt="${i.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                    <span class="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 text-white shadow-sm">LOST</span>
                    ${i.reward ? `<span class="absolute bottom-3 right-3 px-2 py-0.5 rounded-md text-xs font-semibold bg-white/90 text-slate-800 backdrop-blur-sm shadow-sm">Reward: ${i.reward}</span>` : ''}
                  </div>
                  <div class="p-5 flex flex-col flex-grow">
                    <div class="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">${i.category}</div>
                    <h3 class="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors line-clamp-1">${i.title}</h3>
                    <p class="text-xs text-slate-500 mt-2 line-clamp-2">${i.description || ''}</p>
                    <div class="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500 flex-grow">
                      <div class="flex items-center gap-2"><i class="fas fa-map-marker-alt text-rose-500 w-3.5"></i> <span class="truncate">${i.location}</span></div>
                      <div class="flex items-center gap-2"><i class="far fa-clock text-slate-400 w-3.5"></i> <span>${i.date}</span></div>
                    </div>
                    <a href="item-details.html?id=${i.id}&type=lost" class="mt-4 w-full py-2 px-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white font-semibold text-xs text-center transition-colors">View Details</a>
                  </div>
                </div>`
                  )
                  .join('');
        }

        if (foundGrid) {
          const topFound = items.filter((i) => i.type === 'found').slice(0, 4);
          foundGrid.innerHTML =
            topFound.length === 0
              ? '<div class="col-span-full text-center py-8 text-slate-400 text-sm">No found item reports yet.</div>'
              : topFound
                  .map(
                    (i) => `
                <div class="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-lg transition-all group flex flex-col">
                  <div class="relative h-48 overflow-hidden bg-slate-100">
                    <img src="${i.image}" alt="${i.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                    <span class="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm">FOUND</span>
                  </div>
                  <div class="p-5 flex flex-col flex-grow">
                    <div class="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">${i.category}</div>
                    <h3 class="font-bold text-slate-900 text-base group-hover:text-emerald-600 transition-colors line-clamp-1">${i.title}</h3>
                    <p class="text-xs text-slate-500 mt-2 line-clamp-2">${i.description || ''}</p>
                    <div class="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500 flex-grow">
                      <div class="flex items-center gap-2"><i class="fas fa-map-marker-alt text-emerald-500 w-3.5"></i> <span class="truncate">${i.location}</span></div>
                      <div class="flex items-center gap-2"><i class="far fa-clock text-slate-400 w-3.5"></i> <span>${i.date}</span></div>
                    </div>
                    <a href="item-details.html?id=${i.id}&type=found" class="mt-4 w-full py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white font-semibold text-xs text-center transition-colors">Claim This Item</a>
                  </div>
                </div>`
                  )
                  .join('');
        }
      }
    } catch (e) {
      console.warn('Sync notice:', e.message);
    }
  }

  // Hydrate Dashboard dynamically ONLY with current logged-in user's reports & activity
  async function hydrateUserDashboard() {
    const path = window.location.pathname.toLowerCase();
    if (!path.includes('dashboard')) return;
    if (!window.API || !window.API.getToken()) return;

    try {
      const [myLostRes, myFoundRes, notifRes] = await Promise.allSettled([
        window.API.request('/lost-items/my-reports'),
        window.API.request('/found-items/my-reports'),
        window.API.notifications.getAll(),
      ]);

      const myLost = (myLostRes.status === 'fulfilled' && myLostRes.value && myLostRes.value.data) || [];
      const myFound = (myFoundRes.status === 'fulfilled' && myFoundRes.value && myFoundRes.value.data) || [];
      const notifs = (notifRes.status === 'fulfilled' && notifRes.value && notifRes.value.data) || [];

      const activeLost = myLost.filter((i) => i.status === 'active').length;
      const activeFound = myFound.filter((i) => i.status === 'active').length;
      const resolvedCount = [...myLost, ...myFound].filter((i) => i.status === 'returned' || i.status === 'claimed').length;

      const lostEl = document.getElementById('dash-lost-count');
      const foundEl = document.getElementById('dash-found-count');
      const totalEl = document.getElementById('dash-total-count');
      const resolvedEl = document.getElementById('dash-resolved-count');
      const subEl = document.getElementById('dash-greeting-sub');

      if (lostEl) lostEl.textContent = activeLost;
      if (foundEl) foundEl.textContent = activeFound;
      if (totalEl) totalEl.textContent = myLost.length + myFound.length;
      if (resolvedEl) resolvedEl.textContent = resolvedCount;
      if (subEl) {
        subEl.textContent = `You currently have ${activeLost} active lost item report(s) and ${activeFound} found item report(s).`;
      }

      const listEl = document.getElementById('dash-reports-list');
      if (listEl) {
        const combined = [
          ...myLost.map((i) => ({ ...i, type: 'lost' })),
          ...myFound.map((i) => ({ ...i, type: 'found' })),
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (combined.length === 0) {
          listEl.innerHTML = `
            <div class="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <div class="w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3 text-lg">
                <i class="fas fa-folder-open"></i>
              </div>
              <p class="text-sm font-bold text-slate-700">No reports submitted yet</p>
              <p class="text-xs text-slate-500 mt-1 mb-4">Report a lost or found item to track it here.</p>
              <div class="flex items-center justify-center gap-2">
                <a href="report-lost.html" class="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors">Report Lost</a>
                <a href="report-found.html" class="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors">Report Found</a>
              </div>
            </div>
          `;
        } else {
          listEl.innerHTML = combined
            .slice(0, 5)
            .map((item) => {
              const isLost = item.type === 'lost';
              const badgeCls = isLost ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700';
              const dateStr = item.date ? String(item.date).split('T')[0] : 'Recent';
              return `
                <div class="p-4 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
                  <div class="flex items-center gap-3.5">
                    <img src="${item.image || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=150&q=80'}" alt="${item.title}" class="w-16 h-16 rounded-xl object-cover border border-slate-200">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${badgeCls}">${item.type.toUpperCase()}</span>
                        <span class="text-xs font-semibold text-slate-400 uppercase">${item.status || 'active'}</span>
                      </div>
                      <h3 class="text-sm font-bold text-slate-900 mt-1">${item.title}</h3>
                      <p class="text-xs text-slate-500 mt-0.5"><i class="fas fa-map-marker-alt text-indigo-500 mr-1"></i> ${item.location} • ${dateStr}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 self-end sm:self-center">
                    <a href="item-details.html?id=${item._id}&type=${item.type}" class="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold">View</a>
                  </div>
                </div>`;
            })
            .join('');
        }
      }

      const actEl = document.getElementById('dash-activity-list');
      if (actEl) {
        if (notifs.length === 0) {
          actEl.innerHTML = '<p class="text-xs text-slate-400 italic">No recent activity alerts.</p>';
        } else {
          actEl.innerHTML = notifs
            .slice(0, 4)
            .map(
              (n) => `
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                  <i class="fas fa-bell"></i>
                </div>
                <div class="text-xs">
                  <p class="font-semibold text-slate-800">${n.title}</p>
                  <p class="text-slate-500 text-[11px]">${n.message}</p>
                </div>
              </div>`
            )
            .join('');
        }
      }
    } catch (err) {
      console.warn('Dashboard hydration notice:', err.message);
    }
  }

  // 9. Setup Header Navigation Auth State (Sign In / User Dropdown & Logout)
  function setupHeaderAuthUI() {
    const token = window.API ? window.API.getToken() : localStorage.getItem('lf_jwt_token');
    let currentUser = null;
    try {
      const str = localStorage.getItem('lf_user_session');
      if (token && str) currentUser = JSON.parse(str);
    } catch (e) {}

    // Gate ALL Lost & Found report creation, browsing, details, maps, and account pages behind login
    const protectedPages = [
      'dashboard',
      'profile',
      'my-reports',
      'my-claims',
      'notifications',
      'admin',
      'browse-items',
      'browse',
      'report-lost',
      'report-found',
      'item-details',
      'map',
    ];
    const pathLower = window.location.pathname.toLowerCase();
    const isProtected = protectedPages.some((p) => pathLower.endsWith(`/${p}`) || pathLower.endsWith(`/${p}.html`));
    if (!currentUser && isProtected) {
      localStorage.removeItem('lf_items_data');
      const targetPage = window.location.pathname.split('/').pop() || 'dashboard.html';
      window.location.href = `login.html?redirect=${encodeURIComponent(targetPage + window.location.search)}`;
      return;
    }

    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');
    const userMenuWrapper = userMenuBtn ? userMenuBtn.closest('.relative') : null;
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    // Toggle Homepage Gates
    const homeAuthGate = document.getElementById('home-auth-gate');
    const homeReportsWall = document.getElementById('home-reports-wall');
    const homeSearchWidget = document.getElementById('home-search-widget');

    if (mobileMenuBtn && mobileMenu && !mobileMenuBtn.dataset.bound) {
      mobileMenuBtn.dataset.bound = 'true';
      mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
      });
    }

    if (currentUser) {
      // Authenticated state
      if (homeAuthGate) homeAuthGate.classList.add('hidden');
      if (homeReportsWall) homeReportsWall.classList.remove('hidden');
      if (homeSearchWidget) homeSearchWidget.classList.remove('hidden');

      if (userMenuWrapper) userMenuWrapper.classList.remove('hidden');
      const existingGuestBtns = document.getElementById('header-guest-auth-btns');
      if (existingGuestBtns) existingGuestBtns.classList.add('hidden');

      document.querySelectorAll('.user-display-name').forEach((el) => {
        el.textContent = currentUser.name || 'Member';
      });
      document.querySelectorAll('.user-display-email').forEach((el) => {
        el.textContent = currentUser.email || '';
      });
      document.querySelectorAll('.user-display-avatar').forEach((el) => {
        if (el.tagName === 'IMG' && currentUser.avatar) {
          el.src = currentUser.avatar;
          el.alt = currentUser.name || 'User';
        }
      });
      if (userDropdown) {
        const emailEl = userDropdown.querySelector('p.text-indigo-600');
        if (emailEl && currentUser.email) emailEl.textContent = currentUser.email;
      }

      if (userMenuBtn && userDropdown && !userMenuBtn.dataset.bound) {
        userMenuBtn.dataset.bound = 'true';
        userMenuBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          userDropdown.classList.toggle('hidden');
        });
        document.addEventListener('click', () => userDropdown.classList.add('hidden'));
      }

      // Bind Sign Out / Logout clicks
      document.querySelectorAll('a, button').forEach((el) => {
        const txt = (el.textContent || '').trim().toLowerCase();
        if (txt === 'sign out' || txt === 'logout' || el.classList.contains('logout-btn')) {
          if (!el.dataset.logoutBound) {
            el.dataset.logoutBound = 'true';
            el.addEventListener('click', (e) => {
              e.preventDefault();
              if (socketInstance && typeof socketInstance.disconnect === 'function') {
                socketInstance.disconnect();
              }
              localStorage.removeItem('lf_items_data');
              if (window.API && window.API.auth) {
                window.API.auth.logout();
              } else {
                localStorage.removeItem('lf_jwt_token');
                localStorage.removeItem('lf_user_session');
                window.location.href = 'login.html';
              }
            });
          }
        }
      });
    } else {
      // Guest / Logged-out state: Ensure zero lost/found reports appear anywhere
      localStorage.removeItem('lf_items_data');
      if (homeAuthGate) homeAuthGate.classList.remove('hidden');
      if (homeReportsWall) homeReportsWall.classList.add('hidden');
      if (homeSearchWidget) homeSearchWidget.classList.add('hidden');

      if (userMenuWrapper) userMenuWrapper.classList.add('hidden');
      document.querySelectorAll('.notification-badge, .chat-nav-badge').forEach((b) => b.classList.add('hidden'));

      const navContainer = userMenuWrapper ? userMenuWrapper.parentElement : null;
      if (navContainer && !document.getElementById('header-guest-auth-btns')) {
        const authBtns = document.createElement('div');
        authBtns.id = 'header-guest-auth-btns';
        authBtns.className = 'flex items-center gap-2 pl-2 border-l border-slate-200';
        authBtns.innerHTML = `
          <a href="login.html" class="px-4 py-2 rounded-xl text-sm font-bold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-colors">
            Sign In
          </a>
          <a href="register.html" class="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 transition-all">
            Create Account
          </a>
        `;
        navContainer.appendChild(authBtns);
      }

      if (mobileMenu) {
        mobileMenu.querySelectorAll('a').forEach((a) => {
          if (a.textContent.trim().toLowerCase() === 'sign out') {
            a.textContent = 'Sign In';
            a.className = 'text-sm font-bold text-indigo-600';
            const parentDiv = a.parentElement;
            if (parentDiv && !parentDiv.querySelector('a[href*="register.html"]')) {
              const regLink = document.createElement('a');
              regLink.href = 'register.html';
              regLink.className = 'px-4 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white';
              regLink.textContent = 'Create Account';
              parentDiv.appendChild(regLink);
            }
          }
        });
      }
    }
  }

  // 10. Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    setupHeaderAuthUI();
    ensureSocketClientScript();
    setupAuthForms();
    setupReportingForms();
    syncLiveItems();
    hydrateUserDashboard();
  });
})();
