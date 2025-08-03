# API Reference

This document provides a comprehensive reference for the Dynamics 365 and Level Up APIs available when developing custom commands.

## 🌐 Xrm Global Object

The `Xrm` object is the primary interface for interacting with Dynamics 365 from custom commands.

### Availability Check

```javascript
// Always check if Xrm is available
if (typeof Xrm === 'undefined') {
  throw new Error('Xrm object not available. Command must be run from Dynamics 365.');
}
```

## 📝 Xrm.Page (Form Context)

Used for form-based operations and accessing form data.

### Entity Operations

```javascript
// Get entity information
const formContext = Xrm.Page;
const entity = formContext.data.entity;

// Properties and methods
entity.getEntityName(); // Returns: string (e.g., 'contact')
entity.getId(); // Returns: string (GUID) or null
entity.getIsDirty(); // Returns: boolean
entity.getPrimaryAttributeValue(); // Returns: string or null
entity.getLastModifiedTime(); // Returns: Date or null

// Entity reference
entity.getEntityReference(); // Returns: EntityReference object
```

### Attribute Operations

```javascript
// Get attribute
const attribute = formContext.getAttribute('attributename');

if (attribute) {
  // Properties and methods
  attribute.getValue(); // Returns: any
  attribute.setValue(value); // Sets the attribute value
  attribute.getName(); // Returns: string
  attribute.getAttributeType(); // Returns: string
  attribute.getRequiredLevel(); // Returns: 'none' | 'required' | 'recommended'
  attribute.setRequiredLevel(level); // Sets requirement level
  attribute.getIsDirty(); // Returns: boolean
  attribute.getInitialValue(); // Returns: any

  // For option sets
  attribute.getText(); // Returns: string (display text)
  attribute.getOptions(); // Returns: OptionMetadata[]

  // For lookups
  attribute.getSelectedOption(); // Returns: LookupValue[]
}
```

### Control Operations

```javascript
// Get control
const control = formContext.getControl('controlname');

if (control) {
  // Visibility
  control.getVisible(); // Returns: boolean
  control.setVisible(visible); // Sets visibility

  // Disabled state
  control.getDisabled(); // Returns: boolean
  control.setDisabled(disabled); // Sets disabled state

  // Label
  control.getLabel(); // Returns: string
  control.setLabel(label); // Sets label text

  // Focus
  control.setFocus(); // Sets focus to control

  // For specific control types
  control.getAttribute(); // Returns: Attribute
  control.getControlType(); // Returns: string
}
```

### UI Operations

```javascript
const ui = formContext.ui;

// Form notifications
ui.setFormNotification(message, level, uniqueId);
// level: 'ERROR' | 'WARNING' | 'INFO'
ui.clearFormNotification(uniqueId);

// Navigation
ui.navigation.items.get('tabname').setVisible(visible);
ui.navigation.items.get('tabname').sections.get('sectionname').setVisible(visible);

// Header process
ui.process.getDisplayState(); // Returns: 'expanded' | 'collapsed'
ui.process.setDisplayState(state);

// Quick forms
ui.quickForms.get('quickformname').getControl('attributename');
```

## 🌐 Xrm.WebApi

Used for CRUD operations with Dynamics 365 data.

### Retrieve Operations

```javascript
// Retrieve single record
const record = await Xrm.WebApi.retrieveRecord(
  entityLogicalName, // string: Entity logical name
  id, // string: Record GUID
  options // string: OData query options (optional)
);

// Example with options
const contact = await Xrm.WebApi.retrieveRecord(
  'contact',
  recordId,
  '?$select=firstname,lastname,emailaddress1&$expand=parentcustomerid($select=name)'
);

// Retrieve multiple records
const result = await Xrm.WebApi.retrieveMultipleRecords(
  entityLogicalName, // string: Entity logical name
  options // string: OData query string (optional)
);

// Example
const contacts = await Xrm.WebApi.retrieveMultipleRecords(
  'contact',
  '?$select=firstname,lastname&$filter=statecode eq 0&$orderby=lastname&$top=50'
);

// Access results
console.log(contacts.entities); // Array of records
console.log(contacts.nextLink); // URL for next page (if exists)
```

### Create Operations

```javascript
// Create record
const recordData = {
  firstname: 'John',
  lastname: 'Doe',
  emailaddress1: 'john@example.com',
  // Lookup reference
  'parentcustomerid@odata.bind': '/accounts(account-guid)'
};

const createdRecord = await Xrm.WebApi.createRecord('contact', recordData);

console.log(createdRecord.id); // GUID of created record
```

