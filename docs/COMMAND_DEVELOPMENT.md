# Command Development Guide

This guide helps you create high-quality custom commands for the Level Up community.

## 🎯 Overview

Level Up commands are JavaScript functions that automate tasks and enhance productivity in Dynamics 365. This guide covers best practices, patterns, and examples for creating effective commands.

## 🏗️ Command Structure

### Basic Command Template

```javascript
// Command Name: Your Command Name
// Description: What your command does
// Category: form-actions (or appropriate category)
// Author: Your Name

(function () {
  'use strict';

  try {
    // Your command logic here

    // Provide user feedback
    Xrm.Navigation.openAlertDialog({
      title: 'Success',
      text: 'Command completed successfully!'
    });
  } catch (error) {
    console.error('Command error:', error);
    Xrm.Navigation.openErrorDialog({
      title: 'Error',
      message: 'Command failed: ' + error.message
    });
  }
})();
```

### Advanced Command Template

```javascript
// Command Name: Advanced Template
// Description: Template with configuration and validation
// Category: utilities
// Author: Community

(async function () {
  'use strict';

  // Configuration
  const CONFIG = {
    entityLogicalName: 'contact',
    requiredFields: ['firstname', 'lastname'],
    maxRecords: 100
  };

  // Validation
  function validateEnvironment() {
    if (!Xrm || !Xrm.Page) {
      throw new Error('Command must be run from a Dynamics 365 form');
    }

    const formContext = Xrm.Page;
    const entityName = formContext.data.entity.getEntityName();

    if (entityName !== CONFIG.entityLogicalName) {
      throw new Error(`This command only works on ${CONFIG.entityLogicalName} forms`);
    }

    return formContext;
  }

  // Main logic
  async function executeCommand() {
    const formContext = validateEnvironment();

    // Get current record data
    const recordId = formContext.data.entity.getId();
    const entityName = formContext.data.entity.getEntityName();

    // Your business logic here
    const result = await processRecord(recordId, entityName);

    return result;
  }

  async function processRecord(recordId, entityName) {
    // Implement your processing logic
    // Use Xrm.WebApi for data operations

    const record = await Xrm.WebApi.retrieveRecord(
      entityName,
      recordId,
      '?$select=firstname,lastname,emailaddress1'
    );

    return record;
  }

  // Execute and handle results
  try {
    const result = await executeCommand();

    Xrm.Navigation.openAlertDialog({
      title: 'Success',
      text: 'Command completed successfully!'
    });
  } catch (error) {
    console.error('Command execution failed:', error);

    Xrm.Navigation.openErrorDialog({
      title: 'Command Error',
      message: error.message || 'An unexpected error occurred'
    });
  }
})();
```

## 📚 Best Practices

### Code Quality

1. **Use Strict Mode**: Always start with `'use strict';`
2. **Use IIFE**: Wrap commands in immediately invoked function expressions
3. **Handle Errors**: Implement comprehensive error handling
4. **Add Comments**: Document complex logic and business rules
5. **Use Constants**: Define configuration values as constants

### Performance

1. **Minimize API Calls**: Batch operations when possible
2. **Use Specific Selects**: Only retrieve needed fields
3. **Handle Large Datasets**: Implement pagination for large operations
4. **Async/Await**: Use modern async patterns
5. **Progress Indicators**: Show progress for long operations

### User Experience

1. **Provide Feedback**: Always inform users of results
2. **Confirm Destructive Actions**: Ask before deleting or major changes
3. **Graceful Failures**: Handle errors gracefully with helpful messages
4. **Loading States**: Show progress for long-running operations
5. **Clear Messages**: Use clear, non-technical language

### Security

1. **Validate Inputs**: Check all user inputs and parameters
2. **Handle Permissions**: Respect user security roles
3. **No Hardcoded Values**: Avoid hardcoded URLs or credentials
4. **Sanitize Data**: Clean data before processing
5. **Error Details**: Don't expose sensitive information in errors

### Manual Testing Checklist

- [ ] Command executes without errors
- [ ] User feedback is appropriate and clear
- [ ] Performance is acceptable
- [ ] Works across different browsers
- [ ] Respects user permissions
- [ ] Handles edge cases gracefully
- [ ] No sensitive data is exposed
- [ ] Follows UI/UX best practices

## 🚀 Publishing Your Command

Once your command is ready:

1. **Test Thoroughly**: Verify it works in your environment
2. **Document Well**: Add clear descriptions and usage notes
3. **Remove Sensitive Data**: Clean out any hardcoded values
4. **Submit via Issue**: Use our submission templates
5. **Respond to Feedback**: Work with reviewers to improve

---

Happy coding! 🎉
