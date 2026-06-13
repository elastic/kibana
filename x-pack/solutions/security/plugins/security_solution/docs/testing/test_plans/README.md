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
- [Test plans for prebuilt rules](./detection_response/prebuilt_rules/prebuilt_rules.md).

Feel free to tune the structure whenever it makes sense and improves readability or maintainability of your plan: add more sections to `Useful info`, add more top-level sections in addition to `Useful info` and `Scenarios`, etc.

## Authoring a test plan with the generator skill

Test plans can also be auto-generated from a GitHub issue using the `test-plan-generator` agent skill — it reads the issue, its parent epic, all sub-issues, linked PRs, and Figma designs, then drafts a structured plan you can review and publish as a GitHub comment.

- End-user setup, daily usage, and troubleshooting: [`test_plan_generator.md`](./test_plan_generator.md).
- Skill source (agent instructions and references): [`../../../.agents/skills/test-plan-generator/`](../../../.agents/skills/test-plan-generator/).
