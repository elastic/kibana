/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stub: real manual-orchestration implementation is added by a later PR in
// the stack. PR3 needs the `ManualOrchestrationOutcome` type re-exported from
// generation/types.ts. FF-off prod safety preserved (no caller is reached
// without the FF-gated discoveries plugin).

export interface ManualOrchestrationOutcome {
  durationMs: number;
  errors: string[];
  executionId: string;
  status: 'completed' | 'failed' | 'partial';
}
