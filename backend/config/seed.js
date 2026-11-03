/**
 * Database Seeder Script for MongoDB Collections:
 * - Users
 * - LostItems
 * - FoundItems
 * - Claims
 * - Notifications
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Claim = require('../models/Claim');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lost_and_found_db';
    console.log(`⏳ Connecting to MongoDB at: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully.');

    // Clear existing collections
    console.log('🧹 Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      LostItem.deleteMany({}),
      FoundItem.deleteMany({}),
      Claim.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
      Conversation.deleteMany({}),
      Message.deleteMany({}),
    ]);

    // 1. Seed Users Collection
    console.log('🌱 Seeding Users Collection...');
    const users = await User.create([
      {
        name: 'Alex',
        email: 'alex.morgan@campus.edu',
        password: 'password123',
        phone: '+1 (555) 234-5678',
        role: 'Student',
        studentId: 'STU-98421',
        department: 'Computer Science & Engineering',
        trustPoints: 120,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      },
      {
        name: 'Officer David Vance',
        email: 'security.lostfound@campus.edu',
        password: 'password123',
        phone: '+1 (555) 911-0022',
        role: 'Security',
        studentId: 'SEC-004',
        department: 'Campus Safety & Police',
        trustPoints: 500,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
      },
      {
        name: 'Sarah Jenkins',
        email: 'sarah.j@campus.edu',
        password: 'password123',
        phone: '+1 (555) 890-1234',
        role: 'Student',
        studentId: 'STU-65231',
        department: 'Business Administration',
        trustPoints: 95,
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
      },
    ]);
    const [alex, officerDavid, sarah] = users;

    // 2. Seed LostItems Collection
    console.log('🌱 Seeding LostItems Collection...');
    const lostItems = await LostItem.create([
      {
        title: 'iPhone 13 (Midnight Blue with Clear Case)',
        category: 'Electronics',
        location: 'Main Campus Library, 2nd Floor Quiet Zone',
        coordinates: { lat: 40.7298, lng: -73.9972 },
        locationPoint: { type: 'Point', coordinates: [-73.9972, 40.7298] },
        date: new Date('2026-10-30T14:30:00Z'),
        time: '14:30',
        reward: '$50',
        status: 'active',
        description: 'Lost my iPhone 13 in a transparent shockproof case with a small cat sticker on back. Tempered glass screen protector.',
        image: 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&w=800&q=80',
        reporter: alex._id,
        reporterName: alex.name,
        reporterEmail: alex.email,
        reporterPhone: alex.phone,
        securityQuestion: 'What is the lock screen wallpaper photo?',
        tags: ['iphone', 'apple', 'blue', 'phone', 'library'],
      },
      {
        title: 'Black Leather Bifold Wallet',
        category: 'Wallets & Cards',
        location: 'Student Union Food Court near Subway',
        coordinates: { lat: 40.7305, lng: -73.9958 },
        locationPoint: { type: 'Point', coordinates: [-73.9958, 40.7305] },
        date: new Date('2026-10-29T12:15:00Z'),
        time: '12:15',
        reward: '$25',
        status: 'active',
        description: 'Black Tommy Hilfiger leather wallet. Contains driver license for Sarah Jenkins, student ID, and metro pass.',
        image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
        reporter: sarah._id,
        reporterName: sarah.name,
        reporterEmail: sarah.email,
        reporterPhone: sarah.phone,
        securityQuestion: 'What initials are embossed inside?',
        tags: ['wallet', 'leather', 'cards', 'id'],
      },
      {
        title: 'Casio fx-991EX Scientific Calculator',
        category: 'Books & Stationery',
        location: 'Science Building Room 402',
        coordinates: { lat: 40.7312, lng: -73.9980 },
        locationPoint: { type: 'Point', coordinates: [-73.9980, 40.7312] },
        date: new Date('2026-10-31T11:00:00Z'),
        time: '11:00',
        reward: '$15',
        status: 'active',
        description: 'Scientific calculator left on the back row bench during physics quiz. Has a silver star sticker on sliding back cover.',
        image: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80',
        reporter: alex._id,
        reporterName: alex.name,
        reporterEmail: alex.email,
        reporterPhone: alex.phone,
        securityQuestion: 'What is written on the inner cover?',
        tags: ['calculator', 'casio', 'physics', 'stationery'],
      },
      {
        title: 'Hydro Flask 32oz Water Bottle (Cobalt Blue)',
        category: 'Accessories',
        location: 'Athletics & Recreation Center Courts',
        coordinates: { lat: 40.7265, lng: -73.9940 },
        locationPoint: { type: 'Point', coordinates: [-73.9940, 40.7265] },
        date: new Date('2026-11-01T16:00:00Z'),
        time: '16:00',
        reward: '',
        status: 'active',
        description: 'Deep blue Hydro Flask with sticker of national parks. Left next to basketball court bleachers.',
        image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80',
        reporter: sarah._id,
        reporterName: sarah.name,
        reporterEmail: sarah.email,
        reporterPhone: sarah.phone,
        securityQuestion: 'What sticker is on the bottle cap lid?',
        tags: ['bottle', 'water', 'hydro flask', 'gym'],
      },
    ]);

    // 3. Seed FoundItems Collection
    console.log('🌱 Seeding FoundItems Collection...');
    const foundItems = await FoundItem.create([
      {
        title: 'Sony WH-1000XM4 Noise Canceling Headphones',
        category: 'Electronics',
        location: 'Student Lounge near Coffee Vending Machine',
        coordinates: { lat: 40.7289, lng: -73.9960 },
        locationPoint: { type: 'Point', coordinates: [-73.9960, 40.7289] },
        date: new Date('2026-10-31T09:20:00Z'),
        time: '09:20',
        custody: 'security',
        custodyLocationDetails: 'Campus Security Desk Room 104',
        status: 'active',
        description: 'Black Sony over-ear headphones in zippered travel case found on sofa.',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
        reporter: officerDavid._id,
        reporterName: officerDavid.name,
        reporterEmail: officerDavid.email,
        reporterPhone: officerDavid.phone,
        securityQuestion: 'What is stored in the mesh pouch inside the headphone case?',
        tags: ['sony', 'headphones', 'audio', 'electronics'],
      },
      {
        title: 'Set of Keys with Red Subaru Fob & Carabiner',
        category: 'Keys',
        location: 'West Parking Lot Section B',
        coordinates: { lat: 40.7278, lng: -73.9995 },
        locationPoint: { type: 'Point', coordinates: [-73.9995, 40.7278] },
        date: new Date('2026-10-30T16:10:00Z'),
        time: '16:10',
        custody: 'with_me',
        custodyLocationDetails: 'With Founder (Alex)',
        status: 'active',
        description: 'Ring of 4 keys including Subaru fob, brass house keys, and silver bottle opener on heavy red climbing carabiner.',
        image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=800&q=80',
        reporter: alex._id,
        reporterName: alex.name,
        reporterEmail: alex.email,
        reporterPhone: alex.phone,
        securityQuestion: 'What logo is on the bottle opener keychain?',
        tags: ['keys', 'car key', 'subaru', 'carabiner'],
      },
      {
        title: 'Ray-Ban Aviator Sunglasses in Brown Case',
        category: 'Accessories',
        location: 'Engineering Quad Lawn Bench',
        coordinates: { lat: 40.7320, lng: -73.9945 },
        locationPoint: { type: 'Point', coordinates: [-73.9945, 40.7320] },
        date: new Date('2026-10-26T13:00:00Z'),
        time: '13:00',
        custody: 'security',
        custodyLocationDetails: 'Returned to verified owner',
        status: 'returned',
        description: 'Gold-framed aviator sunglasses with polarized green lenses in original brown leather snap pouch.',
        image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
        reporter: officerDavid._id,
        reporterName: officerDavid.name,
        reporterEmail: officerDavid.email,
        reporterPhone: officerDavid.phone,
        securityQuestion: 'What is etched on the left lens corner?',
        tags: ['sunglasses', 'ray-ban', 'glasses', 'accessories'],
      },
      {
        title: 'AirPods Pro 2nd Gen in White MagSafe Case',
        category: 'Electronics',
        location: 'University Health & Wellness Center Lobby',
        coordinates: { lat: 40.7340, lng: -73.9990 },
        locationPoint: { type: 'Point', coordinates: [-73.9990, 40.7340] },
        date: new Date('2026-11-01T10:15:00Z'),
        time: '10:15',
        custody: 'security',
        custodyLocationDetails: 'Health Clinic Reception',
        status: 'active',
        description: 'Found Apple AirPods Pro case with both earbuds inside near the waiting area magazine rack.',
        image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=800&q=80',
        reporter: officerDavid._id,
        reporterName: officerDavid.name,
        reporterEmail: officerDavid.email,
        reporterPhone: officerDavid.phone,
        securityQuestion: 'What engraving is on the front of the white charging case?',
        tags: ['apple', 'airpods', 'earphones', 'electronics'],
      },
    ]);

    // 4. Seed Claims Collection
    console.log('🌱 Seeding Claims Collection...');
    const claims = await Claim.create([
      {
        item: foundItems[1]._id, // Keys
        itemModel: 'FoundItem',
        claimant: sarah._id,
        claimantName: 'Marcus Cole',
        claimantEmail: 'm.cole@campus.edu',
        claimantPhone: '+1 (555) 789-0123',
        proofDetails: 'The bottle opener keychain has an engraved mountain logo that says REI Co-op.',
        status: 'pending',
      },
      {
        item: foundItems[2]._id, // Ray-Ban Sunglasses
        itemModel: 'FoundItem',
        claimant: alex._id,
        claimantName: 'Alex',
        claimantEmail: alex.email,
        claimantPhone: alex.phone,
        proofDetails: 'Prescription aviator sunglasses, -2.25 on both lenses. Prescription card shown to security officer.',
        status: 'approved',
        reviewerNotes: 'Verified at Campus Security Desk Room 104 and safely returned.',
      },
    ]);

    // 5. Seed Notifications Collection
    console.log('🌱 Seeding Notifications Collection...');
    await Notification.create([
      {
        recipient: alex._id,
        title: 'Potential Match Found!',
        message: 'A report for "Sony WH-1000XM4 Headphones" matches your lost item category and timing.',
        type: 'match',
        link: `/item-details.html?id=${foundItems[0]._id}`,
        read: false,
      },
      {
        recipient: alex._id,
        title: 'New Ownership Claim Inquiry',
        message: 'Marcus Cole submitted a verification claim for your found report "Set of Keys with Red Subaru Fob".',
        type: 'claim',
        link: '/my-reports.html',
        read: false,
      },
      {
        recipient: alex._id,
        title: 'Report Verified & Published',
        message: 'Your lost report for "iPhone 13 (Midnight Blue)" was verified by campus moderation.',
        type: 'system',
        link: `/item-details.html?id=${lostItems[0]._id}`,
        read: true,
      },
      {
        recipient: sarah._id,
        title: 'Community Reminder',
        message: 'Remember to check Building A Room 104 if you lost documents or credit cards.',
        type: 'tip',
        link: '/browse-items.html',
        read: true,
      },
    ]);

    // 6. Seed Audit Logs Collection
    console.log('📋 Seeding AuditLogs Compliance Trail...');
    await AuditLog.create([
      {
        action: 'VAULT_INTAKE',
        performedBy: officerDavid._id,
        performerName: officerDavid.name,
        performerRole: officerDavid.role,
        targetId: foundItems[0]._id.toString(),
        targetType: 'Vault',
        details: 'Intake of Sony WH-1000XM4 Headphones into physical security locker A-01 (Room 104).',
        metadata: { lockerNumber: 'Locker A-01', location: 'Student Lounge' },
      },
      {
        action: 'CLAIM_APPROVED',
        performedBy: officerDavid._id,
        performerName: officerDavid.name,
        performerRole: officerDavid.role,
        targetId: claims[0]._id.toString(),
        targetType: 'Claim',
        details: 'Approved claim for Casio fx-991EX Calculator to Alex. Handover verified via student ID.',
        metadata: { claimant: 'Alex', status: 'approved' },
      },
      {
        action: 'USER_ROLE_UPDATED',
        performedBy: officerDavid._id,
        performerName: officerDavid.name,
        performerRole: officerDavid.role,
        targetId: alex._id.toString(),
        targetType: 'User',
        details: 'Officer David Vance verified campus identity for Alex. Trust points increased to 120.',
        metadata: { trustPoints: 120 },
      },
    ]);

    // 7. Seed Real-Time Chat Conversations
    console.log('💬 Seeding Chat Conversations & Messages...');
    const conversation = await Conversation.create({
      participants: [alex._id, officerDavid._id],
      item: foundItems[0]._id,
      itemModel: 'FoundItem',
      itemTitle: foundItems[0].title,
      itemImage: foundItems[0].image,
      lastMessage: {
        text: "Thank you Officer Vance! I'll tell him to drop by Room 104 right away.",
        sender: alex._id,
        senderName: alex.name,
        createdAt: new Date('2026-10-31T10:45:00Z'),
      },
      unreadCounts: new Map([[alex._id.toString(), 0], [officerDavid._id.toString(), 0]]),
    });

    await Message.create([
      {
        conversation: conversation._id,
        sender: alex._id,
        senderName: alex.name,
        senderAvatar: alex.avatar,
        senderRole: alex.role,
        text: 'Hello Officer Vance! I saw you logged the Sony Headphones found at the Student Lounge. I think those might belong to my roommate.',
        createdAt: new Date('2026-10-31T10:30:00Z'),
        isRead: true,
      },
      {
        conversation: conversation._id,
        sender: officerDavid._id,
        senderName: officerDavid.name,
        senderAvatar: officerDavid.avatar,
        senderRole: officerDavid.role,
        text: 'Hello Alex. Please have your roommate submit a claim online or bring proof of purchase/ID directly to Campus Security Desk Room 104.',
        createdAt: new Date('2026-10-31T10:35:00Z'),
        isRead: true,
      },
      {
        conversation: conversation._id,
        sender: alex._id,
        senderName: alex.name,
        senderAvatar: alex.avatar,
        senderRole: alex.role,
        text: "Thank you Officer Vance! I'll tell him to drop by Room 104 right away.",
        createdAt: new Date('2026-10-31T10:45:00Z'),
        isRead: true,
      },
    ]);

    console.log('\n🎉 ALL 8 DATABASE COLLECTIONS SEEDED SUCCESSFULLY:');
    console.log(`   👥 Users: ${await User.countDocuments()}`);
    console.log(`   🔍 LostItems: ${await LostItem.countDocuments()}`);
    console.log(`   🎁 FoundItems: ${await FoundItem.countDocuments()}`);
    console.log(`   📝 Claims: ${await Claim.countDocuments()}`);
    console.log(`   🔔 Notifications: ${await Notification.countDocuments()}`);
    console.log(`   📋 AuditLogs: ${await AuditLog.countDocuments()}`);
    console.log(`   💬 Conversations: ${await Conversation.countDocuments()}`);
    console.log(`   📨 Messages: ${await Message.countDocuments()}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Database Seeding Error:', error);
    process.exit(1);
  }
};

seedDatabase();
