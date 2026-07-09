/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

// Stub: the real Attack Discovery agent-builder skill registration is added by
// a later PR in the stack (PR8 — Skills). Earlier PRs need `registerSkills` to
// exist with a compatible signature so the plugin `setup` type-checks FF-off.
// This is a no-op; the discoveries plugin is FF-gated upstream and the real
// skills are registered by PR8. The `options` shape mirrors PR8's
// `RegisterSkillsOptions` (only what earlier-PR callers pass) so the call site's
// inline `workflowExecutionLookup.getWorkflowExecution` callback types resolve.
interface WorkflowExecutionLookup {
  getWorkflowExecution: (
    executionId: string,
    spaceId: string,
    options?: { includeInput?: boolean; includeOutput?: boolean }
  ) => Promise<unknown>;
}

interface RegisterSkillsOptions {
  getEventLogIndex?: () => Promise<string>;
  getStartServices?: () => Promise<unknown>;
  runAttackDiscoveryToolDeps?: Record<string, unknown>;
  workflowExecutionLookup?: WorkflowExecutionLookup;
  workflowFetcher?: unknown;
}

export const registerSkills = async (
  _agentBuilder: unknown,
  _logger: Logger,
  _options?: RegisterSkillsOptions
): Promise<void> => {
  // no-op: real skills registered by PR8
};
