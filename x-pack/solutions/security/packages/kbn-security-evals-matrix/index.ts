/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * as cli from './src/cli';
// Re-exported for the persona-matrix suite's golden replay contract test.
export { planReplay, summarizePlan } from './src/matrix/replay_plan';
export type { ReplayCell, PlanIssue } from './src/matrix/replay_plan';