### Update Operations

```javascript
// Update record
const updateData = {
  firstname: 'Jane',
  description: 'Updated via Level Up command'
};

const updatedRecord = await Xrm.WebApi.updateRecord('contact', recordId, updateData);

console.log(updatedRecord.id); // GUID of updated record
```

### Delete Operations

```javascript
// Delete record
const deletedRecord = await Xrm.WebApi.deleteRecord('contact', recordId);

console.log(deletedRecord.id); // GUID of deleted record
```

### Advanced Operations

```javascript
// Execute FetchXML
const fetchXml = `
  <fetch top="10">
    <entity name="contact">
      <attribute name="firstname" />
      <attribute name="lastname" />
      <filter>
        <condition attribute="statecode" operator="eq" value="0" />
      </filter>
    </entity>
  </fetch>
`;

const result = await Xrm.WebApi.retrieveMultipleRecords(
  'contact',
  '?fetchXml=' + encodeURIComponent(fetchXml)
);
```

## 🧭 Xrm.Navigation

Used for navigation and dialog operations.

### Form Navigation

```javascript
// Open existing record form
await Xrm.Navigation.openForm({
  entityName: 'contact', // Required: Entity logical name
  entityId: recordId, // Required: Record GUID
  formId: formGuid, // Optional: Specific form
  windowPosition: 1, // Optional: 1=center, 2=side
  openInNewWindow: true // Optional: Open in new window
});

// Open new record form
await Xrm.Navigation.openForm({
  entityName: 'contact',
  useQuickCreateForm: true, // Use quick create if available
  createFromEntity: {
    // Pre-populate fields
    entityType: 'account',
    id: parentAccountId,
    name: 'Parent Account'
  }
});
```

### View Navigation

```javascript
// Open system view
await Xrm.Navigation.openView({
  entityName: 'contact',
  viewId: viewGuid, // System view GUID
  viewType: 'savedquery' // 'savedquery' or 'userquery'
});

// Open personal view
await Xrm.Navigation.openView({
  entityName: 'contact',
  viewId: userViewGuid,
  viewType: 'userquery'
});
```

### URL Navigation

```javascript
// Open external URL
await Xrm.Navigation.openUrl('https://docs.microsoft.com', {
  target: 1, // 1=inline, 2=new window
  width: 800, // Width in pixels
  height: 600 // Height in pixels
});

// Open file
await Xrm.Navigation.openFile({
  fileContent: base64Content,
  fileName: 'report.pdf',
  fileSize: fileSize,
  mimeType: 'application/pdf'
});
```

### Dialog Operations

```javascript
// Alert dialog
await Xrm.Navigation.openAlertDialog({
  title: 'Success',
  text: 'Operation completed successfully!',
  confirmButtonLabel: 'OK'
});

// Confirm dialog
const result = await Xrm.Navigation.openConfirmDialog({
  title: 'Confirm Action',
  text: 'Are you sure you want to delete this record?',
  confirmButtonLabel: 'Delete',
  cancelButtonLabel: 'Cancel'
});

if (result.confirmed) {
  // User clicked confirm
}

// Error dialog
await Xrm.Navigation.openErrorDialog({
  title: 'Error',
  message: 'An error occurred while processing your request.',
  details: 'Detailed error information...'
});
```

## 🛠️ Xrm.Utility

Utility functions for common operations.

### Global Context

```javascript
const globalContext = Xrm.Utility.getGlobalContext();

// User information
const userSettings = globalContext.userSettings;
userSettings.userId; // Current user GUID
userSettings.userName; // Current user name
userSettings.roles; // User security roles
userSettings.languageId; // User language code
userSettings.securityRolePrivileges; // User privileges

// Organization information
const orgSettings = globalContext.organizationSettings;
orgSettings.organizationId; // Organization GUID
orgSettings.friendlyName; // Organization display name
orgSettings.uniqueName; // Organization unique name
orgSettings.languageId; // Default language
orgSettings.baseCurrencyId; // Base currency GUID

// Client information
const clientContext = globalContext.client;
clientContext.getClient(); // Returns: 'Web' | 'Outlook' | 'Mobile'
clientContext.getClientState(); // Returns: 'Online' | 'Offline'

// Version information
globalContext.getVersion(); // Returns version string
globalContext.isOnPremise(); // Returns boolean
```

### Progress Indicators

```javascript
// Show progress indicator
Xrm.Utility.showProgressIndicator('Processing data...');

// Hide progress indicator
Xrm.Utility.closeProgressIndicator();
```

