/**
 * FinderSpot Supabase PostgreSQL Data Service
 * Provides unified CRUD adapters mapping PostgreSQL rows to FinderSpot REST JSON shapes.
 */

const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../config/supabase');

function mapUser(row, includePasswordHash = false) {
  if (!row) return null;
  const mapped = {
    _id: String(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    role: row.role || 'Student',
    studentId: row.student_id || '',
    department: row.department || '',
    avatar: row.avatar,
    trustPoints: row.trust_points ?? 100,
    notificationPreferences: row.notification_preferences || {
      emailAlerts: true,
      smsAlerts: false,
      weeklyDigest: true,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includePasswordHash) {
    mapped.passwordHash = row.password_hash;
  }
  return mapped;
}

function mapLostItem(row) {
  if (!row) return null;
  return {
    _id: String(row.id),
    title: row.title,
    category: row.category,
    location: row.location,
    coordinates: row.lat != null && row.lng != null ? { lat: row.lat, lng: row.lng } : null,
    date: row.date,
    time: row.time || '',
    reward: row.reward || '',
    status: row.status || 'active',
    description: row.description,
    image: row.image,
    securityQuestion: row.security_question || '',
    contactPreference: row.contact_preference || 'inapp',
    reporter: row.reporter_id ? String(row.reporter_id) : null,
    reporterName: row.reporter_name || 'Anonymous',
    reporterEmail: row.reporter_email || '',
    reporterPhone: row.reporter_phone || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    type: 'lost',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFoundItem(row) {
  if (!row) return null;
  return {
    _id: String(row.id),
    title: row.title,
    category: row.category,
    location: row.location,
    coordinates: row.lat != null && row.lng != null ? { lat: row.lat, lng: row.lng } : null,
    date: row.date,
    time: row.time || '',
    custody: row.custody || 'security',
    custodyLocationDetails: row.custody_location_details || 'Campus Security Desk, Room 104',
    status: row.status || 'active',
    description: row.description,
    image: row.image,
    securityQuestion: row.security_question || '',
    reporter: row.reporter_id ? String(row.reporter_id) : null,
    reporterName: row.reporter_name || 'Campus Samaritan',
    reporterEmail: row.reporter_email || '',
    reporterPhone: row.reporter_phone || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    type: 'found',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapClaim(row) {
  if (!row) return null;
  return {
    _id: String(row.id),
    item: String(row.item_id),
    itemModel: row.item_model,
    claimant: row.claimant_id ? String(row.claimant_id) : null,
    claimantName: row.claimant_name,
    claimantEmail: row.claimant_email,
    claimantPhone: row.claimant_phone || '',
    proofDetails: row.proof_details,
    proofImage: row.proof_image || '',
    status: row.status || 'pending',
    reviewerNotes: row.reviewer_notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNotification(row) {
  if (!row) return null;
  return {
    _id: String(row.id),
    recipient: String(row.recipient_id),
    title: row.title,
    message: row.message,
    type: row.type || 'info',
    link: row.link || '',
    relatedItem: row.related_item_id ? String(row.related_item_id) : null,
    relatedItemModel: row.related_item_model || '',
    read: Boolean(row.is_read),
    createdAt: row.created_at,
  };
}

function toNumericId(id) {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const SupabaseDB = {
  // ---------------- USERS ----------------
  async findUserByEmail(email, includePasswordHash = false) {
    const { data, error } = await supabaseAdmin
      .from('app_users')
      .select('*')
      .ilike('email', email.trim())
      .maybeSingle();
    if (error) throw new Error(error.message);
    return mapUser(data, includePasswordHash);
  },

  async findUserById(id) {
    const numId = toNumericId(id);
    if (!numId) return null;
    const { data, error } = await supabaseAdmin
      .from('app_users')
      .select('*')
      .eq('id', numId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return mapUser(data, false);
  },

  async createUser({ name, email, password, phone, role, studentId, department }) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const { data, error } = await supabaseAdmin
      .from('app_users')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        phone: phone || '',
        role: role || 'Student',
        student_id: studentId || '',
        department: department || '',
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapUser(data, false);
  },

  async updateUser(id, updates) {
    const numId = toNumericId(id);
    if (!numId) return null;
    const patch = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.department !== undefined) patch.department = updates.department;
    if (updates.studentId !== undefined) patch.student_id = updates.studentId;
    if (updates.avatar !== undefined) patch.avatar = updates.avatar;
    if (updates.role !== undefined) patch.role = updates.role;
    if (updates.trustPoints !== undefined) patch.trust_points = updates.trustPoints;
    if (updates.notificationPreferences !== undefined) {
      patch.notification_preferences = updates.notificationPreferences;
    }
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      patch.password_hash = await bcrypt.hash(updates.password, salt);
    }

    const { data, error } = await supabaseAdmin
      .from('app_users')
      .update(patch)
      .eq('id', numId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapUser(data, false);
  },

  async listAllUsers() {
    const { data, error } = await supabaseAdmin
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((u) => mapUser(u, false));
  },

  async verifyPassword(plainPassword, passwordHash) {
    return bcrypt.compare(plainPassword, passwordHash);
  },

  // ---------------- LOST & FOUND ITEMS ----------------
  async createItem(type, payload) {
    const table = type === 'found' ? 'found_items' : 'lost_items';
    const insertRow = {
      title: payload.title,
      category: payload.category,
      location: payload.location,
      lat: payload.coordinates?.lat ?? null,
      lng: payload.coordinates?.lng ?? null,
      date: payload.date || new Date().toISOString(),
      time: payload.time || '',
      status: payload.status || 'active',
      description: payload.description,
      image: payload.image,
      security_question: payload.securityQuestion || '',
      reporter_id: toNumericId(payload.reporter),
      reporter_name: payload.reporterName || 'Anonymous',
      reporter_email: payload.reporterEmail || '',
      reporter_phone: payload.reporterPhone || '',
      tags: Array.isArray(payload.tags) ? payload.tags : [],
    };
    if (type === 'lost') {
      insertRow.reward = payload.reward || '';
      insertRow.contact_preference = payload.contactPreference || 'inapp';
    } else {
      insertRow.custody = payload.custody || 'security';
      insertRow.custody_location_details = payload.custodyLocationDetails || 'Campus Security Desk, Room 104';
    }

    const { data, error } = await supabaseAdmin.from(table).insert(insertRow).select('*').single();
    if (error) throw new Error(error.message);
    return type === 'found' ? mapFoundItem(data) : mapLostItem(data);
  },

  async queryItems(type, { category, custody, status, sort, q, reporterId } = {}) {
    const table = type === 'found' ? 'found_items' : 'lost_items';
    let query = supabaseAdmin.from(table).select('*');

    if (category && category !== 'all') query = query.eq('category', category);
    if (custody && custody !== 'all' && type === 'found') query = query.eq('custody', custody);
    if (reporterId) {
      const rId = toNumericId(reporterId);
      if (rId) query = query.eq('reporter_id', rId);
      else return [];
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    } else if (!reporterId) {
      query = query.neq('status', 'archived');
    }
    if (q) {
      const safe = String(q).replace(/[,%()]/g, ' ').trim();
      if (safe) {
        query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%,location.ilike.%${safe}%`);
      }
    }

    query = query.order('created_at', { ascending: sort === 'oldest' });
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map((row) => (type === 'found' ? mapFoundItem(row) : mapLostItem(row)));
  },

  async getItemById(type, id) {
    const numId = toNumericId(id);
    if (!numId) return null;
    const table = type === 'found' ? 'found_items' : 'lost_items';
    const { data, error } = await supabaseAdmin.from(table).select('*').eq('id', numId).maybeSingle();
    if (error) throw new Error(error.message);
    return type === 'found' ? mapFoundItem(data) : mapLostItem(data);
  },

  async updateItem(type, id, updates) {
    const numId = toNumericId(id);
    if (!numId) return null;
    const table = type === 'found' ? 'found_items' : 'lost_items';
    const patch = { updated_at: new Date().toISOString() };
    const directCols = ['title', 'category', 'location', 'status', 'description', 'image', 'time', 'reward', 'custody'];
    directCols.forEach((col) => {
      if (updates[col] !== undefined) patch[col] = updates[col];
    });
    if (updates.securityQuestion !== undefined) patch.security_question = updates.securityQuestion;
    if (updates.custodyLocationDetails !== undefined) patch.custody_location_details = updates.custodyLocationDetails;

    const { data, error } = await supabaseAdmin.from(table).update(patch).eq('id', numId).select('*').single();
    if (error) throw new Error(error.message);
    return type === 'found' ? mapFoundItem(data) : mapLostItem(data);
  },

  async deleteItem(type, id) {
    const numId = toNumericId(id);
    if (!numId) return false;
    const table = type === 'found' ? 'found_items' : 'lost_items';
    const { error } = await supabaseAdmin.from(table).delete().eq('id', numId);
    if (error) throw new Error(error.message);
    return true;
  },

  // ---------------- CLAIMS ----------------
  async createClaim(payload) {
    const { data, error } = await supabaseAdmin
      .from('claims')
      .insert({
        item_id: toNumericId(payload.item),
        item_model: payload.itemModel || 'FoundItem',
        claimant_id: toNumericId(payload.claimant),
        claimant_name: payload.claimantName,
        claimant_email: payload.claimantEmail,
        claimant_phone: payload.claimantPhone || '',
        proof_details: payload.proofDetails,
        proof_image: payload.proofImage || '',
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapClaim(data);
  },

  async getClaimsForItem(itemId) {
    const numId = toNumericId(itemId);
    if (!numId) return [];
    const { data, error } = await supabaseAdmin
      .from('claims')
      .select('*')
      .eq('item_id', numId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapClaim);
  },

  async getClaimById(id) {
    const numId = toNumericId(id);
    if (!numId) return null;
    const { data, error } = await supabaseAdmin.from('claims').select('*').eq('id', numId).maybeSingle();
    if (error) throw new Error(error.message);
    return mapClaim(data);
  },

  async updateClaim(id, updates) {
    const numId = toNumericId(id);
    if (!numId) return null;
    const patch = { updated_at: new Date().toISOString() };
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.reviewerNotes !== undefined) patch.reviewer_notes = updates.reviewerNotes;
    const { data, error } = await supabaseAdmin.from('claims').update(patch).eq('id', numId).select('*').single();
    if (error) throw new Error(error.message);
    return mapClaim(data);
  },

  async listAllClaims() {
    const { data, error } = await supabaseAdmin
      .from('claims')
      .select('*, claimant:app_users(id, name, email, role, department, avatar)')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((row) => ({
      ...mapClaim(row),
      claimant: row.claimant ? { ...row.claimant, _id: String(row.claimant.id) } : null,
    }));
  },

  // ---------------- NOTIFICATIONS ----------------
  async createNotification(payload) {
    const rId = toNumericId(payload.recipient);
    if (!rId) return null;
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        recipient_id: rId,
        title: payload.title,
        message: payload.message,
        type: payload.type || 'info',
        link: payload.link || '',
        related_item_id: toNumericId(payload.relatedItem),
        related_item_model: payload.relatedItemModel || '',
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapNotification(data);
  },

  async getUserNotifications(userId) {
    const rId = toNumericId(userId);
    if (!rId) return [];
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('recipient_id', rId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data || []).map(mapNotification);
  },

  async markNotificationRead(id, userId) {
    const nId = toNumericId(id);
    const uId = toNumericId(userId);
    if (!nId || !uId) return null;
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', nId)
      .eq('recipient_id', uId)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    return mapNotification(data);
  },

  async markAllNotificationsRead(userId) {
    const uId = toNumericId(userId);
    if (!uId) return;
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', uId)
      .eq('is_read', false);
    if (error) throw new Error(error.message);
  },

  async deleteNotification(id, userId) {
    const nId = toNumericId(id);
    const uId = toNumericId(userId);
    if (!nId || !uId) return null;
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', nId)
      .eq('recipient_id', uId)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    return mapNotification(data);
  },

  // ---------------- AUDIT LOGS & ANALYTICS ----------------
  async recordAudit({ actorId, actorName, action, targetType, targetId, details }) {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      actor_id: toNumericId(actorId),
      actor_name: actorName || 'System',
      action,
      target_type: targetType || '',
      target_id: targetId ? String(targetId) : '',
      details: details || '',
    });
    if (error) console.warn('AuditLog insert warning:', error.message);
  },

  async getAuditLogs(limit = 50, action = null) {
    let q = supabaseAdmin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (action) q = q.eq('action', action);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []).map((l) => ({
      _id: String(l.id),
      actor: l.actor_id ? String(l.actor_id) : null,
      actorName: l.actor_name,
      action: l.action,
      targetType: l.target_type,
      targetId: l.target_id,
      details: l.details,
      createdAt: l.created_at,
    }));
  },

  // ---------------- CHAT ----------------
  async getUserConversations(userId) {
    const uId = toNumericId(userId);
    if (!uId) return [];
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .contains('participant_ids', [uId])
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getOrCreateConversation({ currentUserId, recipientId, itemId, itemModel, itemTitle, itemImage }) {
    const u1 = toNumericId(currentUserId);
    const u2 = toNumericId(recipientId);
    const itmId = toNumericId(itemId);

    const existingList = await this.getUserConversations(u1);
    let existing = existingList.find((c) => {
      const hasBoth = c.participant_ids.includes(u1) && c.participant_ids.includes(u2);
      if (!itmId) return hasBoth;
      return hasBoth && c.item_id === itmId;
    });

    if (!existing) {
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .insert({
          participant_ids: [u1, u2],
          item_id: itmId,
          item_model: itemModel || 'FoundItem',
          item_title: itemTitle || 'Property Discussion',
          item_image: itemImage || '',
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      existing = data;
    }

    const participants = await Promise.all((existing.participant_ids || []).map((pid) => this.findUserById(pid)));
    return {
      _id: String(existing.id),
      participants: participants.filter(Boolean),
      item: existing.item_id ? String(existing.item_id) : null,
      itemModel: existing.item_model,
      itemTitle: existing.item_title,
      itemImage: existing.item_image,
      lastMessage: existing.last_message,
      unreadCounts: existing.unread_counts || {},
      updatedAt: existing.updated_at,
    };
  },

  async getConversationById(id) {
    const numId = toNumericId(id);
    if (!numId) return null;
    const { data, error } = await supabaseAdmin.from('conversations').select('*').eq('id', numId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  async getMessages(convId) {
    const cId = toNumericId(convId);
    if (!cId) return [];
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', cId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data || []).map((m) => ({
      _id: String(m.id),
      conversation: String(m.conversation_id),
      sender: String(m.sender_id),
      senderName: m.sender_name,
      senderRole: m.sender_role,
      senderAvatar: m.sender_avatar,
      text: m.text,
      attachments: m.attachments || [],
      createdAt: m.created_at,
    }));
  },

  async addMessage({ convId, sender, text, attachments = [] }) {
    const cId = toNumericId(convId);
    const sId = toNumericId(sender._id);
    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: cId,
        sender_id: sId,
        sender_name: sender.name,
        sender_role: sender.role,
        sender_avatar: sender.avatar || '',
        text: text.trim(),
        attachments,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    const conv = await this.getConversationById(cId);
    const unread = { ...(conv?.unread_counts || {}) };
    (conv?.participant_ids || []).forEach((pid) => {
      if (pid !== sId) unread[String(pid)] = (unread[String(pid)] || 0) + 1;
    });

    await supabaseAdmin
      .from('conversations')
      .update({
        last_message: { text: data.text, sender: sId, senderName: sender.name, createdAt: data.created_at },
        unread_counts: unread,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cId);

    return {
      _id: String(data.id),
      conversation: String(data.conversation_id),
      sender: String(data.sender_id),
      senderName: data.sender_name,
      senderRole: data.sender_role,
      senderAvatar: data.sender_avatar,
      text: data.text,
      attachments: data.attachments || [],
      createdAt: data.created_at,
    };
  },

  async markConversationRead(convId, userId) {
    const cId = toNumericId(convId);
    const conv = await this.getConversationById(cId);
    if (!conv) return;
    const unread = { ...(conv.unread_counts || {}) };
    unread[String(userId)] = 0;
    await supabaseAdmin.from('conversations').update({ unread_counts: unread }).eq('id', cId);
  },

  // ---------------- ADMIN STATS ----------------
  async getStats() {
    const [users, lost, found, claims, logs] = await Promise.all([
      supabaseAdmin.from('app_users').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('lost_items').select('status'),
      supabaseAdmin.from('found_items').select('status'),
      supabaseAdmin.from('claims').select('status'),
      supabaseAdmin.from('audit_logs').select('id', { count: 'exact', head: true }),
    ]);
    const lostRows = lost.data || [];
    const foundRows = found.data || [];
    const claimRows = claims.data || [];
    const returned = foundRows.filter((r) => r.status === 'returned').length;
    const total = lostRows.length + foundRows.length;
    return {
      totalUsers: users.count || 0,
      totalLost: lostRows.length,
      totalFound: foundRows.length,
      activeLost: lostRows.filter((r) => r.status === 'active').length,
      activeFound: foundRows.filter((r) => r.status === 'active').length,
      pendingClaims: claimRows.filter((r) => r.status === 'pending').length,
      returnedItems: returned,
      recoveryRate: `${total > 0 ? Math.round((returned / total) * 100) : 0}%`,
      vaultCount: foundRows.filter((r) => r.status === 'active').length,
      auditLogsCount: logs.count || 0,
    };
  },
};

module.exports = SupabaseDB;
