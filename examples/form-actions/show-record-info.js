// Command Name: Show Record Information
// Description: Display detailed information about the current record
// Category: form-actions
// Author: Level Up Community
// Version: 1.0.0

/**
 * Shows comprehensive information about the current record including:
 * - Entity details (name, ID, state)
 * - Timestamps (created, modified)
 * - User information (owner, created by, modified by)
 * - Form state (dirty status, required fields)
 */
(async function () {
  'use strict';

  try {
    // Validate environment
    if (!Xrm || !Xrm.Page) {
      throw new Error('This command must be run from a Dynamics 365 form');
    }

    const formContext = Xrm.Page;
    const entity = formContext.data.entity;

    // Get basic entity information
    const entityName = entity.getEntityName();
    const recordId = entity.getId();

    if (!recordId) {
      Xrm.Navigation.openAlertDialog({
        title: 'Record Information',
        text: 'This is a new record that has not been saved yet.\n\nEntity Type: ' + entityName
      });
      return;
    }

    // Show loading indicator
    Xrm.Utility.showProgressIndicator('Gathering record information...');

    try {
      // Retrieve detailed record information
      const record = await Xrm.WebApi.retrieveRecord(
        entityName,
        recordId,
        '?$select=createdon,createdby,modifiedon,modifiedby,ownerid,statecode,statuscode'
      );

      // Get user context
      const userContext = Xrm.Utility.getGlobalContext().userSettings;

      // Format dates for display
      const formatDate = dateString => {
        if (!dateString) return 'Not available';
        const date = new Date(dateString);
        return date.toLocaleString();
      };

      // Get form state information
      const isDirty = entity.getIsDirty();
      const primaryAttribute = entity.getPrimaryAttributeValue();

      // Count required fields that are empty
      let emptyRequiredFields = 0;
      let totalRequiredFields = 0;

      formContext.data.entity.attributes.forEach(function (attribute) {
        if (attribute.getRequiredLevel() === 'required') {
          totalRequiredFields++;
          if (!attribute.getValue()) {
            emptyRequiredFields++;
          }
        }
      });

      // Build information display
      const recordInfo = `
📋 RECORD DETAILS
Entity: ${entityName}
Record ID: ${recordId}
Primary Name: ${primaryAttribute || 'Not available'}

📅 TIMESTAMPS
Created: ${formatDate(record.createdon)}
Modified: ${formatDate(record.modifiedon)}

👤 USERS
Current User: ${userContext.userName}
Created By: ${record._createdby_value ? 'User ID: ' + record._createdby_value : 'Not available'}
Modified By: ${record._modifiedby_value ? 'User ID: ' + record._modifiedby_value : 'Not available'}
Owner: ${record._ownerid_value ? 'User ID: ' + record._ownerid_value : 'Not available'}

🔧 FORM STATE
Has Unsaved Changes: ${isDirty ? 'Yes' : 'No'}
Required Fields: ${totalRequiredFields - emptyRequiredFields}/${totalRequiredFields} completed
State Code: ${record.statecode !== undefined ? record.statecode : 'Not available'}
Status Code: ${record.statuscode !== undefined ? record.statuscode : 'Not available'}

🌐 ENVIRONMENT
Organization: ${Xrm.Utility.getGlobalContext().organizationSettings.friendlyName}
Client: ${Xrm.Utility.getGlobalContext().client.getClient()}
Version: ${Xrm.Utility.getGlobalContext().getVersion()}
      `.trim();

      // Hide loading indicator
      Xrm.Utility.closeProgressIndicator();

      // Display the information
      await Xrm.Navigation.openAlertDialog({
        title: 'Record Information',
        text: recordInfo
      });
    } catch (retrieveError) {
      Xrm.Utility.closeProgressIndicator();

      // If we can't retrieve the record, show basic form information
      const basicInfo = `
📋 BASIC RECORD DETAILS
Entity: ${entityName}
Record ID: ${recordId}
Primary Name: ${entity.getPrimaryAttributeValue() || 'Not available'}

🔧 FORM STATE
Has Unsaved Changes: ${entity.getIsDirty() ? 'Yes' : 'No'}
Last Modified: ${entity.getLastModifiedTime() ? entity.getLastModifiedTime().toLocaleString() : 'Not available'}

⚠️ Note: Could not retrieve full record details. This may be due to insufficient permissions or the record being in a special state.

Error Details: ${retrieveError.message}
      `.trim();

      await Xrm.Navigation.openAlertDialog({
        title: 'Record Information (Limited)',
        text: basicInfo
      });
    }
  } catch (error) {
    // Hide loading indicator if it's showing
    Xrm.Utility.closeProgressIndicator();

    console.error('Show Record Information command failed:', error);

    await Xrm.Navigation.openErrorDialog({
      title: 'Command Error',
      message: 'Failed to retrieve record information: ' + error.message
    });
  }
})();
