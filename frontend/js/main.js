/**
 * FinderSpot Core Client Application Engine
 */

const STORAGE_KEYS = {
  ITEMS: 'lf_items_data',
  USER: 'lf_user_session',
  NOTIFICATIONS: 'lf_notifications',
  CLAIMS: 'lf_claims_data'
};

const INITIAL_ITEMS = [
  {
    id: 'LF-1001',
    title: 'iPhone 13 (Midnight Blue with Clear Case)',
    type: 'lost',
    category: 'Electronics',
    location: 'Main Campus Library, 2nd Floor Quiet Zone',
    date: '2026-10-30',
    time: '14:30',
    reward: '$50',
    status: 'active',
    description: 'Lost my iPhone 13 in a transparent shockproof case with a small cat sticker on the back. Screen has a tempered glass protector.',
    image: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&w=800&q=80',
    reporterName: 'Alex',
    reporterEmail: 'alex.morgan@campus.edu',
    reporterPhone: '+1 (555) 234-5678',
    isUserReport: true,
    securityQuestion: 'What is the lock screen wallpaper?',
    tags: ['iphone', 'apple', 'blue', 'phone', 'library']
  },
  {
    id: 'LF-1002',
    title: 'Black Leather Bifold Wallet',
    type: 'lost',
    category: 'Wallets & Cards',
    location: 'Student Union Cafeteria near Subway counter',
    date: '2026-10-29',
    time: '12:15',
    reward: '$25',
    status: 'active',
    description: 'Black Tommy Hilfiger leather wallet. Contains driver license for Sarah Jenkins, university student ID, and metro pass.',
    image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    reporterName: 'Sarah Jenkins',
    reporterEmail: 'sarah.j@campus.edu',
    reporterPhone: '+1 (555) 890-1234',
    isUserReport: false,
    securityQuestion: 'What initials are embossed inside?',
    tags: ['wallet', 'leather', 'cards', 'id']
  },
  {
    id: 'LF-1003',
    title: 'Casio fx-991EX Scientific Calculator',
    type: 'lost',
    category: 'Books & Stationery',
    location: 'Science Building Room 402 (Physics Lab)',
    date: '2026-10-31',
    time: '11:00',
    reward: '$15',
    status: 'active',
    description: 'ClassWiz scientific calculator left on the back row bench during physics quiz. Has a silver sticker on sliding cover.',
    image: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80',
    reporterName: 'Alex',
    reporterEmail: 'alex.morgan@campus.edu',
    reporterPhone: '+1 (555) 234-5678',
    isUserReport: true,
    securityQuestion: 'What is written on the inner cover?',
    tags: ['calculator', 'casio', 'physics', 'stationery']
  },
  {
    id: 'LF-1005',
    title: 'Sony WH-1000XM4 Noise Canceling Headphones',
    type: 'found',
    category: 'Electronics',
    location: 'Student Lounge near Coffee Vending Machine',
    date: '2026-10-31',
    time: '09:20',
    reward: '',
    status: 'active',
    description: 'Black Sony over-ear headphones found resting on the armchair with travel case. Safely turned over to Security Desk.',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    reporterName: 'Campus Security Desk (Officer David)',
    reporterEmail: 'security-lostfound@campus.edu',
    reporterPhone: '+1 (555) 911-0022',
    isUserReport: false,
    securityQuestion: 'What is stored in the mesh pouch inside the headphone case?',
    tags: ['sony', 'headphones', 'audio', 'electronics']
  },
  {
    id: 'LF-1006',
    title: 'Set of Keys with Red Subaru Fob & Carabiner',
    type: 'found',
    category: 'Keys',
    location: 'West Parking Lot Section B (Near Tree #4)',
    date: '2026-10-30',
    time: '16:10',
    reward: '',
    status: 'active',
    description: 'Ring of 4 keys with Subaru key fob, brass keys, and a silver bottle opener on heavy-duty red climbing carabiner.',
    image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=800&q=80',
    reporterName: 'Alex',
    reporterEmail: 'alex.morgan@campus.edu',
    reporterPhone: '+1 (555) 234-5678',
    isUserReport: true,
    securityQuestion: 'What brand or logo is on the bottle opener keychain?',
    tags: ['keys', 'car key', 'subaru', 'carabiner']
  }
];

const INITIAL_USER = {
  name: 'Alex',
  email: 'alex.morgan@campus.edu',
  phone: '+1 (555) 234-5678',
  role: 'Student',
  studentId: 'STU-98421',
  department: 'Computer Science & Engineering',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
};

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'Potential Match Found!',
    message: 'A report for "Sony WH-1000XM4 Headphones" matches your lost item category and timing.',
    type: 'match',
    link: 'item-details.html?id=LF-1005',
    read: false,
    date: '2026-10-31T14:10:00'
  },
  {
    id: 'notif-2',
    title: 'New Claim Inquiry',
    message: 'Marcus Cole submitted a verification claim for your found report "Set of Keys with Red Subaru Fob".',
    type: 'claim',
    link: 'my-reports.html',
    read: false,
    date: '2026-10-31T12:30:00'
  }
];

function initStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.ITEMS)) {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(INITIAL_ITEMS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
  }
}

initStorage();

const FinderApp = {
  getItems() {
    initStorage();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.ITEMS)) || [];
    } catch (e) {
      return INITIAL_ITEMS;
    }
  },

  getItemById(id) {
    const items = this.getItems();
    return items.find(i => i.id === id) || null;
  },

  saveItem(itemData) {
    const items = this.getItems();
    const newId = 'LF-' + Math.floor(1000 + Math.random() * 9000);
    const user = this.getCurrentUser();
    
    const newItem = {
      id: itemData.id || newId,
      title: itemData.title || 'Untitled',
      type: itemData.type || 'lost',
      category: itemData.category || 'General',
      location: itemData.location || 'Campus',
      date: itemData.date || new Date().toISOString().split('T')[0],
      time: itemData.time || '12:00',
      reward: itemData.reward || '',
      status: itemData.status || 'active',
      description: itemData.description || '',
      image: itemData.image || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80',
      reporterName: user ? user.name : (itemData.reporterName || 'Anonymous'),
      reporterEmail: user ? user.email : (itemData.reporterEmail || ''),
      reporterPhone: user ? user.phone : (itemData.reporterPhone || ''),
      isUserReport: true,
      securityQuestion: itemData.securityQuestion || '',
      tags: itemData.tags || []
    };

    items.unshift(newItem);
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
    return newItem;
  },

  updateItem(id, updates) {
    let items = this.getItems();
    let updated = null;
    items = items.map(item => {
      if (item.id === id) {
        updated = { ...item, ...updates };
        return updated;
      }
      return item;
    });
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
    return updated;
  },

  deleteItem(id) {
    let items = this.getItems();
    items = items.filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  },

  getCurrentUser() {
    initStorage();
    const token = localStorage.getItem('lf_jwt_token');
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (!token || !userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  },

  saveCurrentUser(userUpdates) {
    const current = this.getCurrentUser();
    const updated = { ...current, ...userUpdates };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
    this.updateUserUI();
    return updated;
  },

  getNotifications() {
    initStorage();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) || [];
    } catch (e) {
      return INITIAL_NOTIFICATIONS;
    }
  },

  getUnreadCount() {
    return this.getNotifications().filter(n => !n.read).length;
  },

  showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    let icon = '<i class="fas fa-check-circle"></i>';
    if (type === 'error') icon = '<i class="fas fa-exclamation-circle"></i>';
    if (type === 'info') icon = '<i class="fas fa-info-circle"></i>';
    if (type === 'warning') icon = '<i class="fas fa-exclamation-triangle"></i>';

    toast.innerHTML = `
      <div>${icon}</div>
      <div class="flex-grow">${message}</div>
      <button onclick="this.parentElement.remove()" class="ml-2 opacity-70 hover:opacity-100">&times;</button>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  timeAgo(dateString) {
    if (!dateString) return '';
    const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  },

  updateUserUI() {
    const user = this.getCurrentUser();
    if (!user) return;
    document.querySelectorAll('.user-display-name').forEach(el => el.textContent = user.name);
    document.querySelectorAll('.user-display-avatar').forEach(el => {
      if (el.tagName === 'IMG') el.src = user.avatar;
    });

    const unread = this.getUnreadCount();
    document.querySelectorAll('.notification-badge').forEach(badge => {
      if (unread > 0) {
        badge.textContent = unread;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    });
  },

  logout() {
    localStorage.removeItem('lf_jwt_token');
    localStorage.removeItem('lf_user_session');
    if (window.socket && typeof window.socket.disconnect === 'function') {
      window.socket.disconnect();
    }
    window.location.href = 'login.html';
  },

  initCommon() {
    this.updateUserUI();
    const btn = document.getElementById('user-menu-btn');
    const menu = document.getElementById('user-dropdown');
    if (btn && menu) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
      });
      document.addEventListener('click', () => menu.classList.add('hidden'));
    }

    // Global listener for Sign Out / Logout links
    document.querySelectorAll('a, button').forEach((el) => {
      const text = (el.textContent || '').trim().toLowerCase();
      if (text === 'sign out' || text === 'logout' || el.classList.contains('logout-btn')) {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          this.logout();
        });
      }
    });
  }
};

// Aliased as LFApp for backwards compatibility
window.LFApp = FinderApp;
window.FinderApp = FinderApp;

document.addEventListener('DOMContentLoaded', () => FinderApp.initCommon());
