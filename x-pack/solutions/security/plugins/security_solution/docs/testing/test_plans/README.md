# Test Plans

This folder contains test plans for the features of Security Solution.

## Folder structure

The folder is first split into major Security Solution domains:

- `detection_response`
- `threat_hunting`
- etc

And then each major domain is split into subdomains, for example:

- `detection_response`
  - `prebuilt_rules`
  - `rule_exceptions`
  - `rule_management`
  - `rule_monitoring`
  - etc
- `threat_hunting`
  - `explore`
  - `timelines`
  - etc

Within each subdomain, you can organize test plans as you like, for example:

- you might want to have a folder per feature, if your features are large and you have multiple test plans per feature
- or you might want to have a plain list of test plans if features are relatively small

## Folder ownership

Each subdomain folder should be owned by a single GitHub team in the `.github/CODEOWNERS` file.

## Test plan structure

Some examples for reference:

- [Test plan template](./test_plan_template.md).
- [Installation and Upgrade of Prebuilt Rules](./detection_response/prebuilt_rules/installation_and_upgrade.md).

Feel free to tune the structure whenever it makes sense and improves readability or maintainability of your plan: add more sections to `Useful info`, add more top-level sections in addition to `Useful info` and `Scenarios`, etc.
