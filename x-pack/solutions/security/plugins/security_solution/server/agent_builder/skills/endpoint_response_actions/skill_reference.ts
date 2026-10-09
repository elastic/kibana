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
| No enrolled Elastic Defend endpoints | \`list_endpoints\` without \`hostNameFilter\` returns an empty \`endpoints\` list | Report that no Elastic Defend endpoints are visible in this space; do not infer that other response-action agents are absent |
| No endpoints match the filter | \`list_endpoints\` with \`hostNameFilter\` returns an empty \`endpoints\` list | Report that no endpoints match that hostname fragment (the match is case-sensitive); do not claim the space has no endpoints |
| Host not found | \`found: false\`, \`reason: endpoint_not_found\` (+ \`hostName\` or \`agentId\`, whichever was looked up) | Ask analyst to clarify that hostname or agent ID; do not guess, and do not report any status or isolation state |
| \`status: 'unknown'\` | \`host_status\` not yet in metadata | Report the state is unknown; do not call it offline |
| Hostname matches several endpoints | \`found: false\`, \`reason: ambiguous_hostname\` (+ \`candidates\`) | Ask analyst which agent ID they mean, then re-call \`get_endpoint_status\` with \`agentId\` |
| Action not found | \`found: false\`, \`reason: action_not_found\` | Ask analyst to verify the action ID from Response Actions history |
| Action still pending | \`status: pending\` + action ID | Report it is still in flight; offer to re-check with \`get_response_action_status\` |
| Action expired | \`status: failed\` + \`isExpired: true\` | Report that the action expired before the host responded, not that the command failed; direct the analyst to re-issue it from the Response Actions UI |
| Insufficient privileges | \`error: insufficient_privileges\` | Tell analyst which privilege is missing; suggest Security UI |
| Page out of range | \`error: invalid_argument\` | Narrow the request with \`hostNameFilter\` instead of paging further |
| Unexpected failure | \`error: unknown_error\` | Report the message; do not retry blindly |

## Bounded Fields in \`get_response_action_status\`

Large fan-out actions are summarized, and each summary reports what it dropped. Counters are scoped to the field they describe:

| Field | Counters |
|-------|----------|
| \`hosts\` | \`totalHosts\`, \`hostsTruncated\` |
| \`agentState\` | \`agentStateTotal\`, \`agentStateTruncated\`, \`agentStateTruncatedByBudget\`, \`agentStateRetainedOverBudget\` |
| \`outputs\` | \`outputs.totalAgents\`, \`outputs.agentsTruncated\`, \`outputs.summaryTruncated\`, \`outputs.retainedOverBudget\` |
| \`errors\` | \`totalErrors\`, \`errorsTruncated\` |

When a counter shows dropped items, say that only a sample is shown and give the total; do not describe the sample as the full set.

## Best Practices

- When the analyst asks which hosts are available, call \`list_endpoints\` first.
- Before isolate or release, call \`get_endpoint_status\` to confirm identity and current isolation state.
- Always surface the action ID from write tools — it is the audit anchor in Response Actions history.
- For follow-up on a prior action ("what happened to scan X?"), use \`get_response_action_status\` with the action ID.
- For this skill's status and response action lookups, use \`list_endpoints\`, \`get_endpoint_status\`, and \`get_response_action_status\` instead of \`platform.core.search\` or raw Elasticsearch queries. Other skills' diagnostic queries are unaffected.

## Scope (Slice 1)

Supported: list endpoints, isolate, release, host status, running processes, malware scan, action status lookup.

Not supported yet: execute, kill-process, suspend-process, get-file, upload, runscript, memory-dump. Do not attempt these.`;
