/**
 * Approval Score Calculator
 * Combines security analysis results to determine auto-approval eligibility
 */

const fs = require('fs');

class ApprovalScoreCalculator {
  constructor() {
    this.weights = {
      aiSafety: 0.6,      // AI safety check (60%)
      validation: 0.4     // Basic validation (40%)
    };

    this.thresholds = {
      autoApprove: 80,    // Minimum score for auto-approval
      manualReview: 60,   // Score below this requires manual review
      reject: 30          // Score below this is automatically rejected
    };
  }

  /**
   * Calculate overall approval score and recommendation
   * @param {string} issueDataPath - Path to parsed issue data
   * @param {string} aiSafetyReportPath - Path to AI safety report
   * @returns {Object} Approval report
   */
  calculateApprovalScore(issueDataPath, aiSafetyReportPath) {
    // Load all reports
    const issueData = this.loadJsonFile(issueDataPath);
    const aiSafetyReport = this.loadJsonFile(aiSafetyReportPath);

    const report = {
      overallScore: 0,
      autoApprove: false,
      recommendation: '',
      feedback: '',
      scores: {
        validation: issueData.validation?.score || 0,
        aiSafety: aiSafetyReport?.safetyScore || 0
      },
      details: {
        issues: [],
        warnings: [],
        recommendations: []
      },
      processedAt: new Date().toISOString()
    };

    // Calculate weighted overall score
    report.overallScore = this.calculateWeightedScore(report.scores);

    // Determine approval status
    this.determineApprovalStatus(report, issueData, securityReport, aiSafetyReport);

    // Generate feedback and recommendations
    this.generateFeedback(report, issueData, securityReport, aiSafetyReport);

    return report;
  }

