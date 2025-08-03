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

## 🔧 Common Patterns

### 1. Form Context Operations

```javascript
// Get current form context
const formContext = Xrm.Page;

// Get entity information
const entityName = formContext.data.entity.getEntityName();
const recordId = formContext.data.entity.getId();
const isDirty = formContext.data.entity.getIsDirty();

// Get field values
const firstName = formContext.getAttribute('firstname').getValue();
const lastName = formContext.getAttribute('lastname').getValue();

// Set field values
formContext.getAttribute('description').setValue('Updated by command');

// Control field visibility
formContext.getControl('telephone1').setVisible(true);

// Add notification
formContext.ui.setFormNotification('Command executed successfully', 'INFO', 'command_notification');
```

### 2. WebAPI Operations

```javascript
// Retrieve record
const contact = await Xrm.WebApi.retrieveRecord(
  'contact',
  recordId,
  '?$select=firstname,lastname,emailaddress1'
);

// Create record
const newRecord = {
  firstname: 'John',
  lastname: 'Doe',
  emailaddress1: 'john@example.com'
};

const createdRecord = await Xrm.WebApi.createRecord('contact', newRecord);

// Update record
const updateData = {
  description: 'Updated by Level Up command'
};

await Xrm.WebApi.updateRecord('contact', recordId, updateData);

// Retrieve multiple records
const contacts = await Xrm.WebApi.retrieveMultipleRecords(
  'contact',
  '?$select=firstname,lastname&$filter=statecode eq 0&$top=10'
);
```

### 3. Navigation Operations

```javascript
// Open record
await Xrm.Navigation.openForm({
  entityName: 'contact',
  entityId: recordId
});

// Open view
await Xrm.Navigation.openView({
  entityName: 'contact',
  viewId: '{view-guid}',
  viewType: 'savedquery'
});

// Open URL
await Xrm.Navigation.openUrl('https://docs.microsoft.com/dynamics365/');

// Open dialog
const dialogResult = await Xrm.Navigation.openConfirmDialog({
  title: 'Confirm Action',
  text: 'Are you sure you want to proceed?'
});

if (dialogResult.confirmed) {
  // User confirmed
}
```

### 4. User Interface Operations

