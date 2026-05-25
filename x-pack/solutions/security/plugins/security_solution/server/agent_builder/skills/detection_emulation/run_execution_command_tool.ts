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

const EXECUTION_FAMILY_CONFIG: FamilyToolConfig = {
  family: 'execution',
  id: 'security.detection-emulation.run-execution-command',
  commands: ['execute', 'runscript', 'cancel'],
  description: `Run an *execution-family* response action against one or more endpoints.

Covers: \`execute\`, \`runscript\`, \`cancel\`.

This is the highest-impact family — \`execute\` and \`runscript\` run arbitrary code on
the target endpoint. The schema validates strictly on the server side so wrong
types or extra keys fail fast before reaching the EDR connector.

**Security gates** (in order; first failure short-circuits):
1. Real-execution feature flag must be enabled
2. Per-command RBAC privilege check (\`execute\`/\`runscript\` require elevated privilege)
3. Host allowlist
4. Per-space rate limit (atomic acquire)
5. Authenticated caller required

Use this tool when the user wants to run a shell command, run a script-library entry,
or cancel a previously-dispatched response action.

**Confirmation:** the agent-builder framework prompts the user once per
conversation before the first invocation. \`execute\` and \`runscript\` render
a destructive (red) confirm button; \`cancel\` is treated as recoverable. If
the user declines, do NOT retry; surface the cancellation and continue with
unrelated work.`,
  commandFieldDescription: `Execution-family command (HIGHEST IMPACT — runs arbitrary code on the endpoint):
- \`execute\` — \`{ command: string, timeout?: number }\` — run a shell command/executable
- \`runscript\` — \`{ scriptId: string, scriptInput?: string, timeout?: number }\` — run a script-library entry
- \`cancel\` — \`{ id: string }\` — cancel a previously-dispatched response action by id

Every command in this family ALSO accepts an optional \`comment: string\` in \`parameters\` — recorded against the response-action audit trail. Strongly recommended for \`execute\` and \`runscript\` so an auditor can see *why* the code ran (e.g. \`{ command: 'whoami', comment: 'verify hostname for rule X validation' }\`).`,
};

export type RunExecutionCommandToolDeps = RunFamilyCommandToolDeps;

export const createRunExecutionCommandTool = (deps: RunExecutionCommandToolDeps) =>
  createRunFamilyCommandTool(EXECUTION_FAMILY_CONFIG, deps);
