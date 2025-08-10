/**
 * Collection Issue Parser
 * Parses GitHub Issues created from the share-command-collection.yml template
 */

const fs = require('fs');

class CollectionIssueParser {
  constructor() {
    this.supportedCategories = [
      'Form Actions',
      'Navigation',
      'Data Management',
      'UI Enhancement',
      'Development Tools',
      'Workflow Automation',
      'Reporting & Analytics',
      'User Management',
      'Business Process',
      'Other'
    ];
  }

  /**
   * Parse GitHub Issue data from collection submission
   * @param {Object} issueData - GitHub Issue data
   * @returns {Object} Parsed collection data
   */
  parseIssue(issueData) {
    const body = issueData.body || '';

    const collection = {
      metadata: this.extractMetadata(issueData, body),
      commands: this.extractCommands(body),
      documentation: this.extractDocumentation(body),
      validation: this.validateCollection(issueData, body),
      contactInfo: this.extractContactInfo(body),
      issueInfo: {
        number: issueData.number,
        url: issueData.html_url,
        submittedAt: issueData.created_at,
        submittedBy: issueData.user?.login
      }
    };

    return collection;
  }

  extractMetadata(issueData, body) {
    return {
      name: this.extractField(body, 'collection-name') || this.extractTitleCollection(issueData.title),
      description: this.extractField(body, 'description'),
      category: this.normalizeCategory(this.extractField(body, 'category')),
      tags: this.extractTags(body),
      commandCount: parseInt(this.extractField(body, 'command-count')) || 0,
      dynamicsVersion: this.extractField(body, 'dynamics-version') || 'All versions',
      author: this.extractField(body, 'author-attribution') || issueData.user?.login,
      submittedBy: issueData.user?.login,
      submittedAt: issueData.created_at
    };
  }

  extractCommands(body) {
    const commandsJsonField = this.extractField(body, 'commands-json');

    if (!commandsJsonField) {
      return [];
    }

    try {
      const commandsData = JSON.parse(commandsJsonField);

      // Handle different JSON structures
      if (commandsData.commands && Array.isArray(commandsData.commands)) {
        return commandsData.commands;
      } else if (Array.isArray(commandsData)) {
        return commandsData;
      } else {
        throw new Error('Invalid commands JSON structure');
      }
    } catch (error) {
      console.error('Failed to parse commands JSON:', error.message);
      return [];
    }
  }

  extractDocumentation(body) {
    return {
      description: this.extractField(body, 'description'),
      usageInstructions: this.extractUsageInstructions(body),
      prerequisites: this.extractPrerequisites(body),
      limitations: this.extractLimitations(body)
    };
  }

  extractContactInfo(body) {
    const contactInfo = this.extractField(body, 'contact-info');

    // Clean up the contact info to extract just the username
    if (contactInfo) {
      // Remove any @ symbols and whitespace
      return contactInfo.replace(/[@\s]/g, '').toLowerCase();
    }

    return '';
  }