```javascript
// Show loading indicator
Xrm.Utility.showProgressIndicator('Processing...');

// Hide loading indicator
Xrm.Utility.closeProgressIndicator();

// Get user information
const userSettings = Xrm.Utility.getGlobalContext().userSettings;
const userId = userSettings.userId;
const userName = userSettings.userName;

// Get organization information
const orgSettings = Xrm.Utility.getGlobalContext().organizationSettings;
const orgName = orgSettings.friendlyName;
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

## 🧪 Testing Guidelines

### Unit Testing

```javascript
// Test individual functions
function testValidateEmail() {
  const validEmail = 'user@example.com';
  const invalidEmail = 'invalid-email';

  console.assert(validateEmail(validEmail) === true, 'Valid email should pass');
  console.assert(validateEmail(invalidEmail) === false, 'Invalid email should fail');
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

### Integration Testing

1. **Test in Different Environments**: Test in dev, staging, and production
2. **Test Different Entities**: Verify compatibility across entity types
3. **Test Different Users**: Test with different security roles
4. **Test Edge Cases**: Test with missing data, empty fields, etc.
5. **Test Performance**: Verify performance with realistic data volumes

### Manual Testing Checklist

- [ ] Command executes without errors
- [ ] User feedback is appropriate and clear
- [ ] Performance is acceptable
- [ ] Works across different browsers
- [ ] Respects user permissions
- [ ] Handles edge cases gracefully
- [ ] No sensitive data is exposed
- [ ] Follows UI/UX best practices

## 📖 API Reference

### Essential Xrm APIs

#### Xrm.Page (Form Context)

- `Xrm.Page.data.entity` - Entity operations
- `Xrm.Page.getAttribute(name)` - Field operations
- `Xrm.Page.getControl(name)` - Control operations
- `Xrm.Page.ui` - UI operations

#### Xrm.WebApi

- `retrieveRecord(entityName, id, options)` - Get single record
- `retrieveMultipleRecords(entityName, options)` - Get multiple records
- `createRecord(entityName, data)` - Create record
- `updateRecord(entityName, id, data)` - Update record
- `deleteRecord(entityName, id)` - Delete record

#### Xrm.Navigation

- `openForm(options)` - Open form
- `openView(options)` - Open view
- `openUrl(url)` - Open URL
- `openAlertDialog(options)` - Show alert
- `openConfirmDialog(options)` - Show confirmation

#### Xrm.Utility

- `getGlobalContext()` - Get context information
- `showProgressIndicator(message)` - Show loading
- `closeProgressIndicator()` - Hide loading

## 💡 Example Commands

### Simple Form Command

```javascript
// Command: Show Record Summary
// Description: Display a summary of the current record
// Category: form-actions

(function () {
  'use strict';

  try {
    const formContext = Xrm.Page;
    const entityName = formContext.data.entity.getEntityName();
    const recordId = formContext.data.entity.getId();

    if (!recordId) {
      throw new Error('Please save the record first');
    }

    const summary = `
      Entity: ${entityName}
      Record ID: ${recordId}
      Modified: ${formContext.data.entity.getLastModifiedTime()}
      Dirty: ${formContext.data.entity.getIsDirty() ? 'Yes' : 'No'}
    `;

    Xrm.Navigation.openAlertDialog({
      title: 'Record Summary',
      text: summary
    });
  } catch (error) {
    Xrm.Navigation.openErrorDialog({
      title: 'Error',
      message: error.message
    });
  }
})();
```

### Advanced Data Command

```javascript
// Command: Bulk Update Related Records
// Description: Update related records with confirmation
// Category: data-management

(async function () {
  'use strict';

  const CONFIG = {
    relationshipName: 'contact_customer_accounts',
    updateField: 'description',
    updateValue: 'Bulk updated via Level Up'
  };

  try {
    const formContext = Xrm.Page;
    const recordId = formContext.data.entity.getId();

    if (!recordId) {
      throw new Error('Please save the record first');
    }

    // Get related records
    const relatedRecords = await Xrm.WebApi.retrieveMultipleRecords(
      'contact',
      `?$filter=_parentcustomerid_value eq ${recordId}`
    );

    if (relatedRecords.entities.length === 0) {
      Xrm.Navigation.openAlertDialog({
        title: 'No Records',
        text: 'No related contacts found to update.'
      });
      return;
    }

    // Confirm action
    const confirmed = await Xrm.Navigation.openConfirmDialog({
      title: 'Bulk Update',
      text: `Update ${relatedRecords.entities.length} related contacts?`
    });

    if (!confirmed.confirmed) {
      return;
    }

    // Show progress
    Xrm.Utility.showProgressIndicator('Updating records...');

    // Update records
    let updated = 0;
    for (const record of relatedRecords.entities) {
      try {
        await Xrm.WebApi.updateRecord('contact', record.contactid, {
          [CONFIG.updateField]: CONFIG.updateValue
        });
        updated++;
      } catch (updateError) {
        console.warn(`Failed to update record ${record.contactid}:`, updateError);
      }
    }

    Xrm.Utility.closeProgressIndicator();

    Xrm.Navigation.openAlertDialog({
      title: 'Update Complete',
      text: `Successfully updated ${updated} of ${relatedRecords.entities.length} records.`
    });
  } catch (error) {
    Xrm.Utility.closeProgressIndicator();
    Xrm.Navigation.openErrorDialog({
      title: 'Bulk Update Error',
      message: error.message
    });
  }
})();
```

## 🚀 Publishing Your Command

Once your command is ready:

1. **Test Thoroughly**: Verify it works in your environment
2. **Document Well**: Add clear descriptions and usage notes
3. **Remove Sensitive Data**: Clean out any hardcoded values
4. **Submit via Issue**: Use our submission templates
5. **Respond to Feedback**: Work with reviewers to improve

---

Happy coding! 🎉
