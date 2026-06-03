/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createRunFamilyCommandTool,
  type FamilyToolConfig,
  type RunFamilyCommandToolDeps,
} from './create_run_family_command_tool';

const NETWORK_FAMILY_CONFIG: FamilyToolConfig = {
  family: 'network',
  id: 'security.detection-emulation.run-network-command',
  commands: ['isolate', 'unisolate'],
  description: `Run a *network-family* response action against one or more endpoints.

Covers: \`isolate\`, \`unisolate\`.

These are containment commands — they take only an optional \`comment\` and act on
the endpoint as a whole. \`isolate\` blocks inbound/outbound traffic (except Elastic
Defend management); \`unisolate\` restores normal traffic flow.

**Security gates** (in order; first failure short-circuits):
1. Real-execution feature flag must be enabled
2. Per-command RBAC privilege check
3. Host allowlist
4. Per-space rate limit (atomic acquire)
5. Authenticated caller required

Use this tool when the user wants to network-isolate (or release) one or more
endpoints during incident response or attack containment emulation.

**Confirmation:** the agent-builder framework prompts the user once per
conversation before the first invocation. If the user declines, do NOT
retry the same operation; surface the cancellation and continue with
unrelated work.`,
  commandFieldDescription: `Network-family command:
- \`isolate\` — block inbound/outbound traffic on the endpoint(s) (Elastic Defend management connection still allowed)
- \`unisolate\` — release the endpoint(s) from network isolation
Both accept only an optional \`{ comment: string }\` recorded against the response action.`,
};

export type RunNetworkCommandToolDeps = RunFamilyCommandToolDeps;

export const createRunNetworkCommandTool = (deps: RunNetworkCommandToolDeps) =>
  createRunFamilyCommandTool(NETWORK_FAMILY_CONFIG, deps);
