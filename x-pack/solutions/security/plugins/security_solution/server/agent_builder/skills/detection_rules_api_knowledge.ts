/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared knowledge for skills that need to query Security detection rules.
 * Imported as referencedContent by any skill that reads detection rules.
 */
export const DETECTION_RULES_API_KNOWLEDGE = `# Detection Rules — API Reference

## Endpoints

### Find rules
\`GET /api/detection_engine/rules/_find\`

Query parameters:
| Parameter | Type | Description |
|---|---|---|
| \`filter\` | string | KQL filter string |
| \`sort_field\` | string | Field to sort by: \`name\`, \`created_at\`, \`updated_at\`, \`enabled\`, \`risk_score\`, \`severity\` |
| \`sort_order\` | \`asc\` \| \`desc\` | Sort direction (default: \`desc\`) |
| \`page\` | number | Page number (default: 1) |
| \`per_page\` | number | Results per page, max 100 (default: 20) |

Response shape:
\`\`\`json
{
  "page": 1,
  "perPage": 20,
  "total": 42,
  "data": [
    {
      "id": "<saved-object-uuid>",
      "rule_id": "<static-rule-id>",
      "name": "Rule name",
      "enabled": true,
      "severity": "critical",
      "risk_score": 85,
      "type": "query",
      "tags": ["MITRE", "T1059"],
      "updated_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
\`\`\`

\`id\` is the Saved Object UUID and equals \`kibana.alert.rule.uuid\` on alerts.
\`rule_id\` is the static identifier that survives rule reinstalls.

### List all tags
\`GET /api/detection_engine/tags\`

No parameters. Returns a flat array of all unique tag strings across all rules:
\`\`\`json
["MITRE", "T1059", "Endpoint", "Custom", ...]
\`\`\`

Use this for tag discovery before filtering by tag.

## Step syntax

Both endpoints are called with \`kibana.request\`. Pass the step YAML to \`workflow_execute_step\`:

\`\`\`yaml
steps:
  - name: find_rules
    type: kibana.request
    with:
      method: GET
      path: /api/detection_engine/rules/_find
      query:
        filter: "alert.attributes.name: *PowerShell*"
        sort_field: risk_score
        sort_order: desc
        per_page: 20
\`\`\`

\`\`\`yaml
steps:
  - name: discover_tags
    type: kibana.request
    with:
      method: GET
      path: /api/detection_engine/tags
\`\`\`

## KQL filter patterns

The \`filter\` parameter accepts KQL against the rule's saved-object attributes:

| Intent | KQL |
|---|---|
| Enabled rules | \`alert.attributes.enabled: true\` |
| Disabled rules | \`alert.attributes.enabled: false\` |
| Severity | \`alert.attributes.params.severity: "critical"\` |
| Rule type | \`alert.attributes.params.type: "eql"\` |
| Tag | \`alert.attributes.tags: "MITRE"\` |
| MITRE technique | \`alert.attributes.params.threat.technique.id: "T1059"\` |
| MITRE tactic | \`alert.attributes.params.threat.tactic.id: "TA0002"\` |
| Name substring | \`alert.attributes.name: *PowerShell*\` |
| Risk score range | \`alert.attributes.params.risk_score >= 70\` |
| Prebuilt rules | \`alert.attributes.params.immutable: true\` |
| Custom rules | \`alert.attributes.params.immutable: false\` |
| Lookup by SO UUID | \`alert.id: "alert:<uuid>"\` |

Combine with \`AND\` / \`OR\` / \`NOT\` and parentheses as needed.

## UUID lookup (alert → rule)

To resolve a \`kibana.alert.rule.uuid\` from an alert into rule metadata:

\`\`\`yaml
steps:
  - name: resolve_rule
    type: kibana.request
    with:
      method: GET
      path: /api/detection_engine/rules/_find
      query:
        filter: "alert.id: \\"alert:<kibana.alert.rule.uuid>\\""
        per_page: 1
\`\`\`
`;

