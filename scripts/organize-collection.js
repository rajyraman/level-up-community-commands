/**
 * Collection Organization Script
 * Organizes approved collections into user-specific folders
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class CollectionOrganizer {
  constructor() {
    this.dateFormat = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * Organize a collection into the appropriate user folder
   * @param {string} issueDataPath - Path to parsed issue data
   * @param {string} collectionsBaseDir - Base collections directory
   * @returns {Object} Organization result
   */
  organizeCollection(issueDataPath, collectionsBaseDir) {
    if (!fs.existsSync(issueDataPath)) {
      throw new Error(`Issue data file not found: ${issueDataPath}`);
    }

    const issueData = JSON.parse(fs.readFileSync(issueDataPath, 'utf8'));
    const username = issueData.contactInfo;

    if (!username) {
      throw new Error('No GitHub username found in contact info');
    }

    // Create user directory structure
    const userDir = path.join(collectionsBaseDir, username);
    const collectionsDir = path.join(userDir, 'collections');
    const commandsDir = path.join(userDir, 'commands');

    this.ensureDirectoryExists(userDir);
    this.ensureDirectoryExists(collectionsDir);
    this.ensureDirectoryExists(commandsDir);

    // Generate collection files
    const collectionInfo = this.generateCollectionFiles(issueData, collectionsDir, commandsDir);

    // Update user profile
    this.updateUserProfile(userDir, issueData, collectionInfo);

    // Generate index files
    this.updateCollectionsIndex(collectionsBaseDir);

    return {
      username,
      userDir,
      collectionPath: collectionInfo.collectionPath,
      commandFiles: collectionInfo.commandFiles,
      totalCommands: collectionInfo.totalCommands,
      collectionId: collectionInfo.collectionId
    };
  }

  /**
   * Ensure directory exists, create if it doesn't
   * @param {string} dirPath - Directory path
   */
  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Generate collection and command files
   * @param {Object} issueData - Parsed issue data
   * @param {string} collectionsDir - Collections directory
   * @param {string} commandsDir - Commands directory
   * @returns {Object} Collection information
   */
  generateCollectionFiles(issueData, collectionsDir, commandsDir) {
    const collectionId = this.generateCollectionId(issueData);
    const timestamp = new Date().toISOString();

    // Create collection metadata
    const collectionMetadata = {
      id: collectionId,
      name: issueData.metadata.name,
      description: issueData.metadata.description,
      category: issueData.metadata.category,
      tags: issueData.metadata.tags || [],
      author: issueData.metadata.author,
      submittedBy: issueData.metadata.submittedBy,
      submittedAt: issueData.metadata.submittedAt,
      processedAt: timestamp,
      dynamicsVersion: issueData.metadata.dynamicsVersion,
      commandCount: issueData.commands.length,
      autoApproved: true,
      version: '1.0.0',
      source: {
        issueNumber: issueData.issueInfo.number,
        issueUrl: issueData.issueInfo.url,
        repository: 'level-up-community-commands'
      },
      documentation: issueData.documentation || {},
      stats: {
        downloads: 0,
        rating: 0,
        votes: 0
      }
    };

    // Generate collection file
    const collectionFileName = `${this.sanitizeFileName(issueData.metadata.name)}.json`;
    const collectionPath = path.join(collectionsDir, collectionFileName);

    const collectionData = {
      ...collectionMetadata,
      commands: issueData.commands.map((command, index) => ({
        id: this.generateCommandId(command, index),
        name: command.name,
        description: command.description || '',
        category: command.category || issueData.metadata.category,
        code: command.code,
        icon: command.icon || 'code',
        tags: command.tags || [],
        author: command.author || issueData.metadata.author,
        version: '1.0.0',
        createdAt: timestamp
      }))
    };

    fs.writeFileSync(collectionPath, JSON.stringify(collectionData, null, 2), 'utf8');

    // Generate individual command files
    const commandFiles = [];
    issueData.commands.forEach((command, index) => {
      const commandId = this.generateCommandId(command, index);
      const fileName = `${this.sanitizeFileName(command.name || `command-${index + 1}`)}.js`;
      const commandPath = path.join(commandsDir, fileName);

      const commandContent = this.generateCommandFileContent(command, collectionMetadata, commandId);
      fs.writeFileSync(commandPath, commandContent, 'utf8');

      commandFiles.push({
        id: commandId,
        name: command.name,
        fileName,
        path: commandPath,
        size: commandContent.length
      });
    });

    // Generate Level Up import file
    const levelUpImportPath = path.join(collectionsDir, `${this.sanitizeFileName(issueData.metadata.name)}-levelup.json`);
    const levelUpData = this.generateLevelUpImport(collectionData);
    fs.writeFileSync(levelUpImportPath, JSON.stringify(levelUpData, null, 2), 'utf8');

    return {
      collectionId,
      collectionPath,
      levelUpImportPath,
      commandFiles,
      totalCommands: issueData.commands.length,
      collectionFileName
    };
  }

  /**
   * Generate unique collection ID
   * @param {Object} issueData - Issue data
   * @returns {string} Collection ID
   */
  generateCollectionId(issueData) {
    const data = `${issueData.metadata.name}-${issueData.metadata.submittedBy}-${issueData.issueInfo.number}`;
    return crypto.createHash('md5').update(data).digest('hex').substring(0, 8);
  }

  /**
   * Generate unique command ID
   * @param {Object} command - Command object
   * @param {number} index - Command index
   * @returns {string} Command ID
   */
  generateCommandId(command, index) {
    const data = `${command.name || `cmd-${index}`}-${command.code?.substring(0, 100) || ''}`;
    return crypto.createHash('md5').update(data).digest('hex').substring(0, 8);
  }

  /**
   * Sanitize filename for safe file system usage
   * @param {string} name - Original name
   * @returns {string} Sanitized filename
   */
  sanitizeFileName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }

  /**
   * Generate Level Up import format
   * @param {Object} collectionData - Collection data
   * @returns {Object} Level Up import data
   */
  generateLevelUpImport(collectionData) {
    return {
      version: '1.0.0',
      exportedAt: Date.now(),
      source: 'level-up-community-commands',
      collection: {
        name: collectionData.name,
        description: collectionData.description,
        author: collectionData.author,
        version: collectionData.version
      },
      commands: collectionData.commands.map(command => ({
        name: command.name,
        description: command.description,
        code: command.code,
        icon: command.icon
      }))
    };
  }

  /**
   * Generate command file content with proper header
   * @param {Object} command - Command object
   * @param {Object} collectionMetadata - Collection metadata
   * @param {string} commandId - Command ID
   * @returns {string} Command file content
   */
  generateCommandFileContent(command, collectionMetadata, commandId) {
    const header = `// Command Name: ${command.name}
// Description: ${command.description || 'No description provided'}
// Category: ${command.category || collectionMetadata.category}
// Author: ${command.author || collectionMetadata.author}
// Collection: ${collectionMetadata.name}
// Collection ID: ${collectionMetadata.id}
// Command ID: ${commandId}
// Version: ${command.version || '1.0.0'}
// Source: ${collectionMetadata.source.issueUrl}
// Auto-approved: ${collectionMetadata.autoApproved}
// Processed: ${collectionMetadata.processedAt}

/**
 * ${command.description || 'No description provided'}
 *
 * Part of collection: ${collectionMetadata.name}
 *
 * Usage: Run this command from Level Up for Dynamics 365
 *
 * For more commands from this collection, visit:
 * https://rajyraman.github.io/level-up-community-commands/collections/${collectionMetadata.source.repository}
 */

`;

    return header + (command.code || '');
  }

  /**
   * Update user profile file
   * @param {string} userDir - User directory
   * @param {Object} issueData - Issue data
   * @param {Object} collectionInfo - Collection information
   */
  updateUserProfile(userDir, issueData, collectionInfo) {
    const profilePath = path.join(userDir, 'profile.json');

    let profile = {
      username: issueData.contactInfo,
      displayName: issueData.metadata.author || issueData.contactInfo,
      joinedAt: new Date().toISOString(),
      collections: [],
      stats: {
        totalCollections: 0,
        totalCommands: 0,
        totalDownloads: 0,
        avgRating: 0
      },
      badges: [],
      bio: '',
      website: '',
      social: {}
    };

    // Load existing profile if it exists
    if (fs.existsSync(profilePath)) {
      try {
        profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
      } catch (error) {
        console.warn('Failed to load existing profile, creating new one');
      }
    }

    // Add new collection to profile
    const collectionRef = {
      id: collectionInfo.collectionId,
      name: issueData.metadata.name,
      description: issueData.metadata.description,
      category: issueData.metadata.category,
      commandCount: collectionInfo.totalCommands,
      submittedAt: issueData.metadata.submittedAt,
      processedAt: new Date().toISOString(),
      fileName: collectionInfo.collectionFileName,
      tags: issueData.metadata.tags || []
    };

    // Check if collection already exists (avoid duplicates)
    const existingIndex = profile.collections.findIndex(c => c.id === collectionInfo.collectionId);
    if (existingIndex >= 0) {
      profile.collections[existingIndex] = collectionRef;
    } else {
      profile.collections.push(collectionRef);
    }

    // Update stats
    profile.stats.totalCollections = profile.collections.length;
    profile.stats.totalCommands = profile.collections.reduce((sum, c) => sum + c.commandCount, 0);

    // Award badges
    this.awardBadges(profile);

    // Save updated profile
    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), 'utf8');
  }

  /**
   * Award badges based on user activity
   * @param {Object} profile - User profile
   */
  awardBadges(profile) {
    const badges = [];

    // First Collection badge
    if (profile.stats.totalCollections >= 1 && !profile.badges.some(b => b.id === 'first-collection')) {
      badges.push({
        id: 'first-collection',
        name: 'First Collection',
        description: 'Submitted your first command collection',
        icon: '🎉',
        awardedAt: new Date().toISOString()
      });
    }

    // Prolific Contributor badge
    if (profile.stats.totalCollections >= 5 && !profile.badges.some(b => b.id === 'prolific-contributor')) {
      badges.push({
        id: 'prolific-contributor',
        name: 'Prolific Contributor',
        description: 'Submitted 5 or more collections',
        icon: '🏆',
        awardedAt: new Date().toISOString()
      });
    }

    // Command Master badge
    if (profile.stats.totalCommands >= 20 && !profile.badges.some(b => b.id === 'command-master')) {
      badges.push({
        id: 'command-master',
        name: 'Command Master',
        description: 'Contributed 20 or more commands',
        icon: '⭐',
        awardedAt: new Date().toISOString()
      });
    }

    // Add new badges to profile
    profile.badges = [...profile.badges, ...badges];
  }

  /**
   * Update the main collections index
   * @param {string} collectionsBaseDir - Base collections directory
   */
  updateCollectionsIndex(collectionsBaseDir) {
    const indexPath = path.join(collectionsBaseDir, 'index.json');

    const index = {
      generatedAt: new Date().toISOString(),
      totalUsers: 0,
      totalCollections: 0,
      totalCommands: 0,
      users: [],
      recentCollections: [],
      categories: {},
      tags: {}
    };

    // Scan all user directories
    const userDirs = fs.readdirSync(collectionsBaseDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && dirent.name !== '.git')
      .map(dirent => dirent.name);

    userDirs.forEach(username => {
      const userDir = path.join(collectionsBaseDir, username);
      const profilePath = path.join(userDir, 'profile.json');

      if (fs.existsSync(profilePath)) {
        try {
          const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

          index.users.push({
            username: profile.username,
            displayName: profile.displayName,
            totalCollections: profile.stats.totalCollections,
            totalCommands: profile.stats.totalCommands,
            badges: profile.badges.length,
            joinedAt: profile.joinedAt
          });

          index.totalCollections += profile.stats.totalCollections;
          index.totalCommands += profile.stats.totalCommands;

          // Add recent collections
          profile.collections.forEach(collection => {
            index.recentCollections.push({
              ...collection,
              username: profile.username,
              displayName: profile.displayName
            });

            // Count categories and tags
            index.categories[collection.category] = (index.categories[collection.category] || 0) + 1;
            (collection.tags || []).forEach(tag => {
              index.tags[tag] = (index.tags[tag] || 0) + 1;
            });
          });
        } catch (error) {
          console.warn(`Failed to process profile for user ${username}:`, error.message);
        }
      }
    });

    index.totalUsers = index.users.length;

    // Sort recent collections by submission date
    index.recentCollections.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    index.recentCollections = index.recentCollections.slice(0, 20); // Keep only 20 most recent

    // Save index
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
  }
}

// CLI usage
if (require.main === module) {
  const issueDataPath = process.argv[2];
  const collectionsBaseDir = process.argv[3] || './collections';

  if (!issueDataPath) {
    console.error('Usage: node organize-collection.js <issue-data.json> [collections-dir]');
    process.exit(1);
  }

  try {
    const organizer = new CollectionOrganizer();
    const result = organizer.organizeCollection(issueDataPath, collectionsBaseDir);

    // Output JSON for workflow consumption
    console.log(JSON.stringify(result, null, 2));

    // Log summary to stderr for human readability
    console.error('\n📁 Collection Organization Complete:');
    console.error(`Username: ${result.username}`);
    console.error(`Collection: ${result.collectionPath}`);
    console.error(`Commands: ${result.totalCommands} files created`);
    console.error(`Collection ID: ${result.collectionId}`);

  } catch (error) {
    console.error('❌ Collection organization failed:', error.message);
    process.exit(1);
  }
}

module.exports = CollectionOrganizer;
