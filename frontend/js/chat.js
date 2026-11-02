/**
 * FinderSpot Real-Time Peer-to-Peer Chat Engine (Socket.IO + REST)
 * Safe anonymous messaging between Claimants, Finders, and Security Officers.
 */

(function () {
  let activeConversationId = null;
  let activeItemContext = null;
  let typingTimeout = null;
  let isTyping = false;
  let audioCtx = null;
  let currentUserId = null;
  let currentUserName = 'Alex';
  let currentUserRole = 'Student';

  // Play synthesized 2-tone notification chime
  function playMessageChime() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(784, now); // G5
      osc.frequency.setValueAtTime(1046.5, now + 0.1); // C6

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  // Ensure Socket.IO client library is loaded
  function ensureSocketClient(callback) {
    if (typeof io !== 'undefined') {
      initSocket();
      if (callback) callback();
      return;
    }

    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.onload = () => {
      initSocket();
      if (callback) callback();
    };
    script.onerror = () => {
      const cdn = document.createElement('script');
      cdn.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
      cdn.onload = () => {
        initSocket();
        if (callback) callback();
      };
      document.head.appendChild(cdn);
    };
    document.head.appendChild(script);
  }

  // Initialize or retrieve Socket instance
  function initSocket() {
    if (window.socket && window.socket.connected) return window.socket;
    if (typeof io === 'undefined') return null;

    try {
      window.socket = io(window.location.origin, {
        transports: ['websocket', 'polling'],
      });

      window.socket.on('connect', () => {
        console.log('⚡ [Chat WebSockets] Connected to FinderSpot Live Server:', window.socket.id);
        if (currentUserId) {
          window.socket.emit('join_user_room', currentUserId);
        }
        if (activeConversationId) {
          window.socket.emit('join_conversation', activeConversationId);
        }
      });

      setupSocketListeners();
      return window.socket;
    } catch (e) {
      console.warn('[Chat] Socket init error:', e.message);
      return null;
    }
  }

  // Authenticate session seamlessly (auto-hydrate default demo session if absent)
  async function ensureAuthenticatedSession() {
    if (!window.API) {
      console.warn('[Chat] API client not loaded yet.');
      return null;
    }

    const token = window.API.getToken();
    const userStr = localStorage.getItem('lf_user_session');

    if (token && userStr) {
      try {
        const u = JSON.parse(userStr);
        currentUserId = u._id || u.id;
        currentUserName = u.name || 'Alex';
        currentUserRole = u.role || 'Student';
        updateUserIdentityUI();
        return u;
      } catch (e) {}
    }

    // Auto-login as Alex (Student) by default so chat works instantly
    try {
      const res = await window.API.auth.login('alex.morgan@campus.edu', 'password123');
      if (res && res.data) {
        currentUserId = res.data._id;
        currentUserName = res.data.name;
        currentUserRole = res.data.role || 'Student';
        updateUserIdentityUI();
        if (window.socket) {
          window.socket.emit('join_user_room', currentUserId);
        }
        return res.data;
      }
    } catch (err) {
      console.warn('[Chat] Auto-session hydration error:', err.message);
    }
    return null;
  }

  // Update Drawer User Identity Banner
  function updateUserIdentityUI() {
    const label = document.getElementById('chat-current-user-label');
    const switchBtnText = document.getElementById('btn-switch-user-text');
    if (label) {
      label.textContent = `${currentUserName} (${currentUserRole})`;
    }
    if (switchBtnText) {
      if (currentUserRole === 'Security') {
        switchBtnText.textContent = 'Switch to Alex (Student)';
      } else {
        switchBtnText.textContent = 'Switch to Officer Vance (Security)';
      }
    }
  }

  // Switch demo user between Alex and Officer David Vance
  async function switchDemoUser() {
    const target = currentUserRole === 'Security' ? 'Student' : 'Security';
    const email = target === 'Security' ? 'security.lostfound@campus.edu' : 'alex.morgan@campus.edu';

    try {
      const res = await window.API.auth.login(email, 'password123');
      if (res && res.data) {
        currentUserId = res.data._id;
        currentUserName = res.data.name;
        currentUserRole = res.data.role;
        updateUserIdentityUI();

        if (window.socket) {
          window.socket.emit('join_user_room', currentUserId);
        }

        if (window.LFApp && window.LFApp.showToast) {
          window.LFApp.showToast(`Switched account to ${currentUserName} (${currentUserRole})`, 'success');
        }

        // Return to threads view and reload
        document.getElementById('chat-active-view').classList.add('hidden');
        document.getElementById('chat-threads-view').classList.remove('hidden');
        activeConversationId = null;
        await loadConversations();
        updateGlobalUnreadBadge();
      }
    } catch (err) {
      alert('Could not switch demo user: ' + err.message);
    }
  }

  // Inject Chat Slide-over Drawer into DOM if not present
  function injectChatDrawer() {
    if (document.getElementById('chat-drawer-container')) return;

    const drawerHtml = `
      <div id="chat-drawer-container" class="relative z-[99999]">
        <!-- Backdrop Overlay -->
        <div id="chat-drawer-backdrop" class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity opacity-0 pointer-events-none duration-300"></div>

        <!-- Slide-over Drawer Panel -->
        <div id="chat-drawer-panel" class="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 transform translate-x-full transition-transform duration-300 ease-in-out">
          <div class="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-slate-200">
            
            <!-- CURRENT USER IDENTITY & SWITCH BAR -->
            <div class="px-4 py-2 bg-slate-950 text-indigo-200 border-b border-slate-800 flex items-center justify-between text-[11px] select-none">
              <div class="flex items-center gap-1.5 truncate">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span class="text-slate-400">Logged in:</span>
                <strong id="chat-current-user-label" class="text-white font-bold truncate">Alex (Student)</strong>
              </div>
              <button id="btn-switch-chat-user" type="button" class="text-[10px] font-bold text-indigo-300 hover:text-white bg-indigo-900/80 hover:bg-indigo-800 px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer shadow-xs">
                <i class="fas fa-sync-alt text-[9px]"></i>
                <span id="btn-switch-user-text">Switch to Officer Vance</span>
              </button>
            </div>

            <!-- VIEW 1: THREADS LIST VIEW -->
            <div id="chat-threads-view" class="flex flex-col h-full">
              <!-- Header -->
              <div class="p-4 bg-slate-900 text-white flex items-center justify-between shadow-sm">
                <div class="flex items-center gap-2.5">
                  <div class="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-500/30">
                    <i class="far fa-comments"></i>
                  </div>
                  <div>
                    <h3 class="font-bold text-sm">Messages & Discussions</h3>
                    <p class="text-[10px] text-slate-300">Safe peer-to-peer campus chat</p>
                  </div>
                </div>
                <button id="btn-close-chat" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                  <i class="fas fa-times text-sm"></i>
                </button>
              </div>

              <!-- Search Conversations -->
              <div class="p-3 border-b border-slate-100 bg-slate-50/70">
                <div class="relative">
                  <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                  <input type="text" id="chat-search-threads" placeholder="Search conversations..." class="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
              </div>

              <!-- Scrollable Threads List -->
              <div id="chat-threads-list" class="flex-grow overflow-y-auto divide-y divide-slate-100 p-2">
                <div class="p-8 text-center text-slate-400 text-xs">
                  <i class="fas fa-spinner fa-spin text-xl text-indigo-500 mb-2"></i>
                  <p>Loading your conversations...</p>
                </div>
              </div>
            </div>

            <!-- VIEW 2: ACTIVE CONVERSATION CHAT VIEW -->
            <div id="chat-active-view" class="hidden flex flex-col h-full bg-slate-50">
              
              <!-- Chat Header -->
              <div class="p-3 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs">
                <div class="flex items-center gap-2.5 min-w-0">
                  <button id="btn-chat-back" class="p-2 -ml-1 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors" title="Back to all conversations">
                    <i class="fas fa-arrow-left text-xs"></i>
                  </button>
                  <div class="relative flex-shrink-0">
                    <img id="active-recipient-avatar" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80" class="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/20">
                    <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                  </div>
                  <div class="min-w-0">
                    <h4 id="active-recipient-name" class="font-bold text-xs text-slate-900 truncate">Officer David Vance</h4>
                    <span id="active-recipient-role" class="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">Security Desk</span>
                  </div>
                </div>
                <button id="btn-close-active-chat" class="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                  <i class="fas fa-times text-xs"></i>
                </button>
              </div>

              <!-- Item Context Header Banner -->
              <div id="chat-item-banner" class="bg-indigo-50/90 border-b border-indigo-100 px-3.5 py-2 flex items-center justify-between text-xs">
                <div class="flex items-center gap-2 min-w-0">
                  <img id="chat-banner-item-img" src="" class="w-7 h-7 rounded-lg object-cover bg-slate-200 flex-shrink-0">
                  <div class="min-w-0">
                    <p class="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Discussing Item</p>
                    <p id="chat-banner-item-title" class="font-bold text-slate-800 text-[11px] truncate">Item Title</p>
                  </div>
                </div>
                <a id="chat-banner-item-link" href="#" class="text-[10px] font-bold text-indigo-600 hover:underline flex-shrink-0">
                  View &rarr;
                </a>
              </div>

              <!-- Messages Scrollable Body -->
              <div id="chat-messages-container" class="flex-grow overflow-y-auto p-4 space-y-3">
                <!-- Messages rendered dynamically -->
              </div>

              <!-- Live Typing Indicator -->
              <div id="chat-typing-indicator" class="hidden px-4 py-1 text-[11px] text-slate-400 italic flex items-center gap-1.5">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
                <span id="typing-user-text">Someone is typing...</span>
              </div>

              <!-- Canned Responses Quick Bar -->
              <div class="px-3 pt-2 pb-1 border-t border-slate-200/60 bg-white">
                <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
                  <button type="button" class="chat-canned-chip flex-shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 font-medium transition-colors cursor-pointer" data-msg="Can we meet at Campus Security Desk (Room 104)?">
                    🛡️ Room 104 Meetup
                  </button>
                  <button type="button" class="chat-canned-chip flex-shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 font-medium transition-colors cursor-pointer" data-msg="Can you confirm the serial number or lock screen photo?">
                    🔍 Verification
                  </button>
                  <button type="button" class="chat-canned-chip flex-shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 font-medium transition-colors cursor-pointer" data-msg="What time are you available for handover today?">
                    🕒 Handover Time
                  </button>
                  <button type="button" class="chat-canned-chip flex-shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 font-medium transition-colors cursor-pointer" data-msg="I have safely handed this item to building reception.">
                    📍 Handed to Desk
                  </button>
                </div>
              </div>

              <!-- Message Input Box -->
              <div class="p-3 bg-white border-t border-slate-200">
                <form id="chat-message-form" class="flex items-center gap-2">
                  <div class="relative flex-grow">
                    <input type="text" id="chat-input-text" autocomplete="off" placeholder="Write a secure message..." class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all">
                  </div>
                  <button type="submit" id="chat-btn-send" class="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-200 transition-all flex-shrink-0 cursor-pointer disabled:opacity-50">
                    <i class="fas fa-paper-plane text-xs"></i>
                  </button>
                </form>
              </div>

            </div>

          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', drawerHtml);
    setupDrawerEvents();
  }

  // Setup DOM event listeners for the drawer
  function setupDrawerEvents() {
    const backdrop = document.getElementById('chat-drawer-backdrop');
    const panel = document.getElementById('chat-drawer-panel');
    const btnClose = document.getElementById('btn-close-chat');
    const btnCloseActive = document.getElementById('btn-close-active-chat');
    const btnBack = document.getElementById('btn-chat-back');
    const btnSwitch = document.getElementById('btn-switch-chat-user');
    const form = document.getElementById('chat-message-form');
    const input = document.getElementById('chat-input-text');
    const sendBtn = document.getElementById('chat-btn-send');

    function closeDrawer() {
      backdrop.classList.add('opacity-0', 'pointer-events-none');
      backdrop.classList.remove('opacity-100', 'pointer-events-auto');
      panel.classList.add('translate-x-full');
      if (activeConversationId && window.socket) {
        window.socket.emit('leave_conversation', activeConversationId);
      }
      activeConversationId = null;
    }

    if (backdrop) backdrop.addEventListener('click', closeDrawer);
    if (btnClose) btnClose.addEventListener('click', closeDrawer);
    if (btnCloseActive) btnCloseActive.addEventListener('click', closeDrawer);

    if (btnSwitch) {
      btnSwitch.addEventListener('click', (e) => {
        e.preventDefault();
        switchDemoUser();
      });
    }

    if (btnBack) {
      btnBack.addEventListener('click', () => {
        document.getElementById('chat-active-view').classList.add('hidden');
        document.getElementById('chat-threads-view').classList.remove('hidden');
        if (activeConversationId && window.socket) {
          window.socket.emit('leave_conversation', activeConversationId);
        }
        activeConversationId = null;
        loadConversations();
      });
    }

    // Canned Response Click
    document.querySelectorAll('.chat-canned-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-msg');
        if (input && text) {
          input.value = text;
          input.focus();
        }
      });
    });

    // Message Form Submission
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        // Ensure session exists
        await ensureAuthenticatedSession();

        // If no active thread selected, connect or create one
        if (!activeConversationId) {
          try {
            const listRes = await window.API.chat.getConversations();
            if (listRes.data && listRes.data.length > 0) {
              await openConversation(listRes.data[0]._id, listRes.data[0]);
            } else {
              const newConvRes = await window.API.chat.getOrCreateConversation({
                itemTitle: 'Campus Lost & Found Discussion',
              });
              if (newConvRes && newConvRes.data) {
                await openConversation(newConvRes.data._id, newConvRes.data);
              }
            }
          } catch (err) {
            console.warn('Auto-thread creation error:', err);
          }
        }

        if (!activeConversationId) {
          alert('Please select or start a discussion thread to send your message.');
          return;
        }

        // Show sending state
        const originalBtnHtml = sendBtn.innerHTML;
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin text-xs"></i>';

        if (window.socket && isTyping) {
          window.socket.emit('typing_stop', { conversationId: activeConversationId, userName: currentUserName });
          isTyping = false;
        }

        try {
          const res = await window.API.chat.sendMessage(activeConversationId, text);
          input.value = '';
          if (res && res.data) {
            renderMessage(res.data, true);
            scrollToBottom();
            playMessageChime();
          }
        } catch (err) {
          console.error('Failed to send message:', err);
          alert('Could not send message: ' + (err.message || 'Server error. Please ensure backend is running.'));
        } finally {
          sendBtn.disabled = false;
          sendBtn.innerHTML = originalBtnHtml;
          input.focus();
        }
      });
    }

    // Typing Debounce
    if (input) {
      input.addEventListener('input', () => {
        if (!window.socket || !activeConversationId) return;

        if (!isTyping) {
          isTyping = true;
          window.socket.emit('typing_start', { conversationId: activeConversationId, userName: currentUserName });
        }

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
          if (isTyping) {
            isTyping = false;
            window.socket.emit('typing_stop', { conversationId: activeConversationId, userName: currentUserName });
          }
        }, 1500);
      });
    }
  }

  // Open Chat Drawer
  function openDrawer() {
    injectChatDrawer();
    const backdrop = document.getElementById('chat-drawer-backdrop');
    const panel = document.getElementById('chat-drawer-panel');

    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    backdrop.classList.add('opacity-100', 'pointer-events-auto');
    panel.classList.remove('translate-x-full');
  }

  // Load and Render All Conversations
  async function loadConversations() {
    injectChatDrawer();
    const list = document.getElementById('chat-threads-list');
    list.innerHTML = `
      <div class="p-8 text-center text-slate-400 text-xs">
        <i class="fas fa-spinner fa-spin text-xl text-indigo-500 mb-2"></i>
        <p>Loading your discussions...</p>
      </div>
    `;

    await ensureAuthenticatedSession();

    try {
      const res = await window.API.chat.getConversations();
      const convs = res.data || [];

      if (convs.length === 0) {
        list.innerHTML = `
          <div class="p-8 text-center text-slate-400">
            <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2 text-lg">
              <i class="far fa-comment-dots"></i>
            </div>
            <p class="font-bold text-slate-700 text-xs">No active discussions yet</p>
            <p class="text-[11px] text-slate-400 mt-1">Open any lost or found item and click "Live Chat with Reporter".</p>
          </div>
        `;
        return;
      }

      list.innerHTML = '';
      convs.forEach((conv) => {
        const item = document.createElement('div');
        item.className =
          'p-3 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-3 border border-transparent hover:border-slate-100';

        const lastMsg = conv.lastMessage ? conv.lastMessage.text : 'Discussion started';
        const unreadBadge = conv.unreadCount > 0
          ? `<span class="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">${conv.unreadCount}</span>`
          : '';

        item.innerHTML = `
          <div class="relative flex-shrink-0">
            <img src="${conv.recipient.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80'}" class="w-11 h-11 rounded-full object-cover ring-2 ring-indigo-500/20">
            <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
          </div>
          <div class="flex-grow min-w-0">
            <div class="flex items-center justify-between gap-1 mb-0.5">
              <h4 class="font-bold text-xs text-slate-900 truncate">${conv.recipient.name}</h4>
              <span class="text-[10px] text-slate-400 flex-shrink-0">${new Date(conv.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
            </div>
            <p class="text-[11px] font-semibold text-indigo-600 truncate flex items-center gap-1 mb-0.5">
              <i class="fas fa-tag text-[9px]"></i> ${conv.itemTitle}
            </p>
            <div class="flex items-center justify-between gap-1">
              <p class="text-[11px] text-slate-500 truncate">${escapeHtml(lastMsg)}</p>
              ${unreadBadge}
            </div>
          </div>
        `;

        item.addEventListener('click', () => {
          openConversation(conv._id, conv);
        });

        list.appendChild(item);
      });
    } catch (err) {
      console.error(err);
      list.innerHTML = `
        <div class="p-6 text-center text-rose-500 text-xs">
          <p>Please log in to access your chat messages.</p>
          <a href="login.html" class="mt-2 inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-bold">Sign In</a>
        </div>
      `;
    }
  }

  // Open a Specific Conversation
  async function openConversation(conversationId, convContext = null) {
    activeConversationId = conversationId;
    openDrawer();

    document.getElementById('chat-threads-view').classList.add('hidden');
    document.getElementById('chat-active-view').classList.remove('hidden');

    const msgContainer = document.getElementById('chat-messages-container');
    msgContainer.innerHTML = `
      <div class="p-8 text-center text-slate-400 text-xs">
        <i class="fas fa-spinner fa-spin text-xl text-indigo-500 mb-2"></i>
        <p>Connecting to secure discussion...</p>
      </div>
    `;

    // Join Socket room
    if (window.socket) {
      window.socket.emit('join_conversation', conversationId);
    }

    try {
      await ensureAuthenticatedSession();

      // If context provided, set recipient details
      if (convContext && convContext.recipient) {
        document.getElementById('active-recipient-name').textContent = convContext.recipient.name;
        document.getElementById('active-recipient-role').textContent = convContext.recipient.role || 'Member';
        document.getElementById('active-recipient-avatar').src =
          convContext.recipient.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80';

        if (convContext.itemTitle) {
          document.getElementById('chat-item-banner').classList.remove('hidden');
          document.getElementById('chat-banner-item-title').textContent = convContext.itemTitle;
          document.getElementById('chat-banner-item-img').src =
            convContext.itemImage || 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&w=150&q=80';
          if (convContext.item) {
            document.getElementById('chat-banner-item-link').href = `item-details.html?id=${convContext.item}&type=${convContext.itemModel === 'LostItem' ? 'lost' : 'found'}`;
          }
        }
      }

      // Fetch messages
      const res = await window.API.chat.getMessages(conversationId);
      const messages = res.data || [];

      msgContainer.innerHTML = '';
      if (messages.length === 0) {
        msgContainer.innerHTML = `
          <div class="p-6 text-center text-slate-400 text-xs">
            <div class="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
              <i class="far fa-handshake"></i>
            </div>
            <p class="font-bold text-slate-700">Encrypted Item Discussion</p>
            <p class="text-[11px] text-slate-400 mt-0.5">Use the quick prompts below or type a message to coordinate safe handover.</p>
          </div>
        `;
      } else {
        messages.forEach((msg) => {
          const isMe = currentUserId ? msg.sender.toString() === currentUserId.toString() : false;
          renderMessage(msg, isMe);
        });
        scrollToBottom();
      }

      // Mark as read
      await window.API.chat.markAsRead(conversationId);
      updateGlobalUnreadBadge();
    } catch (err) {
      console.error(err);
      msgContainer.innerHTML = `<div class="p-6 text-center text-rose-500 text-xs">Error loading discussion: ${err.message}</div>`;
    }
  }

  // Render a Single Message Bubble
  function renderMessage(msg, isMe) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    const bubble = document.createElement('div');
    bubble.className = `flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'} items-end text-xs`;

    const timeStr = new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isMe) {
      bubble.innerHTML = `
        <div class="max-w-[78%] space-y-0.5">
          <div class="bg-indigo-600 text-white p-3 rounded-2xl rounded-br-xs shadow-xs text-xs font-medium leading-relaxed break-words">
            ${escapeHtml(msg.text)}
          </div>
          <p class="text-[9px] text-slate-400 text-right flex items-center justify-end gap-1">
            <span>${timeStr}</span>
            <i class="fas fa-check-double text-[8px] text-indigo-500"></i>
          </p>
        </div>
      `;
    } else {
      bubble.innerHTML = `
        <img src="${msg.senderAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80'}" class="w-7 h-7 rounded-full object-cover flex-shrink-0">
        <div class="max-w-[78%] space-y-0.5">
          <div class="flex items-center gap-1.5 ml-1">
            <span class="text-[10px] font-bold text-slate-700">${escapeHtml(msg.senderName || 'Peer')}</span>
            <span class="text-[9px] text-slate-400 font-medium">(${msg.senderRole || 'User'})</span>
          </div>
          <div class="bg-white border border-slate-200/90 text-slate-800 p-3 rounded-2xl rounded-bl-xs shadow-xs text-xs leading-relaxed break-words">
            ${escapeHtml(msg.text)}
          </div>
          <p class="text-[9px] text-slate-400 ml-1">${timeStr}</p>
        </div>
      `;
    }

    container.appendChild(bubble);
  }

  function scrollToBottom() {
    const container = document.getElementById('chat-messages-container');
    if (container) container.scrollTop = container.scrollHeight;
  }

  function escapeHtml(string) {
    return String(string || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Update navbar unread badge
  async function updateGlobalUnreadBadge() {
    try {
      if (!window.API || !window.API.getToken()) return;

      const res = await window.API.chat.getConversations();
      const convs = res.data || [];
      const totalUnread = convs.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

      document.querySelectorAll('.chat-nav-badge').forEach((badge) => {
        if (totalUnread > 0) {
          badge.textContent = totalUnread > 9 ? '9+' : totalUnread;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      });
    } catch (e) {
      // Ignore if not logged in
    }
  }

  // Open Chat directly from Item Details Page
  async function openItemChat(itemId, itemModel = 'lost', recipientId = null) {
    openDrawer();
    await ensureAuthenticatedSession();

    try {
      const res = await window.API.chat.getOrCreateConversation({
        itemId: itemId && itemId.startsWith('LF-') ? null : itemId,
        itemModel: itemModel === 'lost' ? 'LostItem' : 'FoundItem',
        recipientId: recipientId || null,
      });

      if (res && res.data) {
        const conv = res.data;
        const otherUser =
          (conv.participants && conv.participants.find((p) => p._id.toString() !== currentUserId?.toString())) || {
            name: 'Officer David Vance',
            role: 'Security',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
          };

        openConversation(conv._id, {
          recipient: otherUser,
          item: conv.item,
          itemModel: conv.itemModel,
          itemTitle: conv.itemTitle || 'Item Handover Discussion',
          itemImage: conv.itemImage || 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&w=150&q=80',
        });
      }
    } catch (err) {
      console.error('Failed to start item conversation:', err);
      alert('Could not start item discussion: ' + err.message);
    }
  }

  // Socket.IO Real-time listeners
  function setupSocketListeners() {
    if (!window.socket) return;

    // Remove old listeners to prevent duplicates
    window.socket.off('new_chat_message');
    window.socket.off('new_chat_notification');
    window.socket.off('user_typing');
    window.socket.off('user_stop_typing');

    // Incoming new message event
    window.socket.on('new_chat_message', (data) => {
      if (activeConversationId && data.conversationId === activeConversationId) {
        const isMe = currentUserId ? data.message.sender.toString() === currentUserId.toString() : false;
        if (!isMe) {
          renderMessage(data.message, false);
          scrollToBottom();
          playMessageChime();
          if (window.API && window.API.chat) {
            window.API.chat.markAsRead(activeConversationId);
          }
        }
      }
    });

    // Global background notification for unread message
    window.socket.on('new_chat_notification', (data) => {
      if (!activeConversationId || activeConversationId !== data.conversationId) {
        playMessageChime();
        updateGlobalUnreadBadge();
        if (window.LFApp && window.LFApp.showToast) {
          window.LFApp.showToast(`💬 New message from ${data.senderName}: "${data.text}"`, 'info');
        }
      }
    });

    // Typing indicators
    window.socket.on('user_typing', (data) => {
      if (activeConversationId && data.conversationId === activeConversationId) {
        const indicator = document.getElementById('chat-typing-indicator');
        const text = document.getElementById('typing-user-text');
        if (indicator && text) {
          text.textContent = `${data.userName || 'Peer'} is typing...`;
          indicator.classList.remove('hidden');
          scrollToBottom();
        }
      }
    });

    window.socket.on('user_stop_typing', (data) => {
      if (activeConversationId && data.conversationId === activeConversationId) {
        const indicator = document.getElementById('chat-typing-indicator');
        if (indicator) indicator.classList.add('hidden');
      }
    });
  }

  // Initialize Chat on DOM Ready
  function initChat() {
    injectChatDrawer();

    // Check user session
    ensureAuthenticatedSession();

    // Ensure Socket is loaded and hooked
    ensureSocketClient(() => {
      setupSocketListeners();
      updateGlobalUnreadBadge();
    });

    // Hook buttons with .open-chat-trigger
    document.querySelectorAll('.open-chat-trigger').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openDrawer();
        loadConversations();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChat);
  } else {
    initChat();
  }

  // Global window export
  window.LFChat = {
    openDrawer: () => {
      openDrawer();
      loadConversations();
    },
    openConversation,
    openItemChat,
    switchUser: switchDemoUser,
    updateBadge: updateGlobalUnreadBadge,
    ensureSession: ensureAuthenticatedSession,
  };
})();
