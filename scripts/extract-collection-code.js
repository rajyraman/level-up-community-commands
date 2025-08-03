/**
 * Extract Collection Code for Security Analysis
 * Extracts JavaScript code from collections for CodeQL analysis
 */

const fs = require('fs');
const path = require('path');

class CodeExtractor {
  constructor() {
    this.outputDir = '';
  }

  /**
   * Extract all JavaScript code from a collection for analysis
   * @param {string} issueDataPath - Path to parsed issue data JSON
   * @param {string} outputDir - Directory to extract code files to
   */
  extractCode(issueDataPath, outputDir) {
    this.outputDir = outputDir;

    if (!fs.existsSync(issueDataPath)) {
      throw new Error(`Issue data file not found: ${issueDataPath}`);
    }

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const issueData = JSON.parse(fs.readFileSync(issueDataPath, 'utf8'));
    const commands = issueData.commands || [];

    if (commands.length === 0) {
      throw new Error('No commands found in collection');
    }

    console.log(`Extracting ${commands.length} commands for analysis...`);

    const extractedFiles = [];

    commands.forEach((command, index) => {
      if (!command.code) {
        console.warn(`⚠️  Command ${index + 1} has no code, skipping`);
        return;
      }

      const fileName = this.generateFileName(command, index);
      const filePath = path.join(outputDir, fileName);

      // Add metadata header for better analysis context
      const codeWithHeader = this.addAnalysisHeader(command, index);

      fs.writeFileSync(filePath, codeWithHeader, 'utf8');
      extractedFiles.push({
        fileName,
        filePath,
        commandName: command.name || `Command ${index + 1}`,
        codeLength: command.code.length
      });

      console.log(`✅ Extracted: ${fileName}`);
    });

    // Create analysis manifest
    const manifest = {
      collectionName: issueData.metadata?.name || 'Unknown Collection',
      author: issueData.metadata?.author || 'Unknown',
      commandCount: commands.length,
      extractedFiles,
      extractedAt: new Date().toISOString()
    };

    const manifestPath = path.join(outputDir, 'analysis-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    console.log(`\n📋 Analysis manifest created: ${manifestPath}`);
    console.log(`📁 Total files extracted: ${extractedFiles.length}`);

    return {
      manifestPath,
      extractedFiles,
      outputDir
    };
  }

  /**
   * Generate safe filename for extracted code
   * @param {Object} command - Command object
   * @param {number} index - Command index
   * @returns {string} Safe filename
   */
  generateFileName(command, index) {
    let baseName = command.name || `command-${index + 1}`;

    // Sanitize filename
    baseName = baseName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    return `${baseName}.js`;
  }

  /**
   * Add analysis header to code for better context
   * @param {Object} command - Command object
   * @param {number} index - Command index
   * @returns {string} Code with header
   */
  addAnalysisHeader(command, index) {
    const header = `/**
 * SECURITY ANALYSIS - EXTRACTED CODE
 * Command Name: ${command.name || `Command ${index + 1}`}
 * Description: ${command.description || 'No description provided'}
 * Category: ${command.category || 'Unknown'}
 * Author: ${command.author || 'Unknown'}
 * Extracted for: CodeQL Security Analysis
 *
 * WARNING: This code is extracted for security analysis purposes.
 * Do not execute this code directly.
 */

`;

    return header + (command.code || '');
  }

  /**
   * Validate extracted code files
   * @param {string} outputDir - Directory containing extracted files
   * @returns {Object} Validation results
   */
  validateExtractedFiles(outputDir) {
    if (!fs.existsSync(outputDir)) {
      throw new Error(`Output directory not found: ${outputDir}`);
    }

    const manifestPath = path.join(outputDir, 'analysis-manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error('Analysis manifest not found');
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      fileCount: 0,
      totalCodeSize: 0
    };

    manifest.extractedFiles.forEach(fileInfo => {
      if (!fs.existsSync(fileInfo.filePath)) {
        results.errors.push(`Missing extracted file: ${fileInfo.fileName}`);
        results.valid = false;
        return;
      }

      const fileContent = fs.readFileSync(fileInfo.filePath, 'utf8');
      const actualSize = fileContent.length;

      if (actualSize < 50) {
        results.warnings.push(`File ${fileInfo.fileName} seems too small (${actualSize} chars)`);
      }

      results.fileCount++;
      results.totalCodeSize += actualSize;
    });

    return results;
  }

  /**
   * Clean up extracted files
   * @param {string} outputDir - Directory to clean
   */
  cleanup(outputDir) {
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir);
      files.forEach(file => {
        const filePath = path.join(outputDir, file);
        fs.unlinkSync(filePath);
      });
      fs.rmdirSync(outputDir);
      console.log(`🧹 Cleaned up extraction directory: ${outputDir}`);
    }
  }
}

// CLI usage
if (require.main === module) {
  const issueDataPath = process.argv[2];
  const outputDir = process.argv[3] || './codeql-analysis';

  if (!issueDataPath) {
    console.error('Usage: node extract-collection-code.js <issue-data.json> [output-dir]');
    process.exit(1);
  }

  try {
    const extractor = new CodeExtractor();
    const result = extractor.extractCode(issueDataPath, outputDir);

    console.log('\n✅ Code extraction completed successfully!');
    console.log(`📁 Output directory: ${result.outputDir}`);
    console.log(`📋 Manifest: ${result.manifestPath}`);
    console.log(`📄 Files extracted: ${result.extractedFiles.length}`);

    // Validate the extraction
    const validation = extractor.validateExtractedFiles(outputDir);
    if (validation.valid) {
      console.log('✅ Validation passed');
    } else {
      console.log('❌ Validation failed:');
      validation.errors.forEach(error => console.log(`  • ${error}`));
    }

    if (validation.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      validation.warnings.forEach(warning => console.log(`  • ${warning}`));
    }

    console.log(`\n📊 Summary:`);
    console.log(`  Files: ${validation.fileCount}`);
    console.log(`  Total code size: ${validation.totalCodeSize} characters`);

  } catch (error) {
    console.error('❌ Code extraction failed:', error.message);
    process.exit(1);
  }
}

module.exports = CodeExtractor;