### Lookups

```javascript
// Open lookup dialog
const lookupOptions = {
  entityTypes: ['contact'],
  allowMultiSelect: false,
  defaultEntityType: 'contact',
  defaultViewId: viewGuid,
  viewIds: [
    {
      entityType: 'contact',
      viewId: viewGuid
    }
  ]
};

const selectedItems = await Xrm.Utility.lookupObjects(lookupOptions);

if (selectedItems && selectedItems.length > 0) {
  const selectedContact = selectedItems[0];
  console.log(selectedContact.id);
  console.log(selectedContact.name);
  console.log(selectedContact.entityType);
}
```

### Date/Time Operations

```javascript
// Format date/time
const formattedDate = Xrm.Utility.formatDateTimeString(new Date(), 'dd/MM/yyyy');

// Get user local equivalent time
const userTime = Xrm.Utility.getUserLocalTime(utcDateTime);

// Get UTC equivalent time
const utcTime = Xrm.Utility.getUtcTime(localDateTime);
```

## 🔍 Advanced APIs

### Entity Metadata

```javascript
// Get entity metadata
const entityMetadata = await Xrm.Utility.getEntityMetadata(
  'contact', // Entity logical name
  ['Attributes'] // Properties to retrieve
);

// Get entity set name
const entitySetName = entityMetadata.EntitySetName; // 'contacts'

// Get attributes
entityMetadata.Attributes.forEach(attribute => {
  console.log(attribute.LogicalName);
  console.log(attribute.AttributeType);
  console.log(attribute.DisplayName.UserLocalizedLabel.Label);
});
```

### Option Set Values

```javascript
// Get global option set
const optionSetMetadata = await Xrm.Utility.getGlobalOptionSetMetadata('optionsetname');

// Access options
optionSetMetadata.Options.forEach(option => {
  console.log(option.Value); // Numeric value
  console.log(option.Label.UserLocalizedLabel.Label); // Display text
});
```

## 📊 Business Process Flow

```javascript
// Get active process
const activeProcess = formContext.data.process.getActiveProcess();
console.log(activeProcess.getId());
console.log(activeProcess.getName());

// Get active stage
const activeStage = formContext.data.process.getActiveStage();
console.log(activeStage.getId());
console.log(activeStage.getName());

// Get stages
const stages = activeProcess.getStages();
stages.forEach(stage => {
  console.log(stage.getId());
  console.log(stage.getName());
  console.log(stage.getSteps());
});

// Move to next stage
await formContext.data.process.moveNext();

// Move to previous stage
await formContext.data.process.movePrevious();
```

## 🌍 Multi-language Support

```javascript
// Get user language
const languageCode = Xrm.Utility.getGlobalContext().userSettings.languageId;

// Resource strings (if available)
const localizedString = Xrm.Utility.getResourceString('ResourceName');

// Format numbers based on user locale
const formattedNumber = new Intl.NumberFormat(navigator.language, {
  style: 'currency',
  currency: 'USD'
}).format(1234.56);
```

## ⚠️ Error Handling Patterns

```javascript
// API error handling
try {
  const result = await Xrm.WebApi.retrieveRecord('contact', recordId);
} catch (error) {
  if (error.errorCode === -2147220969) {
    // Record not found
    console.log('Record does not exist');
  } else if (error.errorCode === -2147220960) {
    // Access denied
    console.log('Insufficient privileges');
  } else {
    // Other error
    console.error('API Error:', error.message);
  }
}

// Form context validation
function validateFormContext() {
  if (!Xrm || !Xrm.Page) {
    throw new Error('This command must be run from a Dynamics 365 form');
  }

  const recordId = Xrm.Page.data.entity.getId();
  if (!recordId) {
    throw new Error('Please save the record before running this command');
  }

  return Xrm.Page;
}
```

## 🔧 Common Utility Functions

```javascript
// GUID validation
function isValidGuid(guid) {
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return guidRegex.test(guid);
}

// Clean GUID (remove braces)
function cleanGuid(guid) {
  return guid.replace(/[{}]/g, '');
}

// Format entity reference for WebAPI
function formatEntityReference(entityType, id, name) {
  return {
    [`${entityType}@odata.bind`]: `/${entityType}s(${cleanGuid(id)})`
  };
}

// Batch multiple API calls
async function batchOperations(operations) {
  const batchId = 'batch_' + new Date().getTime();
  // Implementation depends on specific batching requirements
}
```

---

This API reference covers the most commonly used functions and patterns. Always refer to the official Microsoft documentation for the most up-to-date information.
