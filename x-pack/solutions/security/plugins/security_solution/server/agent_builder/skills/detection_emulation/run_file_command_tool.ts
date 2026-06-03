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

const FILE_FAMILY_CONFIG: FamilyToolConfig = {
  family: 'file',
  id: 'security.detection-emulation.run-file-command',
  commands: ['get-file', 'scan', 'upload'],
  description: `Run a *file-family* response action against one or more endpoints.

Covers: \`get-file\`, \`scan\`, \`upload\`.

Each command has a *typed* parameter shape — the schema validates strictly on
the server side so wrong types or extra keys fail fast before reaching the EDR
connector.

**Security gates** (in order; first failure short-circuits):
1. Real-execution feature flag must be enabled
2. Per-command RBAC privilege check
3. Host allowlist
4. Per-space rate limit (atomic acquire)
5. Authenticated caller required

Use this tool when the user wants to retrieve a file, trigger a malware scan, or
upload a file to a target endpoint.

**Confirmation:** the agent-builder framework prompts the user once per
conversation before the first invocation. If the user declines, do NOT
retry the same operation; surface the cancellation and continue with
unrelated work.`,
  commandFieldDescription: `File-family command:
- \`get-file\` — \`{ path: string }\` — retrieve a file from the endpoint
- \`scan\` — \`{ path: string }\` — trigger a malware scan on the supplied path
- \`upload\` — \`{ file: opaque, overwrite?: boolean }\` — upload a file to the endpoint (multipart-style; not yet wired through the route)

Every command in this family ALSO accepts an optional \`comment: string\` in \`parameters\` — recorded against the response-action audit trail.`,
};

export type RunFileCommandToolDeps = RunFamilyCommandToolDeps;

export const createRunFileCommandTool = (deps: RunFileCommandToolDeps) =>
  createRunFamilyCommandTool(FILE_FAMILY_CONFIG, deps);
