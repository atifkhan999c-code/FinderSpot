const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');

/**
 * Intelligent Lost & Found Matching Engine
 */
class MatchingService {
  /**
   * Scan for opposite-type items that match given item
   * @param {Object} item - Item object
   * @param {String} type - 'lost' or 'found'
   */
  static async findPotentialMatches(item, type = 'lost') {
    try {
      const TargetModel = type === 'lost' ? FoundItem : LostItem;

      // Extract significant keywords (longer than 3 chars)
      const keywords = item.title
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .split(' ')
        .filter((w) => w.length > 3);

      const regexQueries = keywords.map((word) => ({
        title: { $regex: word, $options: 'i' },
      }));

      // Search in same category and either text search or regex on title/description
      const matches = await TargetModel.find({
        category: item.category,
        status: 'active',
        $or: regexQueries.length > 0 ? regexQueries : [{ category: item.category }],
      }).limit(5);

      return matches;
    } catch (error) {
      console.error('Matching Service Error:', error);
      return [];
    }
  }
}

module.exports = MatchingService;