  /**
   * Load JSON file safely
   * @param {string} filePath - Path to JSON file
   * @returns {Object|null} Parsed JSON or null if file doesn't exist
   */
  loadJsonFile(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
      return null;
    }

    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      console.error(`Failed to load ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Calculate weighted overall score
   * @param {Object} scores - Individual scores
   * @returns {number} Weighted overall score
   */
  calculateWeightedScore(scores) {
    const weightedScore =
      (scores.validation * this.weights.validation) +
      (scores.aiSafety * this.weights.aiSafety);

    return Math.round(weightedScore);
  }

  /**
   * Determine approval status based on scores and criteria
   * @param {Object} report - Report object to update
   * @param {Object} issueData - Issue data
   * @param {Object} securityReport - Security report
   * @param {Object} aiSafetyReport - AI safety report
   */
  determineApprovalStatus(report, issueData, securityReport, aiSafetyReport) {
    const { overallScore } = report;

    // Check for blocking conditions from either analysis
    const blockingConditions = [
      {
        condition: issueData?.validation?.errors?.length > 0,
        reason: 'Validation errors detected'
      },
      {
        condition: securityReport?.summary?.securityIssues > 0,
        reason: 'Security vulnerabilities detected by CodeQL'
      },
      {
        condition: aiSafetyReport?.issues?.some(issue => issue.severity === 'CRITICAL'),
        reason: 'Critical security issues detected by AI analysis'
      },
      {
        condition: securityReport?.riskLevel === 'CRITICAL',
        reason: 'Critical security risk level (CodeQL)'
      },
      {
        condition: aiSafetyReport?.riskLevel === 'CRITICAL',
        reason: 'Critical AI safety risk level'
      },
      {
        condition: overallScore < this.thresholds.reject,
        reason: `Overall score (${overallScore}) below rejection threshold (${this.thresholds.reject})`
      }
    ];

    // Check for any blocking conditions
    const blockingIssue = blockingConditions.find(condition => condition.condition);
    if (blockingIssue) {
      report.autoApprove = false;
      report.recommendation = 'REJECT';
      report.details.issues.push(blockingIssue.reason);
      return;
    }

    // Enhanced approval logic: AI-based validation with high confidence thresholds
    if (overallScore >= this.thresholds.autoApprove) {
      // Check if AI analysis strongly approves
      const aiPassed = aiSafetyReport?.safetyScore >= 75 && aiSafetyReport?.autoApprove === true;

      // Auto-approve if AI analysis passes with high confidence and no blocking issues
      if (aiPassed && this.hasNoBlockingIssues(aiSafetyReport)) {
        report.autoApprove = true;
        report.recommendation = 'AUTO_APPROVE';

        // Add confidence indicators
        report.details.recommendations.push({
          priority: 'INFO',
          message: 'Passed AI validation with high confidence'
        });
      } else {
        report.autoApprove = false;
        report.recommendation = 'MANUAL_REVIEW';
        report.details.issues.push('Score meets threshold but validation conditions not satisfied');
      }
    } else if (overallScore >= this.thresholds.manualReview) {
      report.autoApprove = false;
      report.recommendation = 'MANUAL_REVIEW';
    } else {
      report.autoApprove = false;
      report.recommendation = 'REJECT';
      report.details.issues.push(`Score (${overallScore}) below manual review threshold (${this.thresholds.manualReview})`);
    }
  }

  /**
   * Check if there are no blocking issues from AI analysis
   * @param {Object} aiSafetyReport - AI safety report
   * @returns {boolean} True if no blocking issues
   */
  hasNoBlockingIssues(aiSafetyReport) {
    const aiBlocking = aiSafetyReport?.issues?.some(issue =>
      ['CRITICAL', 'HIGH'].includes(issue.severity)
    );

    return !aiBlocking;
  }

  /**
   * Generate detailed feedback for the submission
   * @param {Object} report - Report object to update
   * @param {Object} issueData - Issue data
   * @param {Object} securityReport - Security report
   * @param {Object} aiSafetyReport - AI safety report
   */
  generateFeedback(report, issueData, securityReport, aiSafetyReport) {
    const feedback = [];

    // Validation feedback
    if (issueData?.validation) {
      if (issueData.validation.errors?.length > 0) {
        feedback.push(`**Validation Issues:**`);
        issueData.validation.errors.forEach(error => {
          feedback.push(`- ❌ ${error}`);
        });
      }

      if (issueData.validation.warnings?.length > 0) {
        feedback.push(`**Validation Warnings:**`);
        issueData.validation.warnings.forEach(warning => {
          feedback.push(`- ⚠️ ${warning}`);
        });
      }
    }

    // Security feedback
    if (securityReport) {
      if (securityReport.summary?.securityIssues > 0) {
        feedback.push(`**Security Issues (CodeQL):**`);
        feedback.push(`- Found ${securityReport.summary.securityIssues} security issue(s)`);
        feedback.push(`- Risk level: ${securityReport.riskLevel}`);

        if (securityReport.recommendations?.length > 0) {
          feedback.push(`**Security Recommendations:**`);
          securityReport.recommendations.forEach(rec => {
            feedback.push(`- ${rec.priority}: ${rec.message}`);
          });
        }
      }
    }

    // AI Safety feedback
    if (aiSafetyReport) {
      if (aiSafetyReport.issues?.length > 0) {
        feedback.push(`**AI Safety Analysis:**`);
        feedback.push(`- Safety Score: ${aiSafetyReport.safetyScore}/100`);
        feedback.push(`- Risk level: ${aiSafetyReport.riskLevel}`);
        feedback.push(`- Issues found: ${aiSafetyReport.issues.length}`);

        // Group issues by severity
        const criticalIssues = aiSafetyReport.issues.filter(issue => issue.severity === 'CRITICAL');
        const highIssues = aiSafetyReport.issues.filter(issue => issue.severity === 'HIGH');
        const mediumIssues = aiSafetyReport.issues.filter(issue => issue.severity === 'MEDIUM');

        if (criticalIssues.length > 0) {
          feedback.push(`**Critical Issues (${criticalIssues.length}):**`);
          criticalIssues.forEach(issue => {
            feedback.push(`- 🚨 ${issue.category}: ${issue.description}`);
            if (issue.recommendation) {
              feedback.push(`  - Recommendation: ${issue.recommendation}`);
            }
          });
        }

        if (highIssues.length > 0) {
          feedback.push(`**High Priority Issues (${highIssues.length}):**`);
          highIssues.forEach(issue => {
            feedback.push(`- ⚠️ ${issue.category}: ${issue.description}`);
            if (issue.recommendation) {
              feedback.push(`  - Recommendation: ${issue.recommendation}`);
            }
          });
        }

        if (mediumIssues.length > 0) {
          feedback.push(`**Medium Priority Issues (${mediumIssues.length}):**`);
          mediumIssues.forEach(issue => {
            feedback.push(`- ⚡ ${issue.category}: ${issue.description}`);
          });
        }
      } else {
        feedback.push(`**AI Safety Analysis:**`);
        feedback.push(`- ✅ No security issues detected`);
        feedback.push(`- Safety Score: ${aiSafetyReport.safetyScore}/100`);
        feedback.push(`- Risk level: ${aiSafetyReport.riskLevel}`);
      }

      // Include AI summary
      if (aiSafetyReport.summary) {
        feedback.push(`**AI Analysis Summary:**`);
        feedback.push(`- ${aiSafetyReport.summary}`);
      }
    }

    // General recommendations
    feedback.push(`**Improvement Suggestions:**`);

    if (report.scores.validation < 90) {
      feedback.push(`- Improve code documentation and follow best practices`);
    }

    if (report.scores.security < 90) {
      feedback.push(`- Address security concerns identified by CodeQL analysis`);
    }

    if (report.scores.aiSafety < 90) {
      feedback.push(`- Review and fix security patterns identified by AI analysis`);
    }

    if (report.autoApprove) {
      feedback.unshift(`✅ **Collection approved for automatic processing!**\n`);
    } else {
      feedback.unshift(`⚠️ **Collection requires manual review before approval.**\n`);
    }

    report.feedback = feedback.join('\n');

    // Generate recommendations
    this.generateRecommendations(report, issueData, securityReport, aiSafetyReport);
  }

  /**
   * Generate actionable recommendations
   * @param {Object} report - Report object to update
   * @param {Object} issueData - Issue data
   * @param {Object} securityReport - Security report
   * @param {Object} aiSafetyReport - AI safety report
   */
  generateRecommendations(report, issueData, securityReport, aiSafetyReport) {
    const recommendations = [];

    // Based on approval recommendation
    switch (report.recommendation) {
      case 'AUTO_APPROVE':
        recommendations.push({
          priority: 'INFO',
          action: 'Collection will be automatically processed and published',
          description: 'All security and quality checks passed'
        });
        break;

      case 'MANUAL_REVIEW':
        recommendations.push({
          priority: 'HIGH',
          action: 'Schedule manual review with maintainer',
          description: 'Collection meets basic requirements but needs human verification'
        });
        break;

      case 'REJECT':
        recommendations.push({
          priority: 'CRITICAL',
          action: 'Address critical issues before resubmission',
          description: 'Collection has significant issues that must be resolved'
        });
        break;
    }

    // Specific recommendations based on scores
    if (report.scores.validation < 80) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Improve code quality and documentation',
        description: 'Add missing documentation, follow naming conventions, and improve code structure'
      });
    }

    if (report.scores.security < 80) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Address security vulnerabilities',
        description: 'Fix security issues identified by static analysis tools'
      });
    }

    if (report.scores.aiSafety < 80) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Review and fix security patterns',
        description: 'Address potentially dangerous code patterns identified by AI analysis'
      });
    }

    report.details.recommendations = recommendations;
  }

  /**
   * Generate human-readable summary
   * @param {Object} report - Approval report
   * @returns {string} Summary text
   */
  generateSummary(report) {
    return `
Approval Score Calculation Summary
==================================

Overall Score: ${report.overallScore}/100
Recommendation: ${report.recommendation}
Auto-approve: ${report.autoApprove ? 'Yes' : 'No'}

Individual Scores:
- Validation: ${report.scores.validation}/100 (${(this.weights.validation * 100).toFixed(0)}% weight)
- Security (CodeQL): ${report.scores.security}/100 (${(this.weights.security * 100).toFixed(0)}% weight)
- AI Safety: ${report.scores.aiSafety}/100 (${(this.weights.aiSafety * 100).toFixed(0)}% weight)

Issues: ${report.details.issues.length}
Recommendations: ${report.details.recommendations.length}
    `.trim();
  }
}

// CLI usage
if (require.main === module) {
  const issueDataPath = process.argv[2];
  const aiSafetyReportPath = process.argv[3];

  if (!issueDataPath || !aiSafetyReportPath) {
    console.error('Usage: node calculate-approval-score.js <issue-data.json> <ai-safety-report.json>');
    process.exit(1);
  }

  try {
    const calculator = new ApprovalScoreCalculator();
    const report = calculator.calculateApprovalScore(
      issueDataPath,
      aiSafetyReportPath
    );

    // Output JSON for workflow consumption
    console.log(JSON.stringify(report, null, 2));

    // Log summary to stderr for human readability
    console.error('\n📊 Approval Score Calculation Complete:');
    console.error(calculator.generateSummary(report));

    if (!report.autoApprove) {
      console.error('\n⚠️  Manual review required');
    }

  } catch (error) {
    console.error('❌ Approval score calculation failed:', error.message);
    process.exit(1);
  }
}

module.exports = ApprovalScoreCalculator;
