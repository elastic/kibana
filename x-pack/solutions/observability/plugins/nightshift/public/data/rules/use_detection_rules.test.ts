/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionRule } from './use_detection_rules';
import { toDetectionRule } from './use_detection_rules';
import type { SignificantEventQueryRow } from './use_fetch_discovery_queries';

const makeRow = (ruleEnabled?: boolean): SignificantEventQueryRow => ({
  query: {
    id: 'query-1',
    title: 'Error rate',
    description: 'Errors',
    type: 'match',
    esql: { query: 'FROM logs-*' },
    severity_score: 80,
  } as SignificantEventQueryRow['query'],
  source_id: 'source-1',
  rule_backed: true,
  rule_enabled: ruleEnabled,
  occurrences: [
    { x: 1, y: 3 },
    { x: 2, y: 0 },
    { x: 3, y: 5 },
    { x: 4, y: 0 },
  ],
  change_points: { type: {} },
});

const convert = (
  row: SignificantEventQueryRow,
  engineState?: string,
  sourceEnabled?: boolean
): DetectionRule => toDetectionRule(row, { engineState, sourceEnabled });

describe('toDetectionRule', () => {
  it('counts documents and takes the last matching interval', () => {
    expect(convert(makeRow(true))).toMatchObject({ matches: 8, lastActivity: 3 });
    expect(convert({ ...makeRow(true), occurrences: [] }).lastActivity).toBeUndefined();
  });

  it.each([
    [true, 'paused', true, 'engine_paused'],
    [true, 'enabled', false, 'source_disabled'],
    [false, 'paused', false, 'engine_paused'],
    [false, 'enabled', false, 'source_disabled'],
    [false, 'enabled', true, 'rule_disabled'],
  ])(
    'explains rule enabled %s for engine %s and source %s',
    (enabled, engineState, sourceEnabled, reason) => {
      expect(convert(makeRow(enabled), engineState, sourceEnabled).status).toEqual({
        state: 'inactive',
        reason,
      });
    }
  );

  it('marks an enabled rule active when its engine and source are enabled', () => {
    expect(convert(makeRow(true), 'enabled', true).status).toEqual({ state: 'active' });
  });

  it('leaves status unknown when the server omits it', () => {
    expect(convert(makeRow(), 'paused', false).status).toBeUndefined();
  });
});
