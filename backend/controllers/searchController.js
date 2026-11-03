const mongoose = require('mongoose');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const { MOCK_LOST_ITEMS, MOCK_FOUND_ITEMS } = require('../data/mockData');
const {
  DEFAULT_CAMPUS_CENTER,
  CAMPUS_LANDMARKS,
  calculateHaversineDistance,
  formatDistance,
  resolveItemCoordinates,
} = require('../services/geoService');

/**
 * @desc    Unified search across both Lost and Found collections
 * @route   GET /api/search
 * @access  Public
 */
const searchAllItems = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const all = [...MOCK_LOST_ITEMS, ...MOCK_FOUND_ITEMS];
      return res.status(200).json({
        success: true,
        totalCount: all.length,
        data: all,
      });
    }

    const { q, type, category, status, sort } = req.query;

    let baseFilter = {};

    if (category && category !== 'all') {
      baseFilter.category = category;
    }

    if (status && status !== 'all') {
      baseFilter.status = status;
    } else {
      baseFilter.status = { $ne: 'archived' };
    }

    if (q) {
      const safeQ = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      baseFilter.$or = [
        { title: { $regex: safeQ, $options: 'i' } },
        { description: { $regex: safeQ, $options: 'i' } },
        { location: { $regex: safeQ, $options: 'i' } },
        { tags: { $regex: safeQ, $options: 'i' } },
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    }

    let results = [];

    if (!type || type === 'all') {
      // Query both collections in parallel
      const [lostItems, foundItems] = await Promise.all([
        LostItem.find(baseFilter).sort(sortOption).lean(),
        FoundItem.find(baseFilter).sort(sortOption).lean(),
      ]);

      const taggedLost = lostItems.map((item) => ({ ...item, type: 'lost' }));
      const taggedFound = foundItems.map((item) => ({ ...item, type: 'found' }));

      results = [...taggedLost, ...taggedFound];

      // Sort combined array by date
      results.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt);
        const dateB = new Date(b.date || b.createdAt);
        return sort === 'oldest' ? dateA - dateB : dateB - dateA;
      });
    } else if (type === 'lost') {
      const lostItems = await LostItem.find(baseFilter).sort(sortOption).lean();
      results = lostItems.map((item) => ({ ...item, type: 'lost' }));
    } else if (type === 'found') {
      const foundItems = await FoundItem.find(baseFilter).sort(sortOption).lean();
      results = foundItems.map((item) => ({ ...item, type: 'found' }));
    }

    res.status(200).json({
      success: true,
      totalCount: results.length,
      data: results,
    });
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during search',
    });
  }
};

/**
 * @desc    Get Geo-spatial items for interactive Leaflet Map with proximity radius filter
 * @route   GET /api/search/map
 * @access  Public
 */
const getMapItems = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const all = [...MOCK_LOST_ITEMS, ...MOCK_FOUND_ITEMS].map((item) => ({
        ...item,
        distanceMeters: 250,
        distanceText: '250 m away',
      }));
      return res.status(200).json({
        success: true,
        center: { lat: 40.7295, lng: -73.9965, name: 'Campus Center Plaza' },
        radiusMeters: 5000,
        totalCount: all.length,
        data: all,
      });
    }

    const {
      lat,
      lng,
      radius = '5000', // in meters, or 'all'
      type = 'all',
      category = 'all',
      status = 'all',
      q = '',
    } = req.query;

    const centerLat = lat ? parseFloat(lat) : DEFAULT_CAMPUS_CENTER.lat;
    const centerLng = lng ? parseFloat(lng) : DEFAULT_CAMPUS_CENTER.lng;
    const maxRadius = radius === 'all' ? Infinity : parseFloat(radius) || 5000;

    let baseFilter = {};

    if (category && category !== 'all') {
      baseFilter.category = category;
    }

    if (status && status !== 'all') {
      baseFilter.status = status;
    } else {
      // By default show active, claimed, and returned (exclude deleted/archived)
      baseFilter.status = { $ne: 'archived' };
    }

    if (q && q.trim()) {
      baseFilter.$or = [
        { title: { $regex: q.trim(), $options: 'i' } },
        { description: { $regex: q.trim(), $options: 'i' } },
        { location: { $regex: q.trim(), $options: 'i' } },
        { tags: { $regex: q.trim(), $options: 'i' } },
      ];
    }

    let items = [];

    if (type === 'all' || type === 'lost') {
      const lost = await LostItem.find(baseFilter).lean();
      items.push(...lost.map((it) => ({ ...it, type: 'lost' })));
    }

    if (type === 'all' || type === 'found') {
      const found = await FoundItem.find(baseFilter).lean();
      items.push(...found.map((it) => ({ ...it, type: 'found' })));
    }

    // Process coordinates and calculate proximity distance
    let processed = items.map((item) => {
      const coords = resolveItemCoordinates(item);
      const distanceMeters = calculateHaversineDistance(
        centerLat,
        centerLng,
        coords.lat,
        coords.lng
      );

      return {
        ...item,
        coordinates: coords,
        distanceMeters: distanceMeters !== null ? distanceMeters : 999999,
        distanceText: formatDistance(distanceMeters),
      };
    });

    // Apply radius boundary filter
    if (maxRadius !== Infinity) {
      processed = processed.filter((item) => item.distanceMeters <= maxRadius);
    }

    // Sort by proximity: closest first
    processed.sort((a, b) => a.distanceMeters - b.distanceMeters);

    const lostCount = processed.filter((it) => it.type === 'lost').length;
    const foundCount = processed.filter((it) => it.type === 'found').length;
    const activeCount = processed.filter((it) => it.status === 'active').length;

    res.status(200).json({
      success: true,
      center: {
        lat: centerLat,
        lng: centerLng,
        radiusMeters: maxRadius === Infinity ? 'all' : maxRadius,
        campusName: DEFAULT_CAMPUS_CENTER.name,
      },
      counts: {
        total: processed.length,
        lost: lostCount,
        found: foundCount,
        active: activeCount,
      },
      landmarks: CAMPUS_LANDMARKS.map((lm) => ({
        name: lm.name,
        zone: lm.zone,
        lat: lm.lat,
        lng: lm.lng,
      })),
      data: processed,
    });
  } catch (error) {
    console.error('Map Items Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching map items',
    });
  }
};

module.exports = {
  searchAllItems,
  getMapItems,
};
