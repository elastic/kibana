/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorroborationScenario } from './types';

export interface CorroborationPromptOptions {
  /**
   * Per-run identifier the report must carry back, so the durable-outcome
   * readback can be correlated to THIS run instead of accepting any report
   * written recently.
   */
  runId?: string;
  /** Ask the agent to persist the report to the investigation timeline. */
  requirePersistence?: boolean;
}

/**
 * Builds the worker prompt for one scenario.
 *
 * The scope the agent is given must be the scope the fixture was seeded with —
 * hosts AND time window. It previously named only the hosts, so the
 * `no-raw-telemetry` and `decoy-out-of-scope` scenarios could not be answered
 * correctly by a model that queried without a time bound: their windows are what
 * separates them from the sibling scenarios' documents in the same indices.
 *
 * `src/prompt.test.ts` pins both scope axes and the run-id echo.
 */
export const buildCorroborationPrompt = (
  scenario: CorroborationScenario,
  { runId, requirePersistence = false }: CorroborationPromptOptions = {}
): string => {
  const { hosts, timeRange } = scenario.scope;

  const lines = [
    'Corroborate the following alert narrative against raw telemetry.',
    '',
    `Narrative: ${scenario.narrative}`,
    `Hosts in scope: ${hosts.join(', ')}`,
    `Time range in scope: ${timeRange.from} to ${timeRange.to}`,
    '',
    'Query logs-* indices for each stage in the narrative. Every query MUST be bounded to the ' +
      'hosts and time range above — telemetry for other hosts or outside that window does not ' +
      'corroborate this narrative.',
    'Report corroborated events, gap events, confidence, and unresolved questions.',
    'End the report with a line in exactly this form: `Confidence: <number between 0 and 1>` ' +
      '(for example `Confidence: 0.8`). The L2 gate reads that line; a report without it is ' +
      'scored as stating no confidence.',
  ];

  if (runId !== undefined) {
    lines.push(
      `Run identifier: ${runId}. Include this identifier verbatim in the report so the run can be traced.`
    );
  }

  if (requirePersistence) {
    lines.push('Persist the findings to the investigation timeline.');
  }

  return lines.join('\n');
};
