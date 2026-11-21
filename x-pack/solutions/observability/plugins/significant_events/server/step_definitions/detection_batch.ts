/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BatchEntry } from '../../common/workflows/steps/detection_batch';

export { batchEntrySchema, type BatchEntry } from '../../common/workflows/steps/detection_batch';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const number = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

/**
 * Whether the flaky-rule gate held this detection back: the `held_back` column of the row. A row
 * without the column is not held back.
 */
export const isHeldBack = ({
  columns,
  row,
}: {
  columns: readonly string[];
  row: readonly unknown[];
}): boolean => row[columns.indexOf('held_back')] === true;

/**
 * When the agent last reviewed the row's rule: the `last_reviewed_at` column, in epoch milliseconds.
 * Absent when the column is missing or does not hold a readable time.
 */
export const lastReviewedAt = ({
  columns,
  row,
}: {
  columns: readonly string[];
  row: readonly unknown[];
}): number | undefined => {
  const value = row[columns.indexOf('last_reviewed_at')];
  const time = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isNaN(time) ? undefined : time;
};

/** Names a detection row's cells, and keeps the fields the agent reads. */
export const toBatchEntry = ({
  columns,
  row,
}: {
  columns: readonly string[];
  row: readonly unknown[];
}): BatchEntry => {
  const cells = new Map(columns.map((name, index) => [name, row[index]]));
  const source = cells.get('_source');
  const stored = isRecord(source) ? source : {};
  const flaky = cells.get('flaky_probe');

  return {
    '@timestamp': text(stored['@timestamp']),
    detection_id: text(stored.detection_id),
    rule_uuid: text(cells.get('rule_uuid')) ?? text(stored.rule_uuid),
    rule_name: text(stored.rule_name),
    source_id: text(stored.source_id),
    change_point_type: text(stored.change_point_type),
    p_value: number(stored.p_value),
    recent_detection_count: number(cells.get('recent_detection_count')),
    ...(typeof flaky === 'boolean' ? { flaky_probe: flaky } : {}),
  };
};
