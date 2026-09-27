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
| No enrolled endpoints | \`list_endpoints\` returns an empty \`endpoints\` list | Report that no response-action-capable endpoints are enrolled |
| Host not found | \`found: false\`, \`reason: endpoint_not_found\` | Ask analyst to clarify hostname; do not guess |
| Hostname matches several endpoints | \`found: false\`, \`reason: ambiguous_hostname\` (+ \`candidates\`) | Ask analyst which agent ID they mean, then re-call \`get_endpoint_status\` with \`agentId\` |
| Action not found | \`found: false\`, \`reason: action_not_found\` | Ask analyst to verify the action ID from Response Actions history |
| Action still pending | \`status: pending\` + action ID | Report it is still in flight; offer to re-check with \`get_response_action_status\` |
| Insufficient privileges | \`error: insufficient_privileges\` | Tell analyst which privilege is missing; suggest Security UI |
| Unexpected failure | \`error: unknown_error\` | Report the message; do not retry blindly |

## Best Practices

- When the analyst asks which hosts are available, call \`list_endpoints\` first.
- To confirm a host's identity and current isolation state, call \`get_endpoint_status\`.
- For follow-up on a prior action ("what happened to scan X?"), use \`get_response_action_status\` with the action ID.
- Do **not** use \`platform.core.search\` or raw Elasticsearch queries for endpoint or response action state.

## Scope

This skill is **read-only** and currently covers: list endpoints, host status, response action status lookup.

Not available from chat: isolate, release/unisolate, scan, running processes, execute, kill-process, suspend-process, get-file, upload, runscript, memory-dump. Do not attempt these with this skill or any other tool — direct the analyst to the Response Actions UI instead.`;
