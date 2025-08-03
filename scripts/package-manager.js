/**
 * Package Manager for Level Up Community Commands
 * Manages command collections and exports
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class PackageManager {
  constructor() {
    this.packageVersion = '1.0.0';
    this.supportedFormats = ['levelup', 'json', 'zip'];
  }

  /**
   * Create a command package from multiple commands
   * @param {Array} commands - Array of command objects
   * @param {Object} packageInfo - Package metadata
   * @returns {Object} Package object
   */
  createPackage(commands, packageInfo) {
    const pkg = {
      version: this.packageVersion,
      packageInfo: {
        name: packageInfo.name || 'Community Command Package',
        description: packageInfo.description || '',
        author: packageInfo.author || 'Community',
        category: packageInfo.category || 'mixed',
        tags: packageInfo.tags || [],
        createdAt: new Date().toISOString(),
        commandCount: commands.length,
        ...packageInfo
      },
      commands: commands.map(cmd => this.sanitizeCommand(cmd)),
      checksum: this.generateChecksum(commands)
    };

    return pkg;
  }

  /**
   * Sanitize command for packaging
   * @param {Object} command - Command object
   * @returns {Object} Sanitized command
   */
  sanitizeCommand(command) {
    return {
      id: this.generateCommandId(command),
      name: command.name || 'Unnamed Command',
      description: command.description || '',
      category: command.category || 'other',
      code: command.code || '',
      icon: command.icon || 'code',
      tags: command.tags || [],
      author: command.author || 'Unknown',
      dynamicsVersion: command.dynamicsVersion || 'All versions',
      documentation: {
        usageInstructions: command.usageInstructions || '',
        prerequisites: command.prerequisites || '',
        limitations: command.limitations || ''
      },
      metadata: {
        submittedAt: command.submittedAt || new Date().toISOString(),
        validated: command.validated || false,
        validationScore: command.validationScore || 0
      }
    };
  }

  /**
   * Generate unique ID for command
   * @param {Object} command - Command object
   * @returns {string} Command ID
   */
  generateCommandId(command) {
    const content = command.name + command.code + command.author;
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
  }

  /**
   * Generate package checksum
   * @param {Array} commands - Array of commands
   * @returns {string} Checksum
   */
  generateChecksum(commands) {
    const content = JSON.stringify(commands, null, 0);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Export package to file
   * @param {Object} pkg - Package object
   * @param {string} filePath - Output file path
   * @param {string} format - Export format ('levelup', 'json')
   * @returns {string} File path
   */
  exportPackage(pkg, filePath, format = 'levelup') {
    let content;
    let finalPath = filePath;

    switch (format.toLowerCase()) {
      case 'levelup':
        content = this.formatForLevelUp(pkg);
        finalPath = filePath.endsWith('.json') ? filePath : filePath + '.json';
        break;

      case 'json':
        content = JSON.stringify(pkg, null, 2);
        finalPath = filePath.endsWith('.json') ? filePath : filePath + '.json';
        break;

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    // Ensure directory exists
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(finalPath, content, 'utf8');
    return finalPath;
  }

  /**
   * Format package for Level Up extension
   * @param {Object} pkg - Package object
   * @returns {string} Formatted JSON
   */
  formatForLevelUp(pkg) {
    const levelUpFormat = {
      version: pkg.version,
      exportedAt: Date.now(),
      packageInfo: pkg.packageInfo,
      commands: pkg.commands.map(cmd => ({
        name: cmd.name,
        description: cmd.description,
        code: cmd.code,
        icon: cmd.icon,
        category: cmd.category,
        tags: cmd.tags,
        author: cmd.author,
        dynamicsVersion: cmd.dynamicsVersion
      })),
      checksum: pkg.checksum
    };

    return JSON.stringify(levelUpFormat, null, 2);
  }

  /**
   * Import package from file
   * @param {string} filePath - Package file path
   * @returns {Object} Package object
   */
  importPackage(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Package file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');

    try {
      const pkg = JSON.parse(content);

      // Validate package structure
      this.validatePackage(pkg);

      return pkg;
    } catch (error) {
      throw new Error(`Invalid package file: ${error.message}`);
    }
  }

  /**
   * Validate package structure
   * @param {Object} pkg - Package object
   * @throws {Error} If package is invalid
   */
  validatePackage(pkg) {
    if (!pkg.version) {
      throw new Error('Package missing version');
    }

    if (!pkg.commands || !Array.isArray(pkg.commands)) {
      throw new Error('Package missing commands array');
    }

    if (pkg.commands.length === 0) {
      throw new Error('Package contains no commands');
    }

    // Validate each command
    pkg.commands.forEach((cmd, index) => {
      if (!cmd.name) {
        throw new Error(`Command ${index + 1} missing name`);
      }

      if (!cmd.code) {
        throw new Error(`Command ${index + 1} missing code`);
      }
    });

    // Validate checksum if present
    if (pkg.checksum) {
      const calculatedChecksum = this.generateChecksum(pkg.commands);
      if (calculatedChecksum !== pkg.checksum) {
        throw new Error('Package checksum mismatch - data may be corrupted');
      }
    }
  }

  /**
   * Create collection from GitHub Issues
   * @param {Array} issues - Array of GitHub issues
   * @param {Object} collectionInfo - Collection metadata
   * @returns {Object} Package object
   */
  createCollectionFromIssues(issues, collectionInfo) {
    const IssueToCommandConverter = require('./issue-to-command');
    const converter = new IssueToCommandConverter();

    const commands = issues
      .filter(issue => issue.labels.some(label => label.name === 'community-command'))
      .map(issue => {
        const command = converter.convertIssue(issue);
        return {
          name: command.metadata.name,
          description: command.metadata.description,
          category: command.metadata.category,
          code: command.code,
          icon: command.metadata.icon,
          tags: command.metadata.tags,
          author: command.metadata.author,
          dynamicsVersion: command.metadata.dynamicsVersion,
          usageInstructions: command.documentation.usageInstructions,
          prerequisites: command.documentation.prerequisites,
          limitations: command.documentation.limitations,
          submittedAt: command.metadata.submittedAt,
          validated: command.validation.valid,
          validationScore: command.validation.score
        };
      })
      .filter(cmd => cmd.code); // Only include commands with code

    return this.createPackage(commands, collectionInfo);
  }

  /**
   * Generate collection statistics
   * @param {Object} pkg - Package object
   * @returns {Object} Statistics
   */
  generateStats(pkg) {
    const commands = pkg.commands || [];

    const categoryStats = {};
    const authorStats = {};
    const tagStats = {};

    let totalValidationScore = 0;
    let validatedCommands = 0;

    commands.forEach(cmd => {
      // Category stats
      categoryStats[cmd.category] = (categoryStats[cmd.category] || 0) + 1;

      // Author stats
      authorStats[cmd.author] = (authorStats[cmd.author] || 0) + 1;

      // Tag stats
      if (cmd.tags) {
        cmd.tags.forEach(tag => {
          tagStats[tag] = (tagStats[tag] || 0) + 1;
        });
      }

      // Validation stats
      if (cmd.metadata && cmd.metadata.validationScore) {
        totalValidationScore += cmd.metadata.validationScore;
        validatedCommands++;
      }
    });

    return {
      totalCommands: commands.length,
      categories: categoryStats,
      authors: authorStats,
      tags: tagStats,
      averageValidationScore:
        validatedCommands > 0 ? Math.round(totalValidationScore / validatedCommands) : 0,
      validatedCommands,
      packageSize: JSON.stringify(pkg).length,
      createdAt: pkg.packageInfo?.createdAt || new Date().toISOString()
    };
  }
}

// CLI usage
if (require.main === module) {
  const command = process.argv[2];
  const packageManager = new PackageManager();

  switch (command) {
    case 'create':
      createPackageFromCommands();
      break;

    case 'export':
      exportExistingPackage();
      break;

    case 'import':
      importPackageFile();
      break;

    case 'stats':
      showPackageStats();
      break;

    default:
      showUsage();
  }

  function createPackageFromCommands() {
    const commandsDir = process.argv[3] || './commands';
    const outputFile = process.argv[4] || './package.json';

    if (!fs.existsSync(commandsDir)) {
      console.error(`Commands directory not found: ${commandsDir}`);
      process.exit(1);
    }

    console.log('📦 Creating package from commands...');

    // Read all .js files from commands directory
    const commandFiles = fs
      .readdirSync(commandsDir)
      .filter(file => file.endsWith('.js'))
      .map(file => path.join(commandsDir, file));

    const commands = commandFiles.map(file => {
      const content = fs.readFileSync(file, 'utf8');

      // Extract metadata from comments
      const nameMatch = content.match(/\/\/\s*Command Name:\s*(.+)/i);
      const descMatch = content.match(/\/\/\s*Description:\s*(.+)/i);
      const categoryMatch = content.match(/\/\/\s*Category:\s*(.+)/i);
      const authorMatch = content.match(/\/\/\s*Author:\s*(.+)/i);

      return {
        name: nameMatch ? nameMatch[1].trim() : path.basename(file, '.js'),
        description: descMatch ? descMatch[1].trim() : '',
        category: categoryMatch ? categoryMatch[1].trim() : 'other',
        author: authorMatch ? authorMatch[1].trim() : 'Unknown',
        code: content,
        tags: [],
        icon: 'code'
      };
    });

    const packageInfo = {
      name: 'Community Commands Package',
      description: 'Collection of Level Up community commands',
      author: 'Level Up Community',
      category: 'mixed'
    };

    const pkg = packageManager.createPackage(commands, packageInfo);
    const filePath = packageManager.exportPackage(pkg, outputFile, 'levelup');

    console.log(`✅ Package created: ${filePath}`);
    console.log(`Commands: ${commands.length}`);
  }

  function exportExistingPackage() {
    const inputFile = process.argv[3];
    const outputFile = process.argv[4];
    const format = process.argv[5] || 'levelup';

    if (!inputFile || !outputFile) {
      console.error('Usage: node package-manager.js export <input-file> <output-file> [format]');
      process.exit(1);
    }

    const pkg = packageManager.importPackage(inputFile);
    const filePath = packageManager.exportPackage(pkg, outputFile, format);

    console.log(`✅ Package exported: ${filePath}`);
  }

  function importPackageFile() {
    const inputFile = process.argv[3];

    if (!inputFile) {
      console.error('Usage: node package-manager.js import <package-file>');
      process.exit(1);
    }

    try {
      const pkg = packageManager.importPackage(inputFile);
      console.log('✅ Package imported successfully');
      console.log(`Commands: ${pkg.commands.length}`);
      console.log(`Package: ${pkg.packageInfo.name}`);
    } catch (error) {
      console.error('❌ Import failed:', error.message);
      process.exit(1);
    }
  }

  function showPackageStats() {
    const inputFile = process.argv[3];

    if (!inputFile) {
      console.error('Usage: node package-manager.js stats <package-file>');
      process.exit(1);
    }

    const pkg = packageManager.importPackage(inputFile);
    const stats = packageManager.generateStats(pkg);

    console.log('\n📊 Package Statistics');
    console.log(`Total Commands: ${stats.totalCommands}`);
    console.log(`Average Validation Score: ${stats.averageValidationScore}`);
    console.log(`Package Size: ${(stats.packageSize / 1024).toFixed(2)} KB`);

    console.log('\n📂 Categories:');
    Object.entries(stats.categories).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });

    console.log('\n👥 Authors:');
    Object.entries(stats.authors).forEach(([author, count]) => {
      console.log(`  ${author}: ${count}`);
    });

    if (Object.keys(stats.tags).length > 0) {
      console.log('\n🏷️  Popular Tags:');
      Object.entries(stats.tags)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .forEach(([tag, count]) => {
          console.log(`  ${tag}: ${count}`);
        });
    }
  }

  function showUsage() {
    console.log('Level Up Package Manager\n');
    console.log('Usage: node package-manager.js <command> [options]\n');
    console.log('Commands:');
    console.log('  create [commands-dir] [output-file]  Create package from command files');
    console.log('  export <input> <output> [format]     Export package in different format');
    console.log('  import <package-file>                Import and validate package');
    console.log('  stats <package-file>                 Show package statistics');
    console.log('\nFormats: levelup (default), json');
  }
}

module.exports = PackageManager;
