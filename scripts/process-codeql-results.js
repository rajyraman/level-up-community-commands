/**
 * CodeQL Results Processor
 * Processes CodeQL analysis results and generates security reports
 */

const fs = require('fs');

class CodeQLResultsProcessor {
  constructor() {
    this.securitySeverities = {
      'error': 100,
      'warning': 50,
      'note': 10
    };

    this.ruleCategories = {
      'security': 100,
      'correctness': 30,
      'maintainability': 10,
      'performance': 5
    };
  }

  /**
   * Process CodeQL analysis results
   * @param {string} resultsPath - Path to CodeQL results JSON
   * @returns {Object} Security report
   */
  processResults(resultsPath) {
    if (!fs.existsSync(resultsPath)) {
      throw new Error(`CodeQL results file not found: ${resultsPath}`);
    }

    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

    const report = {
      securityScore: 100,
      riskLevel: 'LOW',
      summary: {
        totalIssues: 0,
        securityIssues: 0,
        errorCount: 0,
        warningCount: 0,
        noteCount: 0
      },
      issues: [],
      recommendations: [],
      processedAt: new Date().toISOString()
    };

    // Process CodeQL runs
    if (results.runs && Array.isArray(results.runs)) {
      results.runs.forEach(run => {
        this.processRun(run, report);
      });
    }

    // Calculate final security score
    report.securityScore = this.calculateSecurityScore(report);
    report.riskLevel = this.determineRiskLevel(report.securityScore);

    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);

