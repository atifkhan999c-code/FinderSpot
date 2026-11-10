/**
 * FinderSpot Centralized REST API Client
 * Seamlessly connects Frontend forms to Node.js/Express Backend & MongoDB
 */

const API_BASE_URL = '/api';

const API = {
  // Token management
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

  // Base request handler
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

  // 1. Authentication Endpoints
  auth: {
    async register(userData) {
      const res = await API.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      if (res.data && res.data.token) {
        API.setToken(res.data.token);
        localStorage.setItem('lf_user_session', JSON.stringify(res.data));
      }
      return res;
    },

    async login(email, password) {
      const res = await API.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res.data && res.data.token) {
        API.setToken(res.data.token);
        localStorage.setItem('lf_user_session', JSON.stringify(res.data));
      }
      return res;
    },

    async ensureSession() {
      const token = API.getToken();
      const userStr = localStorage.getItem('lf_user_session');
      if (token && userStr) {
        try {
          return JSON.parse(userStr);
        } catch (e) {}
      }
      return null;
    },

    async switchDemoUser(targetRole = 'Security') {
      const isSecurity = targetRole === 'Security' || targetRole === 'officer';
      const email = isSecurity ? 'security.lostfound@campus.edu' : 'alex.morgan@campus.edu';
      const password = 'password123';

      const res = await this.login(email, password);
      if (window.socket && res.data && res.data._id) {
        window.socket.emit('join_user_room', res.data._id);
      }
      window.dispatchEvent(new CustomEvent('session_changed', { detail: res.data }));
      return res.data;
    },

    async getProfile() {
      return await API.request('/auth/profile');
    },

    async updateProfile(updates) {
      return await API.request('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    logout() {
      API.setToken(null);
      localStorage.removeItem('lf_user_session');
    },
  },

  // 2. Lost & Found Items Endpoints
  items: {
    async getAllLost(params = {}) {
      const query = new URLSearchParams(params).toString();
      return await API.request(`/lost-items${query ? '?' + query : ''}`);
    },

    async getAllFound(params = {}) {
      const query = new URLSearchParams(params).toString();
      return await API.request(`/found-items${query ? '?' + query : ''}`);
    },

    async getLostById(id) {
      return await API.request(`/lost-items/${id}`);
    },

    async getFoundById(id) {
      return await API.request(`/found-items/${id}`);
    },

    async createLost(itemData) {
      // Handles both JSON and FormData (with image uploads)
      const isFormData = itemData instanceof FormData;
      return await API.request('/lost-items', {
        method: 'POST',
        body: isFormData ? itemData : JSON.stringify(itemData),
      });
    },

    async createFound(itemData) {
      const isFormData = itemData instanceof FormData;
      return await API.request('/found-items', {
        method: 'POST',
        body: isFormData ? itemData : JSON.stringify(itemData),
      });
    },

    async updateLost(id, updates) {
      return await API.request(`/lost-items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    async updateFound(id, updates) {
      return await API.request(`/found-items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    async deleteLost(id) {
      return await API.request(`/lost-items/${id}`, { method: 'DELETE' });
    },

    async deleteFound(id) {
      return await API.request(`/found-items/${id}`, { method: 'DELETE' });
    },

    async search(params = {}) {
      const query = new URLSearchParams(params).toString();
      return await API.request(`/search${query ? '?' + query : ''}`);
    },

    async getMapItems(params = {}) {
      const query = new URLSearchParams(params).toString();
      return await API.request(`/search/map${query ? '?' + query : ''}`);
    },
  },

  // 3. Claims & Verification
  claims: {
    async submit(claimData) {
      const isFormData = claimData instanceof FormData;
      return await API.request('/claims', {
        method: 'POST',
        body: isFormData ? claimData : JSON.stringify(claimData),
      });
    },

    async getForItem(itemId, itemModel = '') {
      const qs = itemModel ? `?itemModel=${encodeURIComponent(itemModel)}` : '';
      return await API.request(`/claims/item/${itemId}${qs}`);
    },

    async updateStatus(claimId, status, notes = '') {
      return await API.request(`/claims/${claimId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, reviewerNotes: notes }),
      });
    },
  },

  // 4. Notifications
  notifications: {
    async getAll() {
      return await API.request('/notifications');
    },

    async markRead(id) {
      return await API.request(`/notifications/${id}/read`, { method: 'PUT' });
    },

    async markAllRead() {
      return await API.request('/notifications/read-all', { method: 'PUT' });
    },

    async delete(id) {
      return await API.request(`/notifications/${id}`, { method: 'DELETE' });
    },
  },

  // 5. Admin Desk
  admin: {
    async getStats() {
      return await API.request('/admin/stats');
    },

    async getAnalytics() {
      return await API.request('/admin/analytics');
    },

    async getAuditLogs(params = {}) {
      const query = new URLSearchParams(params).toString();
      return await API.request(`/admin/audit-logs${query ? '?' + query : ''}`);
    },

    async getUsers() {
      return await API.request('/admin/users');
    },

    async updateUser(id, updates) {
      return await API.request(`/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },

    async getClaims() {
      return await API.request('/admin/claims');
    },

    async updateClaimDecision(id, status, reviewerNotes = '', pickupLocker = '') {
      return await API.request(`/admin/claims/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, reviewerNotes, pickupLocker }),
      });
    },

    async logCustody(custodyData) {
      return await API.request('/admin/custody', {
        method: 'POST',
        body: JSON.stringify(custodyData),
      });
    },

    async deleteItem(type, id) {
      return await API.request(`/admin/items/${type}/${id}`, { method: 'DELETE' });
    },
  },

  // 6. Gemini AI Visual Recognition
  ai: {
    async analyzeImage(fileOrBase64) {
      if (fileOrBase64 instanceof File || fileOrBase64 instanceof Blob) {
        const formData = new FormData();
        formData.append('image', fileOrBase64);
        return await API.request('/ai/analyze-image', {
          method: 'POST',
          body: formData,
        });
      } else {
        return await API.request('/ai/analyze-image', {
          method: 'POST',
          body: JSON.stringify({ imageBase64: fileOrBase64 }),
        });
      }
    },
  },

  // 7. Real-Time Peer-to-Peer Chat
  chat: {
    async getConversations() {
      return await API.request('/chat/conversations');
    },

    async getOrCreateConversation(params = {}) {
      return await API.request('/chat/conversations', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    async getMessages(conversationId) {
      return await API.request(`/chat/conversations/${conversationId}/messages`);
    },

    async sendMessage(conversationId, text, attachments = []) {
      return await API.request(`/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text, attachments }),
      });
    },

    async markAsRead(conversationId) {
      return await API.request(`/chat/conversations/${conversationId}/read`, {
        method: 'PUT',
      });
    },
  },

  // 8. Service Health Check
  async checkHealth() {
    return await API.request('/health');
  },
};

// Global export for client scripts
window.API = API;
