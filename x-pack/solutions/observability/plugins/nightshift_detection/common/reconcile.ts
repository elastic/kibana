/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A strategy whose `resources()` failed; it keeps everything it owns. */
export interface StrategyError {
  strategy: string;
  message: string;
}

/** What one reconciliation changed, and what it could not. */
export interface ReconcileRulesResult {
  created: number;
  deleted: number;
  enabled: number;
  disabled: number;
  /**
   * Rules not created or turned on because Alerting's schedule budget is spent; the next run tries
   * again.
   */
  skipped: Array<{ rule_id: string; reason: string }>;
  failures: Array<{ rule_id: string; operation: RuleOperation; message: string }>;
  strategy_errors: StrategyError[];
}

/** What the reconciler tried to do to a rule. */
export type RuleOperation = 'create' | 'delete' | 'enable' | 'disable';

/** What a `_reconcile` call did: the reconciliation, or nothing because another one holds the space. */
export type ReconcileRulesResponse =
  | ({ status: 'completed' } & ReconcileRulesResult)
  | { status: 'busy' };
