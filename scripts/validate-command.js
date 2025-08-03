/**
 * Command Validation Script
 * Validates JavaScript commands for security and quality
 */

const fs = require('fs');
const path = require('path');

class CommandValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.securityPatterns = [
      // Dangerous function patterns
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /setTimeout\s*\(\s*["'`][^"'`]*["'`]/gi,
      /setInterval\s*\(\s*["'`][^"'`]*["'`]/gi,

      // External requests
      /fetch\s*\(/gi,
      /XMLHttpRequest/gi,
      /\.ajax\s*\(/gi,

      // DOM manipulation (outside Dynamics 365)
      /document\./gi,
      /window\./gi,
      /localStorage/gi,
      /sessionStorage/gi,

      // Sensitive data patterns
      /password\s*[:=]/gi,
      /token\s*[:=]/gi,
      /secret\s*[:=]/gi,
      /key\s*[:=]/gi,

      // Hardcoded URLs
      /https?:\/\/[a-zA-Z0-9.-]+\.(dynamics|microsoft|office365)/gi
    ];

    this.requiredPatterns = [
      // Error handling
      /try\s*{[\s\S]*catch\s*\(/gi,

      // User feedback
      /(openAlertDialog|openErrorDialog|setFormNotification)/gi
    ];
  }

  validateCommand(filePath) {
    this.errors = [];
    this.warnings = [];

    if (!fs.existsSync(filePath)) {
      this.errors.push('File does not exist');
      return this.getResult();
    }

    const content = fs.readFileSync(filePath, 'utf8');

    // Basic validations
    this.validateSyntax(content);
    this.validateSecurity(content);
    this.validateQuality(content);
    this.validateDocumentation(content);

    return this.getResult();
  }

  validateSyntax(content) {
    try {
      // Basic syntax check (not perfect but catches obvious issues)
      new Function(content);
    } catch (error) {
      this.errors.push(`Syntax error: ${error.message}`);
    }
  }

  validateSecurity(content) {
    // Check for dangerous patterns
    this.securityPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        this.errors.push(`Security issue: Found potentially dangerous pattern "${matches[0]}"`);
      }
    });

    // Check for hardcoded values that might be sensitive
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      // Look for assignment patterns with suspicious values
      if (line.match(/=\s*["'`][^"'`]*\.(com|net|org|dynamics|microsoft)/gi)) {
        this.warnings.push(`Line ${index + 1}: Possible hardcoded URL or domain`);
      }

      if (line.match(/=\s*["'`][A-Za-z0-9+/]{20,}={0,2}["'`]/gi)) {
        this.warnings.push(`Line ${index + 1}: Possible encoded data or token`);
      }
    });
  }

  validateQuality(content) {
    // Check for best practices
    if (!content.includes('use strict')) {
      this.warnings.push('Missing "use strict" directive');
    }

    if (
      !content.match(/\(function\s*\(\s*\)\s*{[\s\S]*}\)\(\s*\);?/gi) &&
      !content.match(/\(async\s+function\s*\(\s*\)\s*{[\s\S]*}\)\(\s*\);?/gi)
    ) {
      this.warnings.push(
        'Command should be wrapped in IIFE (Immediately Invoked Function Expression)'
      );
    }

    // Check for error handling
    if (!content.includes('try') || !content.includes('catch')) {
      this.warnings.push('Missing error handling (try/catch blocks)');
    }

    // Check for user feedback
    if (!content.match(/(openAlertDialog|openErrorDialog|setFormNotification)/gi)) {
      this.warnings.push('No user feedback mechanisms found');
    }

    // Check for console.log in production
    if (content.includes('console.log')) {
      this.warnings.push('Remove console.log statements for production');
    }
  }

  validateDocumentation(content) {
    const lines = content.split('\n');
    const firstLines = lines.slice(0, 10);

    // Check for required comment headers
    const hasCommandName = firstLines.some(line => line.includes('Command Name:'));
    const hasDescription = firstLines.some(line => line.includes('Description:'));
    const hasCategory = firstLines.some(line => line.includes('Category:'));
    const hasAuthor = firstLines.some(line => line.includes('Author:'));

    if (!hasCommandName) {
      this.warnings.push('Missing "Command Name:" in header comments');
    }
    if (!hasDescription) {
      this.warnings.push('Missing "Description:" in header comments');
    }
    if (!hasCategory) {
      this.warnings.push('Missing "Category:" in header comments');
    }
    if (!hasAuthor) {
      this.warnings.push('Missing "Author:" in header comments');
    }

    // Check for inline comments
    const codeLines = lines.filter(
      line =>
        line.trim() &&
        !line.trim().startsWith('//') &&
        !line.trim().startsWith('/*') &&
        !line.trim().startsWith('*')
    );

    const commentLines = lines.filter(
      line => line.includes('//') || line.includes('/*') || line.includes('*/')
    );

    if (codeLines.length > 20 && commentLines.length < codeLines.length * 0.1) {
      this.warnings.push('Consider adding more inline comments for complex code');
    }
  }

  getResult() {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      score: this.calculateScore()
    };
  }

  calculateScore() {
    let score = 100;
    score -= this.errors.length * 20;
    score -= this.warnings.length * 5;
    return Math.max(0, score);
  }
}

// CLI usage
if (require.main === module) {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Usage: node validate-command.js <path-to-command.js>');
    process.exit(1);
  }

  const validator = new CommandValidator();
  const result = validator.validateCommand(filePath);

  console.log(`\n📋 Validation Results for: ${path.basename(filePath)}`);
  console.log(`Score: ${result.score}/100`);

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(error => console.log(`  • ${error}`));
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(warning => console.log(`  • ${warning}`));
  }

  if (result.valid && result.warnings.length === 0) {
    console.log('\n✅ Command validation passed!');
  }

  process.exit(result.valid ? 0 : 1);
}

module.exports = CommandValidator;
