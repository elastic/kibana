/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prototype-only mock rule counts so we can exercise every legend color band.
 * Cycles: 0 (none) → 1 (≥1) → 4 (≥3) → 8 (≥7) → 12 (≥10).
 */
export const COVERAGE_PROTOTYPE_RULE_COUNTS = [0, 1, 4, 8, 12] as const;

export const getPrototypeRuleCount = (techniqueIndex: number): number =>
  COVERAGE_PROTOTYPE_RULE_COUNTS[techniqueIndex % COVERAGE_PROTOTYPE_RULE_COUNTS.length];
