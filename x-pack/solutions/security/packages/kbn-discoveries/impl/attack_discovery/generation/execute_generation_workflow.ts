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

import type { ManualOrchestrationOutcome } from './run_manual_orchestration';

export const executeGenerationWorkflow = async (
  _params: unknown
): Promise<ManualOrchestrationOutcome> => ({
  durationMs: 0,
  errors: [],
  executionId: '',
  status: 'completed',
});
