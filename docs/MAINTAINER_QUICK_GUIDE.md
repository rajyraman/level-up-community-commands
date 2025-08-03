# Maintainer Quick Actions

As a maintainer, you can use these labels to override the automated approval system:

## 🏷️ Override Labels

### Standard Manual Approval
**Label:** `maintainer-approved`
**Use for:** Quality collections with minor automated validation issues

### Emergency Override
**Label:** `force-approve`
**Use for:** Critical fixes or trusted contributors requiring immediate approval

## 🔍 Review Checklist

Before adding override labels, verify:

- [ ] **Code Quality**: JavaScript code is well-written and follows best practices
- [ ] **Security**: No obvious security vulnerabilities or malicious patterns
- [ ] **Functionality**: Commands appear to work as described
- [ ] **Documentation**: Adequate description and usage instructions
- [ ] **Username**: Valid GitHub username in contact-info field
- [ ] **JSON Format**: Valid Level Up commands JSON structure

## 🚀 Quick Override Process

1. **Review the collection** in the GitHub issue
2. **Check code quality** and security manually
3. **Add appropriate label**:
   - Normal cases: `maintainer-approved`
   - Urgent cases: `force-approve`
4. **Add comment** explaining override reason (optional but recommended)
5. **Wait for processing** (1-2 minutes)
6. **Verify deployment** on GitHub Pages

## 📋 Override Reasons

Common scenarios for maintainer override:

- **False Positives**: Automated system flagged safe code
- **Trusted Contributors**: Long-time community members
- **Minor Issues**: Small problems that don't affect functionality
- **Time-Sensitive**: Critical bug fixes or urgent requests
- **Edge Cases**: Unusual but legitimate code patterns

## ⚠️ Important Notes

- **Only admin/write users** can trigger overrides
- **All overrides are logged** with full audit trail
- **Use sparingly** - reserve for legitimate cases
- **Public record** - override comments are visible to all
- **Review carefully** - you're responsible for approved code

## 🔗 Documentation

- [Full Maintainer Override Guide](MAINTAINER_OVERRIDE.md)
- [Automation System Overview](AUTOMATION_SYSTEM.md)
- [Security Analysis Details](AUTOMATED_PROCESSING.md)
