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
    const dynamicsVersion = this.extractField(body, 'Dynamics 365 Version');
    const author = this.extractField(body, 'Author Attribution (Optional)');
    
    return {
      name: this.extractField(body, 'Collection Name') || this.extractTitleCollection(issueData.title),
      description: this.extractField(body, 'Collection Description'),
      category: this.normalizeCategory(this.extractField(body, 'Primary Category')),
      tags: this.extractTags(body),
      commandCount: parseInt(this.extractField(body, 'Number of Commands')) || 0,
      dynamicsVersion: (dynamicsVersion && dynamicsVersion !== '_No response_') ? dynamicsVersion : 'All versions',
      author: (author && author !== '_No response_') ? author : issueData.user?.login,
      submittedBy: issueData.user?.login,
      submittedAt: issueData.created_at
    };
  }

  extractCommands(body) {
    // Try multiple field names for commands JSON
    const fieldNames = ['Commands JSON Export', 'commands-json', 'Commands JSON', 'JSON Export'];
    let commandsJsonField = '';
    
    for (const fieldName of fieldNames) {
      commandsJsonField = this.extractField(body, fieldName);
      if (commandsJsonField) break;
    }

    if (!commandsJsonField) {
      return [];
    }

    // Extract JSON from code blocks if present
    const jsonContent = this.extractJsonFromCodeBlock(commandsJsonField);

    try {
      const commandsData = JSON.parse(jsonContent);

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

  extractJsonFromCodeBlock(text) {
    // Remove markdown code block markers if present
    let jsonText = text.trim();
    
    // Remove ```json and ``` markers
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.substring(7);
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.substring(3);
    }
    
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.substring(0, jsonText.length - 3);
    }
    
    return jsonText.trim();
  }

  extractDocumentation(body) {
    return {
      description: this.extractField(body, 'Collection Description'),
      usageInstructions: this.extractUsageInstructions(body),
      prerequisites: this.extractPrerequisites(body),
      limitations: this.extractLimitations(body)
    };
  }

  extractContactInfo(body) {
    const contactInfo = this.extractField(body, 'GitHub Username (Required)') || 
                       this.extractField(body, 'contact-info');

    // Clean up the contact info to extract just the username
    if (contactInfo && contactInfo !== '_No response_') {
      // Remove any @ symbols and whitespace
      return contactInfo.replace(/[@\s]/g, '').toLowerCase();
    }

    return '';
  }

  extractField(body, fieldId) {
    // Parse GitHub Issue form fields using simple string operations
    const lines = body.split('\n');
    const fieldVariants = [
      `### ${fieldId}`,
      `### ${fieldId.replace('-', ' ')}`,
      `**${fieldId}:**`,
      `**${fieldId.replace('-', ' ')}:**`
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line matches any of our field headers
      const isFieldHeader = fieldVariants.some(variant => 
        line.toLowerCase().includes(variant.toLowerCase())
      );
      
      if (isFieldHeader) {
        // Collect content until we hit another field or end of text
        const content = [];
        let j = i + 1;
        
        while (j < lines.length) {
          const nextLine = lines[j].trim();
          
          // Stop if we hit another field header
          if (nextLine.startsWith('###') || 
              nextLine.startsWith('**') || 
              nextLine.startsWith('##')) {
            break;
          }
          
          content.push(lines[j]);
          j++;
        }
        
        return content.join('\n').trim();
      }
    }

    return '';
  }

  extractTitleCollection(title) {
    // Extract collection name from title like "[COLLECTION] Collection Name"
    const collectionPrefix = '[COLLECTION]';
    const lowerTitle = title.toLowerCase();
    const prefixIndex = lowerTitle.indexOf(collectionPrefix.toLowerCase());
    
    if (prefixIndex !== -1) {
      return title.substring(prefixIndex + collectionPrefix.length).trim();
    }
    
    return title;
  }

  extractTags(body) {
    const tagsField = this.extractField(body, 'Tags');
    if (!tagsField || tagsField === '_No response_') return [];

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
    const keywords = ['usage instructions', 'how to use', 'instructions'];
    return this.extractSectionByKeywords(body, keywords);
  }

  extractPrerequisites(body) {
    const keywords = ['prerequisites', 'requirements', 'setup'];
    return this.extractSectionByKeywords(body, keywords);
  }

  extractLimitations(body) {
    const keywords = ['limitations', 'known issues', 'caveats'];
    return this.extractSectionByKeywords(body, keywords);
  }

  extractSectionByKeywords(body, keywords) {
    const lines = body.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase().trim();
      
      // Check if this line contains any of our keywords followed by a colon
      const hasKeyword = keywords.some(keyword => {
        return line.includes(keyword.toLowerCase() + ':') || 
               line.includes(keyword.toLowerCase());
      });
      
      if (hasKeyword) {
        // Collect content until we hit another section or end
        const content = [];
        let j = i + 1;
        
        while (j < lines.length) {
          const nextLine = lines[j].trim();
          
          // Stop if we hit what looks like another section
          if (nextLine.length > 0 && 
              (nextLine.includes(':') && nextLine.length < 50) ||
              nextLine.startsWith('#')) {
            break;
          }
          
          if (nextLine.length > 0) {
            content.push(lines[j]);
          }
          j++;
        }
        
        return content.join('\n').trim();
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

        // Basic security checks using simple string operations
        if (command.code) {
          // Check for dangerous eval function
          if (command.code.toLowerCase().includes('eval(')) {
            errors.push(`Command ${index + 1} contains dangerous eval() function`);
          }

          // Check for hardcoded URLs
          const codeLines = command.code.toLowerCase().split('\n');
          const hasUrls = codeLines.some(line => 
            line.includes('http://') || line.includes('https://')
          );
          
          if (hasUrls) {
            warnings.push(`Command ${index + 1} contains hardcoded URLs`);
          }
        }
      });

      // Check command count matches
      if (metadata.commandCount && metadata.commandCount !== commands.length) {
        warnings.push(`Declared command count (${metadata.commandCount}) doesn't match actual count (${commands.length})`);
      }
    }

    // Check safety checklist completion using simple string search
    const checklistSection = this.extractField(body, 'Safety & Quality Checklist');
    const hasCompletedChecklist = checklistSection.includes('- [x]') || checklistSection.includes('- [X]');
    
    if (!hasCompletedChecklist) {
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
