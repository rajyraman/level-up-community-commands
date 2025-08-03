/**
 * AI Safety Check Script
 * Uses GitHub Models API to perform real AI safety validation on code
 */

const fs = require('fs');
const https = require('https');

class AISafetyChecker {
  constructor() {
    this.maxCodeLength = 10000; // Limit code length for API calls
    this.githubToken = process.env.GITHUB_TOKEN;
    this.apiEndpoint = 'https://models.inference.ai.azure.com';
    this.modelName = 'gpt-4o-mini'; // Use GitHub Models free tier

    this.safetyPrompt = `You are a security expert reviewing JavaScript code for a Dynamics 365 extension.
Analyze the provided code for potential security vulnerabilities, malicious patterns, and safety issues.

Focus on:
1. Code injection vulnerabilities (eval, Function constructor, etc.)
2. Potential XSS vulnerabilities
3. Hardcoded credentials or sensitive data
4. Dangerous API calls or external requests
5. Malicious patterns or obfuscated code
6. Data exfiltration attempts
7. System manipulation attempts
8. Dynamics 365 specific security concerns

Rate the code safety on a scale of 0-100 where:
- 90-100: Very safe, no significant security concerns
- 70-89: Generally safe with minor issues
- 50-69: Some security concerns that should be addressed
- 30-49: Significant security issues, needs review
- 0-29: Dangerous code with serious security vulnerabilities

Respond ONLY with a valid JSON object (no markdown formatting) containing:
{
  "safetyScore": <number 0-100>,
  "riskLevel": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "issues": [
    {
      "severity": "<LOW|MEDIUM|HIGH|CRITICAL>",
      "category": "<category>",
      "description": "<description>",
      "recommendation": "<recommendation>",
      "lineNumber": <number or null>
    }
  ],
  "summary": "<brief summary of findings>",
  "autoApprove": <boolean>
}`;
  }

  /**
   * Perform AI safety check on collection
   * @param {string} issueDataPath - Path to parsed issue data JSON
   * @returns {Object} Safety report
   */
  async performSafetyCheck(issueDataPath) {
    if (!fs.existsSync(issueDataPath)) {
      throw new Error(`Issue data file not found: ${issueDataPath}`);
    }

    const issueData = JSON.parse(fs.readFileSync(issueDataPath, 'utf8'));
    const commands = issueData.commands || [];

    if (commands.length === 0) {
      throw new Error('No commands found in collection');
    }

    console.log(`🤖 Performing AI safety check on ${commands.length} commands...`);

    const report = {
      safetyScore: 100,
      riskLevel: 'LOW',
      overallSummary: '',
      autoApprove: false,
      commandReports: [],
      processedAt: new Date().toISOString(),
      totalIssues: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0
    };

    // Check each command
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`  Analyzing command ${i + 1}/${commands.length}: ${command.name || 'Unnamed'}`);

