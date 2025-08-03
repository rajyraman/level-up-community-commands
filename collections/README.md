# Level Up Community Collections

This directory contains all the auto-approved command collections submitted by the community.

## Structure

```
collections/
├── index.json              # Main collections index
├── {username}/             # User-specific folders
│   ├── profile.json        # User profile information
│   ├── collections/        # User's collections
│   │   ├── {collection}.json
│   │   └── {collection}-levelup.json
│   └── commands/           # Individual command files
│       ├── {command1}.js
│       └── {command2}.js
└── README.md              # This file
```

## Usage

### For Users
1. Browse collections at https://rajyraman.github.io/level-up-community-commands/
2. Click "Copy Commands" to copy the collection JSON to clipboard
3. Import the JSON into Level Up extension

### For Contributors
1. Submit collections using the GitHub issue template
2. Once auto-approved, collections will appear in your user folder
3. Your profile will be automatically updated with badges and stats

## Auto-Approval Process

Collections go through comprehensive automated security validation with dual-analysis approach:
- ✅ **CodeQL Analysis**: Industry-standard static security analysis with 500+ rules
- ✅ **AI Security Validation**: Advanced pattern detection using GitHub Models (GPT-4o-mini)
- ✅ **Username Validation**: GitHub username verification and user existence check
- ✅ **Code Quality**: Best practices validation and formatting checks

**Approval Strategy**: Either analysis can approve, both provide comprehensive coverage:
- **CodeQL**: Deterministic rule-based analysis (fast, precise)
- **AI**: Context-aware pattern detection (adaptive, intelligent)
- **Auto-Approval**: Collections passing either analysis with 80+ score and no critical issues
- **Maintainer Override**: Repository maintainers can manually approve collections using labels

### 🔑 Maintainer Override

Repository maintainers can bypass automated validation using labels:
- **`maintainer-approved`**: Standard manual approval for quality collections with minor issues
- **`force-approve`**: Emergency override for critical fixes or trusted contributors

*Maintainer overrides are tracked with full audit trails and require admin/write repository permissions.*

## Collection Format

Each collection includes:
- **Metadata**: Name, description, category, tags, author
- **Commands**: Individual command objects with code
- **Documentation**: Usage instructions, prerequisites, limitations
- **Stats**: Download count, ratings, votes (when implemented)

## Contributing

To contribute a collection:
1. Use the [Share Command Collection](https://github.com/rajyraman/level-up-community-commands/issues/new?template=share-command-collection.yml) template
2. Fill in all required fields including your GitHub username
3. Paste your commands JSON export from Level Up
4. Submit the issue and wait for automated processing

## Support

If you have issues with the automated system:
- Check that your GitHub username is correct
- Ensure your commands JSON is valid
- Review security feedback if auto-approval fails
- Contact maintainers for manual review if needed
- Maintainers can use `maintainer-approved` or `force-approve` labels for overrides

For maintainers: See [Maintainer Override Documentation](../docs/MAINTAINER_OVERRIDE.md) for detailed override procedures.

---

🚀 **Happy commanding!** - The Level Up Community
