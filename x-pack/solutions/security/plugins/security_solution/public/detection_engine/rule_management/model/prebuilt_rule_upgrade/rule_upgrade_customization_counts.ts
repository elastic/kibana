/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The shape both the Selected-scope and All-scope customized-rule checks return.
 */
export interface RuleUpgradeCustomizationCounts {
  total: number;
  customizedCount: number;
  /**
   * Number of rules whose Elastic version changes the rule type. `undefined` when the scope is
   * not loaded locally (the "All" scope), in which case type changes must be assumed possible.
   */
  ruleTypeChangeCount: number | undefined;
}
