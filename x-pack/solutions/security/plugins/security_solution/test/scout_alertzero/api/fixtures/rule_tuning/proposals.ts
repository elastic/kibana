/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FP_PROCESS_NAME, SEEDED_EVENT_COUNT, TP_EVENT_COUNT } from './seed';
import type { BacktestOutcome } from './results';

export const OVERBROAD_QUERY = 'process.name:*';
export const NARROWED_QUERY = `process.name:* and not process.name:"${FP_PROCESS_NAME}"`;
export const FIXTURE_RISK_SCORE = 40;

/**
 * What the backtest counts for the scripted query change, which drops `FP_PROCESS_NAME`: the
 * current rule alerts on every seeded event, and the proposed one on the true positives only. The
 * backtest reports totals, so the 2 is read as the true positives because the seeded events
 * and the change are fixed. It does not say which events alerted.
 */
export const EXPECTED_BACKTEST_COUNTS: BacktestOutcome = {
  current_succeeded: true,
  current_alert_count: SEEDED_EVENT_COUNT,
  proposed_succeeded: true,
  proposed_alert_count: TP_EVENT_COUNT,
};

/** Fields every `diagnose_rule` structured output carries. */
const proposalText = {
  title: 'Stop alerting on nginx',
  summary: 'Every false positive is nginx on a web host.',
  fp_pattern: 'All 10 false positives are nginx on web hosts.',
  reasoning: 'The query matches every process, and every false positive is nginx.',
  confidence: 'high',
};

export const QUERY_PROPOSAL = {
  ...proposalText,
  change_type: 'query',
  proposed_query: NARROWED_QUERY,
};

export const EXCEPTION_ENTRY = { field: 'process.name', operator: 'is', value: FP_PROCESS_NAME };
export const EXCEPTION_PROPOSAL = {
  ...proposalText,
  change_type: 'exception',
  exception_name: 'nginx on web hosts is known benign',
  exception_entries: [EXCEPTION_ENTRY],
};

export const RISK_SCORE_PROPOSAL = {
  ...proposalText,
  change_type: 'risk_score',
  proposed_risk_score: 21,
  proposed_severity: 'low',
};

export type TuningProposal =
  | typeof QUERY_PROPOSAL
  | typeof EXCEPTION_PROPOSAL
  | typeof RISK_SCORE_PROPOSAL;
