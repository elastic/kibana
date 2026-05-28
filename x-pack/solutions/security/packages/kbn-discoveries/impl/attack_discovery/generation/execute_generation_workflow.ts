/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stub: the real `executeGenerationWorkflow` orchestration entry point lands
// in PR4 (Orchestration + Event Logging). PR3 routes (post_generate,
// workflow_executor) import this symbol, so an FF-off-safe stub is exported
// here. The function is never called at runtime when the feature flag is
// OFF — the discoveries plugin's generate path is FF-gated upstream.

import type { Logger } from '@kbn/core/server';
import type { ManualOrchestrationOutcome } from './run_manual_orchestration';

// Permissive params for PR3 consumers. Real signature lives in PR4. The few
// callback shapes are typed so destructured binding elements (e.g.
// `checkIntegrity: ({ logger, spaceId }) => ...`) don't trigger TS7031
// implicit-any errors in PR3.
export interface ExecuteGenerationWorkflowParams {
  checkIntegrity?: (args: { logger: Logger; spaceId: string }) => unknown;
  // Permissive: PR3 callers pass a `WorkflowConfig` object (from the API
  // schemas) here; PR4's real impl narrows this to the precise type.
  workflowConfig?: unknown;
  [key: string]: unknown;
}

export const executeGenerationWorkflow = async (
  _params: ExecuteGenerationWorkflowParams
): Promise<ManualOrchestrationOutcome> => ({
  outcome: 'validation_failed',
});
