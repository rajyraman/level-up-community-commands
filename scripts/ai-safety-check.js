/**
 * AI Safety Check - Simple Security Analysis
 * Performs basic security analysis on JavaScript commands
 */

const fs = require('fs');

class AISafetyChecker {
  constructor() {
    this.dangerousPatterns = [
      { pattern: /eval\s*\(/gi, severity: 'HIGH', description: 'Use of eval() function' },
      { pattern: /Function\s*\(/gi, severity: 'HIGH', description: 'Use of Function constructor' },
      { pattern: /document\.write/gi, severity: 'MEDIUM', description: 'Use of document.write' },
      { pattern: /innerHTML\s*=/gi, severity: 'MEDIUM', description: 'Direct innerHTML assignment' },
      { pattern: /\.exec\(/gi, severity: 'MEDIUM', description: 'Use of exec method' },
      { pattern: /new\s+ActiveXObject/gi, severity: 'HIGH', description: 'ActiveX object creation' },
      { pattern: /window\.open/gi, severity: 'LOW', description: 'Window.open usage' },
      { pattern: /alert\s*\(/gi, severity: 'LOW', description: 'Alert dialog usage' }
    ];

    this.suspiciousPatterns = [
      { pattern: /password/gi, severity: 'MEDIUM', description: 'References to passwords' },
      { pattern: /token/gi, severity: 'MEDIUM', description: 'References to tokens' },
      { pattern: /secret/gi, severity: 'MEDIUM', description: 'References to secrets' },
      { pattern: /api[_-]?key/gi, severity: 'MEDIUM', description: 'References to API keys' },
      { pattern: /http:\/\//gi, severity: 'LOW', description: 'Insecure HTTP URLs' },
      { pattern: /\.cookie/gi, severity: 'LOW', description: 'Cookie manipulation' }
    ];
  }

  /**
   * Analyze JavaScript code for security issues
   * @param {Object} issueData - Parsed issue data
   * @returns {Object} Safety analysis report
   */
  analyzeSafety(issueData) {
    const commands = issueData.commands || [];
    const issues = [];
    let totalScore = 100;
    let highestRisk = 'LOW';

    for (const command of commands) {
      if (!command.code) continue;

      const commandIssues = this.analyzeCommandCode(command.code, command.name);
      issues.push(...commandIssues);

      // Reduce score based on issues found
      for (const issue of commandIssues) {
        switch (issue.severity) {
          case 'HIGH':
            totalScore -= 25;
            highestRisk = 'HIGH';
            break;
          case 'MEDIUM':
            totalScore -= 15;
            if (highestRisk !== 'HIGH') highestRisk = 'MEDIUM';
            break;
          case 'LOW':
            totalScore -= 5;
            break;
        }
      }
    }

    // Ensure score doesn't go below 0
    totalScore = Math.max(0, totalScore);

    // Determine risk level
    let riskLevel = highestRisk;
    if (totalScore < 30) riskLevel = 'CRITICAL';
    else if (totalScore < 60) riskLevel = 'HIGH';
    else if (totalScore < 80) riskLevel = 'MEDIUM';
    else riskLevel = 'LOW';

    // Auto-approve if score is high and no high-severity issues
    const autoApprove = totalScore >= 75 && !issues.some(i => i.severity === 'HIGH' || i.severity === 'CRITICAL');

    return {
      safetyScore: totalScore,
      riskLevel,
      autoApprove,
      issues,
      summary: this.generateSummary(totalScore, issues.length, riskLevel),
      confidence: 85, // Static confidence for rule-based analysis
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Analyze a single command's code
   * @param {string} code - JavaScript code to analyze
   * @param {string} commandName - Name of the command
   * @returns {Array} Array of issues found
   */
  analyzeCommandCode(code, commandName) {
    const issues = [];

    // Check dangerous patterns
    for (const { pattern, severity, description } of this.dangerousPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        issues.push({
          severity,
          category: 'DANGEROUS_FUNCTION',
          description: `${description} found in command "${commandName}"`,
          recommendation: 'Review and replace with safer alternatives',
          commandName
        });
      }
    }

    // Check suspicious patterns
    for (const { pattern, severity, description } of this.suspiciousPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        issues.push({
          severity,
          category: 'SUSPICIOUS_PATTERN',
          description: `${description} found in command "${commandName}"`,
          recommendation: 'Ensure no sensitive data is hardcoded',
          commandName
        });
      }
    }

    // Check for very long strings (potential obfuscation)
    const longStrings = code.match(/"[^"]{200,}"|'[^']{200,}'/g);
    if (longStrings) {
      issues.push({
        severity: 'MEDIUM',
        category: 'OBFUSCATION',
        description: `Very long strings detected in command "${commandName}"`,
        recommendation: 'Review for potential code obfuscation',
        commandName
      });
    }

    return issues;
  }

  /**
   * Generate a summary of the analysis
   * @param {number} score - Safety score
   * @param {number} issueCount - Number of issues found
   * @param {string} riskLevel - Risk level
   * @returns {string} Summary text
   */
  generateSummary(score, issueCount, riskLevel) {
    if (score >= 90) {
      return `Excellent security score (${score}/100). No significant security concerns detected.`;
    } else if (score >= 75) {
      return `Good security score (${score}/100). ${issueCount} minor issue(s) found but generally safe.`;
    } else if (score >= 60) {
      return `Moderate security score (${score}/100). ${issueCount} issue(s) found that should be addressed.`;
    } else if (score >= 30) {
      return `Low security score (${score}/100). ${issueCount} significant issue(s) found requiring review.`;
    } else {
      return `Critical security score (${score}/100). ${issueCount} serious security issue(s) found.`;
    }
  }
}

// CLI usage
if (require.main === module) {
  const issueDataPath = process.argv[2];

  if (!issueDataPath) {
    console.error('Usage: node ai-safety-check.js <issue-data.json>');
    process.exit(1);
  }

  try {
    const issueData = JSON.parse(fs.readFileSync(issueDataPath, 'utf8'));
    const checker = new AISafetyChecker();
    const report = checker.analyzeSafety(issueData);

    // Output JSON for workflow consumption
    console.log(JSON.stringify(report, null, 2));

    // Log summary to stderr for human readability
    console.error('\n🛡️ Security Analysis Complete:');
    console.error(report.summary);

    if (report.issues.length > 0) {
      console.error('\n⚠️ Issues found:');
      report.issues.forEach(issue => {
        console.error(`  • [${issue.severity}] ${issue.description}`);
      });
    }

  } catch (error) {
    console.error('Error during safety analysis:', error.message);
    process.exit(1);
  }
}

module.exports = AISafetyChecker;