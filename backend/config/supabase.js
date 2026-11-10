const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://aebtvrohmvuhjqzrigkz.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_Q1wkwasxwjyB-_ftCrDyww_sSSJzGvq';

const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

const supabasePublic = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const supabaseAdmin = SUPABASE_SECRET_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

function isSupabaseDbReady() {
  return Boolean(supabaseAdmin);
}

/**
 * Verify live HTTP reachability of Supabase project
 */
async function checkSupabaseConnection() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
    });
    return {
      reachable: res.ok || res.status === 401 || res.status === 404,
      status: res.status,
      url: SUPABASE_URL,
      secretKeyConfigured: Boolean(SUPABASE_SECRET_KEY),
    };
  } catch (err) {
    return {
      reachable: false,
      error: err.message,
      url: SUPABASE_URL,
      secretKeyConfigured: Boolean(SUPABASE_SECRET_KEY),
    };
  }
}

/**
 * Upload an image file stored locally by Multer into Supabase Storage bucket 'item-images'
 * Returns the public CDN URL if successful, or null to fall back to local /uploads/ path
 */
async function uploadImageToSupabase(file, folder = 'items') {
  if (!supabaseAdmin || !file || !file.path) return null;

  try {
    const buffer = fs.readFileSync(file.path);
    const ext = path.extname(file.originalname || file.filename).toLowerCase() || '.jpg';
    const objectPath = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    const { error } = await supabaseAdmin.storage
      .from('item-images')
      .upload(objectPath, buffer, {
        contentType: file.mimetype || 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.warn('⚠️ Supabase Storage Upload Notice:', error.message);
      return null;
    }

    const { data } = supabaseAdmin.storage
      .from('item-images')
      .getPublicUrl(objectPath);

    return data?.publicUrl || null;
  } catch (err) {
    console.warn('⚠️ Supabase Storage Exception:', err.message);
    return null;
  }
}

module.exports = {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  supabasePublic,
  supabaseAdmin,
  isSupabaseDbReady,
  checkSupabaseConnection,
  uploadImageToSupabase,
};
