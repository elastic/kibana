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

  it('uses the real rule state even if the engine or source disagrees', () => {
    expect(convert(makeRow(true), 'paused', false).status).toEqual({ state: 'active' });
  });

  it.each([
    ['paused', false, 'engine_paused'],
    ['enabled', false, 'source_disabled'],
    ['enabled', true, 'rule_disabled'],
  ])(
    'explains a disabled rule for engine %s and source %s',
    (engineState, sourceEnabled, reason) => {
      expect(convert(makeRow(false), engineState, sourceEnabled).status).toEqual({
        state: 'inactive',
        reason,
      });
    }
  );

  it('leaves status unknown when the server omits it', () => {
    expect(convert(makeRow(), 'paused', false).status).toBeUndefined();
  });
});
