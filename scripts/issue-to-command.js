/**
 * Issue to Command Converter
 * Converts GitHub Issues to Level Up command format
 */

const fs = require('fs');
const path = require('path');

class IssueToCommandConverter {
  constructor() {
    this.supportedCategories = [
      'form-actions',
      'navigation',
      'data-management',
      'ui-enhancement',
      'development-tools',
      'workflow-automation',
      'reporting-analytics',
      'user-management',
      'other'
    ];
  }

  /**
   * Convert GitHub Issue data to Level Up command
   * @param {Object} issueData - GitHub Issue data
   * @returns {Object} Command object
   */
  convertIssue(issueData) {
    const command = {
      metadata: this.extractMetadata(issueData),
      code: this.extractCode(issueData),
      documentation: this.extractDocumentation(issueData),
      validation: this.validateCommand(issueData)
    };

    return command;
  }

  extractMetadata(issueData) {
    const body = issueData.body || '';

    return {
      name: this.extractField(body, 'command-name') || this.extractTitleCommand(issueData.title),
      description: this.extractField(body, 'description'),
      category: this.normalizeCategory(this.extractField(body, 'category')),
      tags: this.extractTags(body),
      author: this.extractField(body, 'author-attribution') || issueData.user?.login,
      dynamicsVersion: this.extractField(body, 'dynamics-version') || 'All versions',
      icon: this.extractField(body, 'icon'),
      submittedBy: issueData.user?.login,
      submittedAt: issueData.created_at,
      issueNumber: issueData.number,
      issueUrl: issueData.html_url
    };
  }

  extractCode(issueData) {
    const body = issueData.body || '';

    // Look for code in JavaScript code blocks
    const codeMatch = body.match(/```javascript\s*([\s\S]*?)\s*```/i);
    if (codeMatch) {
      return codeMatch[1].trim();
    }

    // Look for code in generic code blocks
    const genericCodeMatch = body.match(/```\s*([\s\S]*?)\s*```/);
    if (genericCodeMatch) {
      return genericCodeMatch[1].trim();
    }

    return '';
  }

  extractDocumentation(issueData) {
    const body = issueData.body || '';

    return {
      usageInstructions: this.extractField(body, 'usage-instructions'),
      testingNotes: this.extractField(body, 'testing-notes'),
      additionalContext: this.extractField(body, 'additional-context'),
      prerequisites: this.extractPrerequisites(body),
      limitations: this.extractLimitations(body)
    };
  }

  extractField(body, fieldId) {
    // Look for GitHub Issue form field pattern
    const pattern = new RegExp(`### ${fieldId}\\s*\\n\\s*([\\s\\S]*?)(?=\\n### |$)`, 'i');
    const match = body.match(pattern);
    return match ? match[1].trim() : '';
  }

  extractTitleCommand(title) {
    // Extract command name from title like "[COMMAND] Command Name"
    const match = title.match(/\[COMMAND\]\s*(.+)/i);
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
    if (!category) return 'other';

    const normalized = category
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    return this.supportedCategories.includes(normalized) ? normalized : 'other';
  }

