/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stub: real event-logging implementation is added by a later PR in the
// stack. PR3 needs these *types* exported so generation/types.ts can
// reference them. FF-off prod safety is preserved because no caller reaches
// this module until the FF-gated discoveries plugin loads.

export type AttackDiscoverySource = 'action' | 'interactive' | 'scheduled';

export interface SourceMetadata {
  actionId?: string;
  actionName?: string;
  ruleId?: string;
  ruleName?: string;
  scheduleId?: string;
  triggeredBy?: string;
}

export interface ValidationSummary {
  invalidCount: number;
  successCount: number;
  totalCount: number;
}
