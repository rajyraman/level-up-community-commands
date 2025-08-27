# Security Guidelines

Security is our top priority when it comes to community commands. This document outlines our security practices and guidelines.

## 🛡️ Security Review Process

All submitted commands undergo thorough security review:

### 1. Automated Scanning

- Static code analysis for common vulnerabilities
- Dependency scanning (if applicable)
- Pattern matching for sensitive data

### 2. Manual Review

- Code review by maintainers
- Security-focused testing
- Risk assessment evaluation

### 3. Community Testing

- Beta testing by trusted community members
- Security feedback from reviewers
- Real-world usage validation

## 🚨 Security Requirements

### Prohibited Content

Commands must NOT contain:

- **Credentials**: Passwords, API keys, tokens, connection strings
- **Personal Information**: Names, emails, phone numbers, addresses
- **URLs**: Hardcoded production URLs, internal systems
- **System Information**: Server names, database connections
- **Malicious Code**: Harmful operations, data theft, system compromise

### Required Practices

Commands must:

- **Validate Inputs**: Check and sanitize user inputs
- **Handle Errors**: Gracefully handle errors and exceptions
- **Confirm Actions**: Ask for confirmation before destructive operations
- **Minimize Scope**: Use least privilege principle
- **Document Risks**: Clearly document any potential risks

## 🔍 Code Review Checklist

### Data Handling

- [ ] No hardcoded sensitive data
- [ ] Input validation implemented
- [ ] Output sanitization applied
- [ ] No unauthorized data access

### Operations

- [ ] No destructive operations without confirmation
- [ ] Appropriate error handling
- [ ] No unauthorized system modifications
- [ ] Safe API usage patterns

### External Communication

- [ ] No unauthorized external requests
- [ ] Safe URL construction
- [ ] Proper authentication handling
- [ ] No data leakage in requests

## 🚩 Red Flags

Commands will be rejected if they contain:

### Immediate Rejection

- Hardcoded credentials or sensitive data
- Malicious or harmful operations
- Code obfuscation or encryption
- Unauthorized data exfiltration
- Security bypasses or exploits

### Requires Modification

- Missing input validation
- Insufficient error handling
- Unclear security implications
- Overly broad permissions
- Unsafe external requests

## 📋 Security Testing

### Manual Testing

Reviewers test for:

- Input validation effectiveness
- Error handling robustness
- Permission requirements
- Data access patterns
- External communication safety

### Automated Testing

Automated tools check for:

- Common vulnerability patterns
- Sensitive data patterns
- Unsafe function usage
- Security anti-patterns
- Code quality issues

## 🔐 Best Practices for Contributors

### Writing Secure Commands

1. **Input Validation**

   ```javascript
   // Good: Validate inputs
   if (!recordId || typeof recordId !== 'string') {
     throw new Error('Invalid record ID');
   }

   // Bad: No validation
   const url = `/api/data/v9.0/contacts(${recordId})`;
   ```

2. **Error Handling**

   ```javascript
   // Good: Proper error handling
   try {
     const result = await Xrm.WebApi.retrieveRecord('contact', recordId);
     return result;
   } catch (error) {
     console.error('Failed to retrieve contact:', error);
     throw new Error('Unable to retrieve contact data');
   }

   // Bad: No error handling
   const result = await Xrm.WebApi.retrieveRecord('contact', recordId);
   ```

3. **User Confirmation**

   ```javascript
   // Good: Confirm destructive actions
   const confirmed = await Xrm.Navigation.openConfirmDialog({
     title: 'Delete Record',
     text: 'Are you sure you want to delete this record?'
   });

   if (confirmed.confirmed) {
     // Proceed with deletion
   }
   ```

4. **Safe URL Construction**

   ```javascript
   // Good: Safe URL construction
   const baseUrl = Xrm.Utility.getGlobalContext().getClientUrl();
   const url = `${baseUrl}/main.aspx?etc=${entityTypeCode}`;

   // Bad: Hardcoded URLs
   const url = 'https://myorg.crm.dynamics.com/main.aspx';
   ```

### Data Protection

- **Minimize Data Access**: Only access data you need
- **Don't Store Sensitive Data**: Avoid storing credentials or personal info
- **Use Proper APIs**: Use official Dynamics 365 APIs
- **Respect Permissions**: Don't bypass security restrictions

## 📞 Reporting Security Issues

### For Community Commands

If you find a security issue in a community command:

1. **Don't Post Publicly**: Don't create a public issue
2. **Contact Maintainers**: Email maintainers directly
3. **Provide Details**: Include clear reproduction steps
4. **Be Patient**: Allow time for investigation and fixes

### For the Extension

For Level Up extension security issues:

- Report to the [main repository](https://github.com/rajyraman/level-up-vnext)
- Follow their security reporting process

## 🔒 Data Privacy

### Personal Information

- Commands should not collect personal information
- Avoid logging sensitive data
- Respect user privacy preferences
- Follow applicable privacy laws

### Usage Analytics

- Commands should not track user behavior
- No unauthorized telemetry collection
- Respect organization data policies
- Be transparent about any data usage

### Microsoft Compliance

- Follow Microsoft security best practices
- Comply with Dynamics 365 terms of service
- Respect Microsoft's security boundaries
- Use supported APIs and methods

---

**Remember: Security is everyone's responsibility. When in doubt, ask for guidance!**
