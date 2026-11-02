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
        const btn = loginForm.querySelector('button[type="submit"]');
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Signing In...';
        }

        try {
          const res = await window.API.auth.login(email, pwd);
          notify(`Welcome back, ${res.data.name}!`, 'success');
          localStorage.setItem('lf_user_session', JSON.stringify(res.data));

          // Join Socket room immediately on login
          if (socketInstance && res.data._id) {
            socketInstance.emit('join_user_room', res.data._id);
          }

          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 600);
        } catch (err) {
          notify(err.message || 'Login failed', 'error');
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Sign In to Account';
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
        const password = document.getElementById('reg-password').value;
        const confirmPwd = document.getElementById('reg-confirm-password').value;
        const terms = document.getElementById('terms-agree');
        const btn = regForm.querySelector('button[type="submit"]');

        if (terms && !terms.checked) {
          notify('Please agree to the Terms of Service', 'warning');
          return;
        }
        if (password !== confirmPwd) {
          notify('Passwords do not match', 'error');
          return;
        }

        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Creating Account...';
        }

        try {
          const res = await window.API.auth.register({ name, email, phone, role, password });
          notify(`Account created! Welcome, ${res.data.name}`, 'success');
          localStorage.setItem('lf_user_session', JSON.stringify(res.data));

          if (socketInstance && res.data._id) {
            socketInstance.emit('join_user_room', res.data._id);
          }

          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 700);
        } catch (err) {
          notify(err.message || 'Registration failed', 'error');
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Create Account';
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

  // 8. Synchronize Live MongoDB Items with Frontend UI
  async function syncLiveItems() {
    const isBrowse = window.location.pathname.includes('browse-items.html');
    const isDashboard = window.location.pathname.includes('dashboard.html');
    const isHome = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';

    if (!isBrowse && !isDashboard && !isHome) return;

    try {
      const [lostRes, foundRes] = await Promise.allSettled([
        window.API.items.getAllLost({ limit: 40 }),
        window.API.items.getAllFound({ limit: 40 }),
      ]);

      const items = [];

      if (lostRes.status === 'fulfilled' && lostRes.value && lostRes.value.data) {
        lostRes.value.data.forEach((item) => {
          items.push({
            id: item._id,
            title: item.title,
            type: 'lost',
            category: item.category,
            location: item.location,
            date: item.date ? item.date.split('T')[0] : 'Recent',
            time: item.time || '',
            reward: item.reward || '',
            status: item.status || 'active',
            description: item.description,
            image:
              item.image ||
              'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&w=800&q=80',
            reporterName: item.reporterName || 'Student',
            isUserReport: false,
          });
        });
      }

      if (foundRes.status === 'fulfilled' && foundRes.value && foundRes.value.data) {
        foundRes.value.data.forEach((item) => {
          items.push({
            id: item._id,
            title: item.title,
            type: 'found',
            category: item.category,
            location: item.location,
            date: item.date ? item.date.split('T')[0] : 'Recent',
            time: item.time || '',
            reward: '',
            status: item.status || 'active',
            description: item.description,
            image:
              item.image ||
              'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
            reporterName: item.reporterName || 'Community Member',
            isUserReport: false,
          });
        });
      }

      if (items.length > 0) {
        localStorage.setItem('lf_items_data', JSON.stringify(items));
        console.log(`📡 Synced ${items.length} items from MongoDB.`);
        if (typeof window.renderItems === 'function') {
          window.renderItems();
        }
      }
    } catch (e) {
      console.warn('Sync notice:', e.message);
    }
  }

  // 9. Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    ensureSocketClientScript();
    setupAuthForms();
    setupReportingForms();
    syncLiveItems();
  });
})();