    return report;
  }

  /**
   * Process a single CodeQL run
   * @param {Object} run - CodeQL run object
   * @param {Object} report - Report object to update
   */
  processRun(run, report) {
    if (!run.results || !Array.isArray(run.results)) {
      return;
    }

    run.results.forEach(result => {
      const issue = this.processResult(result, run);
      if (issue) {
        report.issues.push(issue);
        report.summary.totalIssues++;

        // Count by severity
        switch (issue.severity) {
          case 'error':
            report.summary.errorCount++;
            break;
          case 'warning':
            report.summary.warningCount++;
            break;
          case 'note':
            report.summary.noteCount++;
            break;
        }

        // Count security issues
        if (issue.category === 'security') {
          report.summary.securityIssues++;
        }
      }
    });
  }

  /**
   * Process a single CodeQL result
   * @param {Object} result - CodeQL result object
   * @param {Object} run - Parent run object
   * @returns {Object|null} Processed issue
   */
  processResult(result, run) {
    if (!result.ruleId || !result.message) {
      return null;
    }

    const rule = this.findRule(result.ruleId, run);

    return {
      ruleId: result.ruleId,
      ruleName: rule?.name || result.ruleId,
      message: result.message.text || result.message,
      severity: this.determineSeverity(result, rule),
      category: this.determineCategory(result, rule),
      locations: this.processLocations(result.locations || []),
      description: rule?.fullDescription?.text || rule?.shortDescription?.text || '',
      helpUri: rule?.helpUri || '',
      tags: rule?.properties?.tags || []
    };
  }

  /**
   * Find rule definition in CodeQL run
   * @param {string} ruleId - Rule identifier
   * @param {Object} run - CodeQL run object
   * @returns {Object|null} Rule definition
   */
  findRule(ruleId, run) {
    if (!run.tool?.driver?.rules) {
      return null;
    }

    return run.tool.driver.rules.find(rule => rule.id === ruleId);
  }

  /**
   * Determine issue severity
   * @param {Object} result - CodeQL result
   * @param {Object} rule - Rule definition
   * @returns {string} Severity level
   */
  determineSeverity(result, rule) {
    // Check result level first
    if (result.level) {
      return result.level;
    }

    // Check rule properties
    if (rule?.properties?.['problem.severity']) {
      return rule.properties['problem.severity'];
    }

    // Check rule tags for severity indicators
    if (rule?.properties?.tags) {
      const tags = rule.properties.tags;
      if (tags.includes('security') || tags.includes('vulnerability')) {
        return 'error';
      }
      if (tags.includes('correctness')) {
        return 'warning';
      }
    }

    return 'note';
  }

  /**
   * Determine issue category
   * @param {Object} result - CodeQL result
   * @param {Object} rule - Rule definition
   * @returns {string} Category
   */
  determineCategory(result, rule) {
    if (!rule?.properties?.tags) {
      return 'other';
    }

    const tags = rule.properties.tags;

    if (tags.includes('security') || tags.includes('vulnerability')) {
      return 'security';
    }
    if (tags.includes('correctness')) {
      return 'correctness';
    }
    if (tags.includes('maintainability')) {
      return 'maintainability';
    }
    if (tags.includes('performance')) {
      return 'performance';
    }

    return 'other';
  }

  /**
   * Process result locations
   * @param {Array} locations - Array of location objects
   * @returns {Array} Processed locations
   */
  processLocations(locations) {
    return locations.map(location => {
      const physicalLocation = location.physicalLocation;
      if (!physicalLocation) {
        return null;
      }

      return {
        file: physicalLocation.artifactLocation?.uri || 'unknown',
        startLine: physicalLocation.region?.startLine || 1,
        startColumn: physicalLocation.region?.startColumn || 1,
        endLine: physicalLocation.region?.endLine || 1,
        endColumn: physicalLocation.region?.endColumn || 1,
        snippet: physicalLocation.region?.snippet?.text || ''
      };
    }).filter(location => location !== null);
  }

  /**
   * Calculate overall security score
   * @param {Object} report - Security report
   * @returns {number} Security score (0-100)
   */
  calculateSecurityScore(report) {
    let score = 100;

    // Deduct points based on issues
    report.issues.forEach(issue => {
      let deduction = this.securitySeverities[issue.severity] || 10;

      // Apply category multiplier
      const categoryMultiplier = this.ruleCategories[issue.category] || 10;
      deduction = (deduction * categoryMultiplier) / 100;

      score -= deduction;
    });

    return Math.max(0, Math.round(score));
  }

  /**
   * Determine risk level based on security score
   * @param {number} securityScore - Security score
   * @returns {string} Risk level
   */
  determineRiskLevel(securityScore) {
    if (securityScore >= 90) return 'LOW';
    if (securityScore >= 70) return 'MEDIUM';
    if (securityScore >= 50) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Generate recommendations based on findings
   * @param {Object} report - Security report
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(report) {
    const recommendations = [];

    if (report.summary.securityIssues > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Security',
        message: `Found ${report.summary.securityIssues} security issue(s). Review and fix all security vulnerabilities before approval.`,
        action: 'Fix security issues'
      });
    }

    if (report.summary.errorCount > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Code Quality',
        message: `Found ${report.summary.errorCount} error-level issue(s). These must be fixed before deployment.`,
        action: 'Fix critical errors'
      });
    }

    if (report.summary.warningCount > 5) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Code Quality',
        message: `Found ${report.summary.warningCount} warnings. Consider addressing these to improve code quality.`,
        action: 'Review and fix warnings'
      });
    }

    if (report.securityScore < 80) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Overall Security',
        message: `Security score (${report.securityScore}) is below recommended threshold (80). Manual review required.`,
        action: 'Manual security review'
      });
    }

    return recommendations;
  }

  /**
   * Generate human-readable summary
   * @param {Object} report - Security report
   * @returns {string} Summary text
   */
  generateSummary(report) {
    return `
CodeQL Security Analysis Summary
================================

Security Score: ${report.securityScore}/100
Risk Level: ${report.riskLevel}

Issues Found:
- Total: ${report.summary.totalIssues}
- Security: ${report.summary.securityIssues}
- Errors: ${report.summary.errorCount}
- Warnings: ${report.summary.warningCount}
- Notes: ${report.summary.noteCount}

Recommendations: ${report.recommendations.length}
High Priority Actions: ${report.recommendations.filter(r => r.priority === 'HIGH').length}
    `.trim();
  }
}

// CLI usage
if (require.main === module) {
  const resultsPath = process.argv[2];

  if (!resultsPath) {
    console.error('Usage: node process-codeql-results.js <codeql-results.json>');
    process.exit(1);
  }

  try {
    const processor = new CodeQLResultsProcessor();
    const report = processor.processResults(resultsPath);

    // Output JSON for workflow consumption
    console.log(JSON.stringify(report, null, 2));

    // Log summary to stderr for human readability
    console.error('\n🛡️  CodeQL Analysis Complete:');
    console.error(processor.generateSummary(report));

    if (report.securityScore < 80) {
      console.error('\n⚠️  Security score below threshold - manual review required');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ CodeQL results processing failed:', error.message);
    process.exit(1);
  }
}

module.exports = CodeQLResultsProcessor;
