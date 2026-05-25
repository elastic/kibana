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

const PROCESS_FAMILY_CONFIG: FamilyToolConfig = {
  family: 'process',
  id: 'security.detection-emulation.run-process-command',
  commands: ['kill-process', 'suspend-process', 'running-processes', 'memory-dump'],
  description: `Run a *process-family* response action against one or more endpoints.

Covers: \`kill-process\`, \`suspend-process\`, \`running-processes\`, \`memory-dump\`.

Each command has a *typed* parameter shape — the schema validates strictly on the
server side so misspelled fields (\`entityId\` instead of \`entity_id\`, extra keys,
wrong types) fail fast before reaching the EDR connector.

**Security gates** (in order; first failure short-circuits):
1. Real-execution feature flag must be enabled
2. Per-command RBAC privilege check
3. Host allowlist
4. Per-space rate limit (atomic acquire)
5. Authenticated caller required

Use this tool when the user wants to enumerate, terminate, suspend, or dump memory
for processes on a target endpoint.

**Confirmation:** the agent-builder framework prompts the user once per
conversation before the first invocation. If the user declines, do NOT
retry the same operation; surface the cancellation and continue with
unrelated work.`,
  commandFieldDescription: `Process-family command:
- \`kill-process\` — terminate by \`{ pid: number }\` *or* \`{ entity_id: string }\`
- \`suspend-process\` — pause by \`{ pid: number }\` *or* \`{ entity_id: string }\`
- \`running-processes\` — list (no required parameters)
- \`memory-dump\` — \`{ type: 'kernel' }\` *or* \`{ type: 'process', pid: number }\` *or* \`{ type: 'process', entity_id: string }\`

Every command in this family ALSO accepts an optional \`comment: string\` in \`parameters\` — recorded against the response-action audit trail. Use it when running on behalf of a human operator (e.g. \`{ comment: 'sweep for rogue PowerShell' }\`).`,
};

export type RunProcessCommandToolDeps = RunFamilyCommandToolDeps;

export const createRunProcessCommandTool = (deps: RunProcessCommandToolDeps) =>
  createRunFamilyCommandTool(PROCESS_FAMILY_CONFIG, deps);
