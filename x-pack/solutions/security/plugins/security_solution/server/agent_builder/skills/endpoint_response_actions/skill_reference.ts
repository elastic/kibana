/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detailed reference material for the Endpoint Response Actions skill.
 * Loaded via `referencedContent` so the primary SKILL.md body stays short
 * enough for reliable skill selection on smaller models.
 */
export const ENDPOINT_RESPONSE_ACTIONS_REFERENCE = `## Error Handling Reference

| Scenario | Tool signal | Agent response |
|----------|-------------|----------------|
| No enrolled endpoints | \`list_endpoints\` returns empty list | Report that no response-action-capable endpoints are enrolled |
| Host not found | \`found: false\`, \`reason: endpoint_not_found\` | Ask analyst to clarify hostname; do not guess |
| Already isolated / already released | \`get_endpoint_status\` shows current state | Report current isolation state before re-dispatching |
| Action still pending | \`status: pending\` + action ID | Offer to re-check with \`get_response_action_status\` |
| Action failed | \`status: failed\` + error output | Report error message and action ID for manual follow-up |
| Action not found | \`error: action_not_found\` | Ask analyst to verify the action ID from Response Actions history |
| Insufficient privileges | \`error: insufficient_privileges\` | Tell analyst which privilege is missing; suggest Security UI |
| Unexpected failure | \`error: unknown_error\` | Report the message; do not retry blindly |

## Best Practices

- When the analyst asks which hosts are available, call \`list_endpoints\` first.
- Before isolate or release, call \`get_endpoint_status\` to confirm identity and current isolation state.
- Always surface the action ID from write tools — it is the audit anchor in Response Actions history.
- For follow-up on a prior action ("what happened to scan X?"), use \`get_response_action_status\` with the action ID.
- Do **not** use \`platform.core.search\` or raw Elasticsearch queries for response action status.

## Scope (Slice 1)

Supported: list endpoints, isolate, release, host status, running processes, malware scan, action status lookup.

Not supported yet: execute, kill-process, suspend-process, get-file, upload, runscript, memory-dump. Do not attempt these.`;