      try {
        const commandReport = await this.analyzeCommand(command, i);
        report.commandReports.push(commandReport);

        // Aggregate issues
        if (commandReport.issues) {
          commandReport.issues.forEach(issue => {
            report.totalIssues++;
            switch (issue.severity) {
              case 'CRITICAL':
                report.criticalIssues++;
                break;
              case 'HIGH':
                report.highIssues++;
                break;
              case 'MEDIUM':
                report.mediumIssues++;
                break;
              case 'LOW':
                report.lowIssues++;
                break;
            }
          });
        }

      } catch (error) {
        console.error(`  ❌ Failed to analyze command ${i + 1}: ${error.message}`);

        // Add error as critical issue
        report.commandReports.push({
          commandIndex: i,
          commandName: command.name || `Command ${i + 1}`,
          safetyScore: 0,
          riskLevel: 'CRITICAL',
          issues: [{
            severity: 'CRITICAL',
            category: 'Analysis Error',
            description: `Failed to analyze command: ${error.message}`,
            recommendation: 'Manual review required due to analysis failure'
          }],
          summary: 'Analysis failed',
          autoApprove: false
        });

        report.criticalIssues++;
        report.totalIssues++;
      }
    }

    // Calculate overall scores
    this.calculateOverallScores(report);

    return report;
  }

  /**
   * Analyze a single command using real AI inference
   * @param {Object} command - Command object
   * @param {number} index - Command index
   * @returns {Object} Command analysis report
   */
  async analyzeCommand(command, index) {
    if (!command.code) {
      return {
        commandIndex: index,
        commandName: command.name || `Command ${index + 1}`,
        safetyScore: 100,
        riskLevel: 'LOW',
        issues: [],
        summary: 'No code to analyze',
        autoApprove: true
      };
    }

    // Truncate code if too long
    let codeToAnalyze = command.code;
    if (codeToAnalyze.length > this.maxCodeLength) {
      codeToAnalyze = codeToAnalyze.substring(0, this.maxCodeLength) + '\n// ... (code truncated for analysis)';
    }

    try {
      // Use real AI inference via GitHub Models API
      const aiResponse = await this.callGitHubModelsAPI(command, codeToAnalyze);

      // Add command-specific metadata
      aiResponse.commandIndex = index;
      aiResponse.commandName = command.name || `Command ${index + 1}`;

      return aiResponse;
    } catch (error) {
      console.error(`AI analysis failed for command ${index + 1}:`, error.message);

      // Fallback to rule-based analysis if AI fails
      console.log(`Falling back to rule-based analysis for command ${index + 1}`);
      return this.simulateAIAnalysis(command, index, codeToAnalyze);
    }
  }

  /**
   * Call GitHub Models API for AI-powered security analysis
   * @param {Object} command - Command object
   * @param {string} code - Code to analyze
   * @returns {Object} AI analysis response
   */
  async callGitHubModelsAPI(command, code) {
    if (!this.githubToken) {
      throw new Error('GitHub token not available, falling back to simulation');
    }

    const prompt = `${this.safetyPrompt}

Command to analyze:
Name: ${command.name || 'Unnamed Command'}
Description: ${command.description || 'No description'}

JavaScript Code:
\`\`\`javascript
${code}
\`\`\`

Please analyze this code and respond with the JSON format specified above.`;

    const requestBody = {
      messages: [
        {
          role: "system",
          content: "You are a cybersecurity expert specializing in JavaScript code analysis for Microsoft Dynamics 365 applications. Provide thorough security analysis in the exact JSON format requested."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: this.modelName,
      temperature: 0.1,
      max_tokens: 2000,
      top_p: 0.1
    };

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(requestBody);

      const options = {
        hostname: 'models.inference.ai.azure.com',
        port: 443,
        path: '/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.githubToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'level-up-community-commands/1.0'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              throw new Error(`API request failed with status ${res.statusCode}: ${responseData}`);
            }

            const response = JSON.parse(responseData);

            if (!response.choices || !response.choices[0] || !response.choices[0].message) {
              throw new Error('Invalid API response structure');
            }

            const aiContent = response.choices[0].message.content.trim();

            // Extract JSON from the response (remove any markdown formatting)
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              throw new Error('No valid JSON found in AI response');
            }

            const analysis = JSON.parse(jsonMatch[0]);

            // Validate required fields
            if (typeof analysis.safetyScore !== 'number' ||
                !analysis.riskLevel ||
                !Array.isArray(analysis.issues)) {
              throw new Error('AI response missing required fields');
            }

            // Ensure score is within valid range
            analysis.safetyScore = Math.max(0, Math.min(100, analysis.safetyScore));

            resolve(analysis);

          } catch (parseError) {
            reject(new Error(`Failed to parse AI response: ${parseError.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`API request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('API request timed out'));
      });

      req.setTimeout(30000); // 30 second timeout
      req.write(postData);
      req.end();
    });
  }

  /**
   * Simulate AI analysis with rule-based security checks
   * @param {Object} command - Command object
   * @param {number} index - Command index
   * @param {string} code - Code to analyze
   * @returns {Object} Analysis report
   */
  simulateAIAnalysis(command, index, code) {
    const issues = [];
    let safetyScore = 100;

    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /eval\s*\(/gi, severity: 'CRITICAL', category: 'Code Injection', points: 50 },
      { pattern: /Function\s*\(/gi, severity: 'CRITICAL', category: 'Code Injection', points: 50 },
      { pattern: /setTimeout\s*\(\s*["'`][^"'`]*["'`]/gi, severity: 'HIGH', category: 'Code Injection', points: 30 },
      { pattern: /setInterval\s*\(\s*["'`][^"'`]*["'`]/gi, severity: 'HIGH', category: 'Code Injection', points: 30 },
      { pattern: /document\.write/gi, severity: 'HIGH', category: 'XSS Risk', points: 25 },
      { pattern: /innerHTML\s*=/gi, severity: 'MEDIUM', category: 'XSS Risk', points: 15 },
      { pattern: /password\s*[:=]\s*["'`][^"'`]+["'`]/gi, severity: 'CRITICAL', category: 'Hardcoded Credentials', points: 40 },
      { pattern: /api[_-]?key\s*[:=]\s*["'`][^"'`]+["'`]/gi, severity: 'CRITICAL', category: 'Hardcoded Credentials', points: 40 },
      { pattern: /secret\s*[:=]\s*["'`][^"'`]+["'`]/gi, severity: 'CRITICAL', category: 'Hardcoded Credentials', points: 40 },
      { pattern: /token\s*[:=]\s*["'`][^"'`]+["'`]/gi, severity: 'HIGH', category: 'Hardcoded Credentials', points: 30 },
      { pattern: /https?:\/\/(?!.*\.(dynamics|microsoft|office365)\.)[a-zA-Z0-9.-]+/gi, severity: 'MEDIUM', category: 'External Requests', points: 20 },
      { pattern: /fetch\s*\(/gi, severity: 'MEDIUM', category: 'External Requests', points: 15 },
      { pattern: /XMLHttpRequest/gi, severity: 'MEDIUM', category: 'External Requests', points: 15 },
      { pattern: /\.ajax\s*\(/gi, severity: 'MEDIUM', category: 'External Requests', points: 15 },
      { pattern: /localStorage/gi, severity: 'LOW', category: 'Data Storage', points: 10 },
      { pattern: /sessionStorage/gi, severity: 'LOW', category: 'Data Storage', points: 10 },
      { pattern: /btoa\s*\(|atob\s*\(/gi, severity: 'LOW', category: 'Data Encoding', points: 5 }
    ];

    dangerousPatterns.forEach(({ pattern, severity, category, points }) => {
      const matches = code.match(pattern);
      if (matches) {
        matches.forEach(match => {
          issues.push({
            severity,
            category,
            description: `Found potentially dangerous pattern: ${match}`,
            recommendation: this.getRecommendation(category, severity)
          });
          safetyScore -= points;
        });
      }
    });

    // Check for positive patterns
    const positivePatterns = [
      { pattern: /try\s*{[\s\S]*catch\s*\(/gi, points: 5 },
      { pattern: /(openAlertDialog|openErrorDialog|setFormNotification)/gi, points: 3 },
      { pattern: /'use strict'/gi, points: 2 }
    ];

    positivePatterns.forEach(({ pattern, points }) => {
      if (code.match(pattern)) {
        safetyScore += points;
      }
    });

    // Ensure score stays within bounds
    safetyScore = Math.max(0, Math.min(100, safetyScore));

    const riskLevel = this.determineRiskLevel(safetyScore);
    const autoApprove = safetyScore >= 75 && issues.filter(i => i.severity === 'CRITICAL').length === 0;

    return {
      commandIndex: index,
      commandName: command.name || `Command ${index + 1}`,
      safetyScore,
      riskLevel,
      issues,
      summary: this.generateCommandSummary(safetyScore, issues),
      autoApprove
    };
  }

  /**
   * Get recommendation for a specific issue category and severity
   * @param {string} category - Issue category
   * @param {string} severity - Issue severity
   * @returns {string} Recommendation
   */
  getRecommendation(category, severity) {
    const recommendations = {
      'Code Injection': 'Remove or replace with safe alternatives. Never use eval() or Function() constructor.',
      'XSS Risk': 'Sanitize all user inputs and use safe DOM manipulation methods.',
      'Hardcoded Credentials': 'Remove hardcoded credentials and use secure configuration management.',
      'External Requests': 'Ensure external requests are to trusted domains and use HTTPS.',
      'Data Storage': 'Avoid storing sensitive data in browser storage.',
      'Data Encoding': 'Ensure encoded data is not used for security purposes.'
    };

    return recommendations[category] || 'Review and address the identified security concern.';
  }

  /**
   * Determine risk level based on safety score
   * @param {number} safetyScore - Safety score
   * @returns {string} Risk level
   */
  determineRiskLevel(safetyScore) {
    if (safetyScore >= 90) return 'LOW';
    if (safetyScore >= 70) return 'MEDIUM';
    if (safetyScore >= 50) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Generate summary for a command analysis
   * @param {number} safetyScore - Safety score
   * @param {Array} issues - Array of issues
   * @returns {string} Summary
   */
  generateCommandSummary(safetyScore, issues) {
    if (issues.length === 0) {
      return 'No security issues detected. Code appears safe.';
    }

    const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
    const highCount = issues.filter(i => i.severity === 'HIGH').length;

    if (criticalCount > 0) {
      return `Critical security issues detected (${criticalCount}). Manual review required.`;
    }

    if (highCount > 0) {
      return `High-severity issues detected (${highCount}). Consider addressing before approval.`;
    }

    return `Minor security concerns detected (${issues.length}). Generally safe but could be improved.`;
  }

  /**
   * Calculate overall scores for the collection
   * @param {Object} report - Report object to update
   */
  calculateOverallScores(report) {
    if (report.commandReports.length === 0) {
      report.safetyScore = 0;
      report.riskLevel = 'CRITICAL';
      report.autoApprove = false;
      report.overallSummary = 'No commands analyzed';
      return;
    }

    // Calculate weighted average safety score
    const totalScore = report.commandReports.reduce((sum, cmd) => sum + cmd.safetyScore, 0);
    report.safetyScore = Math.round(totalScore / report.commandReports.length);

    // Determine overall risk level
    report.riskLevel = this.determineRiskLevel(report.safetyScore);

    // Auto-approve only if all commands can be auto-approved and overall score is good
    report.autoApprove = report.safetyScore >= 75 &&
                        report.criticalIssues === 0 &&
                        report.commandReports.every(cmd => cmd.autoApprove);

    // Generate overall summary
    report.overallSummary = `Analyzed ${report.commandReports.length} commands. ` +
                           `Safety score: ${report.safetyScore}/100. ` +
                           `Issues: ${report.totalIssues} total (${report.criticalIssues} critical, ${report.highIssues} high).`;
  }
}

// CLI usage
if (require.main === module) {
  const issueDataPath = process.argv[2];

  if (!issueDataPath) {
    console.error('Usage: node ai-safety-check.js <issue-data.json>');
    process.exit(1);
  }

  (async () => {
    try {
      const checker = new AISafetyChecker();
      const report = await checker.performSafetyCheck(issueDataPath);

      // Output JSON for workflow consumption
      console.log(JSON.stringify(report, null, 2));

      // Log summary to stderr for human readability
      console.error('\n🤖 AI Safety Check Complete:');
      console.error(`Safety Score: ${report.safetyScore}/100`);
      console.error(`Risk Level: ${report.riskLevel}`);
      console.error(`Auto-approve: ${report.autoApprove ? 'Yes' : 'No'}`);
      console.error(`Issues: ${report.totalIssues} total`);

      if (report.criticalIssues > 0) {
        console.error(`⚠️  ${report.criticalIssues} critical issues found - manual review required`);
      }

    } catch (error) {
      console.error('❌ AI safety check failed:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = AISafetyChecker;