  extractPrerequisites(body) {
    // Look for prerequisites in various formats
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
      /known issues?:?\s*([\s\S]*?)(?=\n\n|\n###|$)/gi,
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

  validateCommand(issueData) {
    const errors = [];
    const warnings = [];

    const metadata = this.extractMetadata(issueData);
    const code = this.extractCode(issueData);

    // Required field validation
    if (!metadata.name) {
      errors.push('Command name is required');
    }

    if (!metadata.description) {
      errors.push('Command description is required');
    }

    if (!code) {
      errors.push('JavaScript code is required');
    }

    // Code quality checks
    if (code) {
      if (!code.includes('try') || !code.includes('catch')) {
        warnings.push('Code should include error handling');
      }

      if (!code.match(/(openAlertDialog|openErrorDialog|setFormNotification)/gi)) {
        warnings.push('Code should provide user feedback');
      }

      // Basic security checks
      if (code.match(/eval\s*\(/gi)) {
        errors.push('Code contains dangerous eval() function');
      }

      if (code.match(/https?:\/\/[a-zA-Z0-9.-]+/gi)) {
        warnings.push('Code contains hardcoded URLs');
      }
    }

    // Check safety checklist (if available)
    const hasChecklist = issueData.body?.includes('- [x]') || issueData.body?.includes('- [X]');
    if (!hasChecklist) {
      warnings.push('Safety checklist not completed');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: this.calculateValidationScore(errors.length, warnings.length)
    };
  }

  calculateValidationScore(errorCount, warningCount) {
    let score = 100;
    score -= errorCount * 25;
    score -= warningCount * 10;
    return Math.max(0, score);
  }

  /**
   * Generate Level Up command file content
   * @param {Object} command - Command object
   * @returns {string} Formatted command code
   */
  generateCommandFile(command) {
    const { metadata, code, documentation } = command;

    let output = '';

    // Header comments
    output += `// Command Name: ${metadata.name}\n`;
    output += `// Description: ${metadata.description}\n`;
    output += `// Category: ${metadata.category}\n`;
    output += `// Author: ${metadata.author}\n`;
    if (metadata.dynamicsVersion) {
      output += `// Dynamics Version: ${metadata.dynamicsVersion}\n`;
    }
    if (metadata.tags && metadata.tags.length > 0) {
      output += `// Tags: ${metadata.tags.join(', ')}\n`;
    }
    if (metadata.icon) {
      output += `// Icon: ${metadata.icon}\n`;
    }

    output += `// Source: ${metadata.issueUrl}\n`;
    output += `// Submitted: ${new Date(metadata.submittedAt).toDateString()}\n`;
    output += '\n';

    // Documentation
    if (documentation.usageInstructions) {
      output += `/**\n`;
      output += ` * USAGE INSTRUCTIONS:\n`;
      output += ` * ${documentation.usageInstructions.replace(/\n/g, '\n * ')}\n`;
      output += ` */\n`;
    }

    if (documentation.prerequisites) {
      output += `/**\n`;
      output += ` * PREREQUISITES:\n`;
      output += ` * ${documentation.prerequisites.replace(/\n/g, '\n * ')}\n`;
      output += ` */\n`;
    }

    output += '\n';

    // Code
    output += code;

    return output;
  }

  /**
   * Save command to file
   * @param {Object} command - Command object
   * @param {string} outputDir - Output directory
   * @returns {string} File path
   */
  saveCommand(command, outputDir = './commands') {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = this.generateFileName(command.metadata);
    const filePath = path.join(outputDir, fileName);
    const content = this.generateCommandFile(command);

    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  generateFileName(metadata) {
    const safeName = metadata.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    return `${safeName}.js`;
  }
}

// CLI usage
if (require.main === module) {
  const issueFile = process.argv[2];
  const outputDir = process.argv[3] || './commands';

  if (!issueFile) {
    console.error('Usage: node issue-to-command.js <issue-data.json> [output-dir]');
    console.error('');
    console.error('The issue data should be a JSON file containing GitHub Issue data.');
    process.exit(1);
  }

  if (!fs.existsSync(issueFile)) {
    console.error(`Error: Issue file "${issueFile}" not found`);
    process.exit(1);
  }

  try {
    const issueData = JSON.parse(fs.readFileSync(issueFile, 'utf8'));
    const converter = new IssueToCommandConverter();

    console.log('🔄 Converting GitHub Issue to Level Up command...');

    const command = converter.convertIssue(issueData);

    console.log(`\n📋 Command: ${command.metadata.name}`);
    console.log(`Category: ${command.metadata.category}`);
    console.log(`Author: ${command.metadata.author}`);
    console.log(`Validation Score: ${command.validation.score}/100`);

    if (command.validation.errors.length > 0) {
      console.log('\n❌ Validation Errors:');
      command.validation.errors.forEach(error => console.log(`  • ${error}`));
    }

    if (command.validation.warnings.length > 0) {
      console.log('\n⚠️  Validation Warnings:');
      command.validation.warnings.forEach(warning => console.log(`  • ${warning}`));
    }

    if (command.validation.valid) {
      const filePath = converter.saveCommand(command, outputDir);
      console.log(`\n✅ Command saved to: ${filePath}`);
    } else {
      console.log('\n❌ Command has validation errors and was not saved');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error processing issue:', error.message);
    process.exit(1);
  }
}

module.exports = IssueToCommandConverter;
