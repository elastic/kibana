/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

// Stub: the real skills implementation lands in a later PR in the stack. PR2's
// plugin scaffold imports `registerSkills` so plugin.ts can type-check and run
// FF-off safely; this no-op never registers a skill. The option types mirror
// the real `register_skills.ts` contract (a sibling file that shadows this stub
// once added later in the stack) so the byte-identical plugin.ts type-checks
// here without pulling the skills feature backward into PR2.

// Mirrors `workflowsManagementApi.getWorkflowExecution`; plugin.ts constructs
// this from that API. Return type is kept permissive so the real impl can
// refine it without breaking this stub contract.
interface WorkflowExecutionLookup {
  getWorkflowExecution: (
    executionId: string,
    spaceId: string,
    options?: { includeInput?: boolean; includeOutput?: boolean }
  ) => Promise<unknown>;
}

type WorkflowFetcher = unknown;

interface RunAttackDiscoveryToolDeps {
  [key: string]: unknown;
}

interface RegisterSkillsOptions {
  getEventLogIndex?: () => Promise<string>;
  runAttackDiscoveryToolDeps?: RunAttackDiscoveryToolDeps;
  workflowExecutionLookup?: WorkflowExecutionLookup;
  workflowFetcher?: WorkflowFetcher;
}

export const registerSkills = async (
  _agentBuilder: unknown,
  _logger: Logger,
  _options?: RegisterSkillsOptions
): Promise<void> => {
  // no-op stub; replaced by the real implementation in a later PR
};