  extractField(body, fieldId) {
    // Look for GitHub Issue form field pattern
    const patterns = [
      new RegExp(`### ${fieldId}\\s*\\n\\s*([\\s\\S]*?)(?=\\n### |\\n##|$)`, 'i'),
      new RegExp(`### ${fieldId.replace('-', ' ')}\\s*\\n\\s*([\\s\\S]*?)(?=\\n### |\\n##|$)`, 'i'),
      new RegExp(`\\*\\*${fieldId}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*|\\n##|$)`, 'i')
    ];

    for (const pattern of patterns) {
      const match = body.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return '';
  }

  extractTitleCollection(title) {
    // Extract collection name from title like "[COLLECTION] Collection Name"
    const match = title.match(/\[COLLECTION\]\s*(.+)/i);
    return match ? match[1].trim() : title;
  }

  extractTags(body) {
    const tagsField = this.extractField(body, 'tags');
    if (!tagsField) return [];

    return tagsField
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }

  normalizeCategory(category) {
    if (!category) return 'Other';

    // Find the best match from supported categories
    const normalized = category.toLowerCase();

    const match = this.supportedCategories.find(cat =>
      cat.toLowerCase() === normalized
    );

    return match || 'Other';
  }

  extractUsageInstructions(body) {
    const patterns = [
      /usage\s*instructions?:?\s*([\s\S]*?)(?=\n\n|\n###|$)/gi,
      /how\s*to\s*use:?\s*([\s\S]*?)(?=\n\n|\n###|$)/gi,
      /instructions?:?\s*([\s\S]*?)(?=\n\n|\n###|$)/gi
    ];

    for (const pattern of patterns) {
      const match = body.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return '';
  }

  extractPrerequisites(body) {
    const patterns = [
      /prerequisites?:?\s*([\s\S]*?)(?=\n\n|\n###|$)/gi,
      /requirements?:?\s*([\s\S]*?)(?=\n\n|\n###|$)/gi,
      /setup:?\s*([\s\S]*?)(?=\n\n|\n###|$)/gi
    ];

    for (const pattern of patterns) {
      const match = body.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return '';
  }

  extractLimitations(body) {
    const patterns = [
      /limitations?:?\s*([\s\S]*?)(?=\n\n|\n###|$)/gi,
      /known\s*issues?:?\s*([\s\S]*?)(?=\n\n|\n###|$)/gi,
      /caveats?:?\s*([\s\S]*?)(?=\n\n|\n###|$)/gi
    ];

    for (const pattern of patterns) {
      const match = body.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return '';
  }

  validateCollection(issueData, body) {
    const errors = [];
    const warnings = [];

    const metadata = this.extractMetadata(issueData, body);
    const commands = this.extractCommands(body);
    const contactInfo = this.extractContactInfo(body);

    // Required field validation
    if (!metadata.name) {
      errors.push('Collection name is required');
    }

    if (!metadata.description) {
      errors.push('Collection description is required');
    }

    if (!contactInfo) {
      errors.push('Contact information (GitHub username) is required');
    }

    if (!commands || commands.length === 0) {
      errors.push('Commands JSON is required and must contain at least one command');
    }

    // Commands validation
    if (commands && commands.length > 0) {
      commands.forEach((command, index) => {
        if (!command.name) {
          errors.push(`Command ${index + 1} is missing a name`);
        }

        if (!command.code) {
          errors.push(`Command ${index + 1} is missing JavaScript code`);
        }

        // Basic security checks
        if (command.code) {
          if (command.code.match(/eval\s*\(/gi)) {
            errors.push(`Command ${index + 1} contains dangerous eval() function`);
          }

          if (command.code.match(/https?:\/\/[a-zA-Z0-9.-]+/gi)) {
            warnings.push(`Command ${index + 1} contains hardcoded URLs`);
          }
        }
      });

      // Check command count matches
      if (metadata.commandCount && metadata.commandCount !== commands.length) {
        warnings.push(`Declared command count (${metadata.commandCount}) doesn't match actual count (${commands.length})`);
      }
    }

    // Check safety checklist (if available)
    const hasChecklist = body.includes('- [x]') || body.includes('- [X]');
    if (!hasChecklist) {
      warnings.push('Safety checklist not completed');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: this.calculateValidationScore(errors.length, warnings.length, commands.length)
    };
  }

  calculateValidationScore(errorCount, warningCount, commandCount) {
    let score = 100;
    score -= errorCount * 25;
    score -= warningCount * 10;

    // Bonus for having multiple commands
    if (commandCount >= 3) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate collection summary for display
   * @param {Object} collection - Parsed collection data
   * @returns {string} Formatted summary
   */
  generateSummary(collection) {
    return `
Collection: ${collection.metadata.name}
Author: ${collection.metadata.author}
Category: ${collection.metadata.category}
Commands: ${collection.commands.length}
Validation Score: ${collection.validation.score}/100
Contact: ${collection.contactInfo}
    `.trim();
  }
}

// CLI usage
if (require.main === module) {
  const issueJson = process.argv[2];
  
  // Handle input from either command line argument or stdin
  const getInput = () => {
    if (issueJson) {
      return Promise.resolve(issueJson);
    } else {
      // Read from stdin
      return new Promise((resolve, reject) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        
        process.stdin.on('data', (chunk) => {
          data += chunk;
        });
        
        process.stdin.on('end', () => {
          resolve(data.trim());
        });
        
        process.stdin.on('error', reject);
        
        // Set a timeout in case stdin is not available
        setTimeout(() => {
          if (!data) {
            reject(new Error('No input provided via argument or stdin'));
          }
        }, 1000);
      });
    }
  };

  getInput()
    .then(input => {
      if (!input) {
        throw new Error('No issue JSON provided');
      }

      const issueData = JSON.parse(input);
      const parser = new CollectionIssueParser();
      const collection = parser.parseIssue(issueData);

      // Output as JSON for workflow consumption
      console.log(JSON.stringify(collection, null, 2));

      // Log summary to stderr for human readability
      console.error('\n📦 Collection Parsed:');
      console.error(parser.generateSummary(collection));

      if (collection.validation.errors.length > 0) {
        console.error('\n❌ Validation Errors:');
        collection.validation.errors.forEach(error => console.error(`  • ${error}`));
      }

      if (collection.validation.warnings.length > 0) {
        console.error('\n⚠️  Validation Warnings:');
        collection.validation.warnings.forEach(warning => console.error(`  • ${warning}`));
      }
    })
    .catch(error => {
      console.error('Error parsing issue:', error.message);
      console.error('Usage: node parse-collection-issue.js <issue-json>');
      console.error('   OR: echo "<issue-json>" | node parse-collection-issue.js');
      process.exit(1);
    });
}

module.exports = CollectionIssueParser;
