/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHeldBack, lastReviewedAt, toBatchEntry } from './detection_batch';

const source = {
  p_value: 0.01,
  rule_uuid: 'rule-A',
  change_point_type: 'spike',
  '@timestamp': '2026-10-16T09:56:07.779Z',
  rule_name: 'Availability Service Request Failures',
  workflow_execution_id: 'exec-1',
  source_id: 'source-1',
  detection_id: 'rule-A-exec-1',
  alert_index: '.rule-events',
  kibana: { space_ids: ['default'] },
  severity_score: 65,
};

const COLUMNS = ['rule_uuid', '_source', 'score', 'recent_detection_count', 'flaky_probe'];

describe('toBatchEntry', () => {
  it('names the cells of a get_detections row and keeps what the agent reads', () => {
    expect(toBatchEntry({ columns: COLUMNS, row: ['rule-A', source, 139, 3, false] })).toEqual({
      '@timestamp': '2026-10-16T09:56:07.779Z',
      detection_id: 'rule-A-exec-1',
      rule_uuid: 'rule-A',
      rule_name: 'Availability Service Request Failures',
      source_id: 'source-1',
      change_point_type: 'spike',
      p_value: 0.01,
      recent_detection_count: 3,
      flaky_probe: false,
    });
  });

  it('leaves out what the agent must not rate from or has no use for', () => {
    const entry = toBatchEntry({ columns: COLUMNS, row: ['rule-A', source, 139, 3, true] });

    expect(entry).not.toHaveProperty('severity_score');
    expect(entry).not.toHaveProperty('alert_index');
    expect(entry).not.toHaveProperty('workflow_execution_id');
    expect(entry).not.toHaveProperty('kibana');
    expect(entry).not.toHaveProperty('score');
  });

  it('reads the cells by the given column names, wherever they are', () => {
    expect(
      toBatchEntry({
        columns: ['flaky_probe', 'rule_uuid', '_source', 'recent_detection_count'],
        row: [true, 'rule-A', source, 7],
      })
    ).toMatchObject({ flaky_probe: true, rule_uuid: 'rule-A', recent_detection_count: 7 });
  });

  it('falls back to the stored rule uuid, and tolerates a row without a source', () => {
    expect(toBatchEntry({ columns: ['_source'], row: [source] }).rule_uuid).toBe('rule-A');
    expect(toBatchEntry({ columns: COLUMNS, row: ['rule-B'] })).toMatchObject({
      rule_uuid: 'rule-B',
    });
  });
});

describe('isHeldBack', () => {
  const columns = ['rule_uuid', '_source', 'held_back'];

  it('holds back only a row whose held_back column is true', () => {
    expect(isHeldBack({ columns, row: ['rule-A', source, true] })).toBe(true);
    expect(isHeldBack({ columns, row: ['rule-A', source, false] })).toBe(false);
    expect(isHeldBack({ columns, row: ['rule-A', source, 'true'] })).toBe(false);
    expect(isHeldBack({ columns: ['rule_uuid', '_source'], row: ['rule-A', source] })).toBe(false);
  });
});

describe('lastReviewedAt', () => {
  const columns = ['rule_uuid', '_source', 'last_reviewed_at'];

  it('reads the time of the last review in epoch milliseconds, when it is readable', () => {
    expect(lastReviewedAt({ columns, row: ['rule-A', source, '2026-10-23T03:37:06.799Z'] })).toBe(
      Date.parse('2026-10-23T03:37:06.799Z')
    );
    expect(lastReviewedAt({ columns, row: ['rule-A', source, null] })).toBeUndefined();
    expect(lastReviewedAt({ columns, row: ['rule-A', source, 'yesterday'] })).toBeUndefined();
    expect(lastReviewedAt({ columns: ['rule_uuid'], row: ['rule-A'] })).toBeUndefined();
  });
});
