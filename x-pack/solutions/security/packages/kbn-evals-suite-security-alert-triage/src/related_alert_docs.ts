/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildRelatedAlertDoc,
  type RelatedAlertCase,
} from '@kbn/evals-suite-alert-analysis-workflow';

export interface RelatedAlertEvalDoc {
  id: string;
  doc: Record<string, unknown>;
}

const MINUTE_MS = 60_000;

// `get-related-alerts` filters on `@timestamp >= now-<window>h`, and the shared fixtures carry a
// fixed 2024 timestamp, so every time field is re-based onto the run's clock.
const TIME_FIELDS = [
  '@timestamp',
  'kibana.alert.original_time',
  'kibana.alert.intended_timestamp',
  'kibana.alert.last_detected',
  'kibana.alert.start',
  'event.created',
  'event.ingested',
] as const;

const TARGET_MINUTES_AGO = 2;
const FIRST_RELATED_MINUTES_AGO = 10;
const RELATED_SPACING_MINUTES = 5;

const withTimestamp = (
  doc: Record<string, unknown>,
  timestamp: string
): Record<string, unknown> => ({
  ...doc,
  ...Object.fromEntries(TIME_FIELDS.map((field) => [field, timestamp])),
});

/** Target first, then its related alerts, all inside the tool's default 24h window. */
export const buildCaseDocs = (
  testCase: RelatedAlertCase,
  runId: string,
  now: Date = new Date()
): RelatedAlertEvalDoc[] =>
  [testCase.target, ...testCase.related].map((fixture, index) => {
    const id =
      index === 0 ? `${testCase.id}-target-${runId}` : `${testCase.id}-rel-${index}-${runId}`;
    const minutesAgo =
      index === 0
        ? TARGET_MINUTES_AGO
        : FIRST_RELATED_MINUTES_AGO + (index - 1) * RELATED_SPACING_MINUTES;
    const timestamp = new Date(now.getTime() - minutesAgo * MINUTE_MS).toISOString();
    return { id, doc: withTimestamp(buildRelatedAlertDoc(fixture, id, index, runId), timestamp) };
  });
