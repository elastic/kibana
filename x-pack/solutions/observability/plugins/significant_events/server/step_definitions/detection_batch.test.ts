/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toBatchEntry } from './detection_batch';

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

describe('toBatchEntry', () => {
  it('names the cells of a get_detections row and keeps what the agent reads', () => {
    expect(toBatchEntry({ row: ['rule-A', source, 139, 3, false] })).toEqual({
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
    const entry = toBatchEntry({ row: ['rule-A', source, 139, 3, true] });

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
    expect(toBatchEntry({ row: ['rule-B'] })).toMatchObject({ rule_uuid: 'rule-B' });
  });

  it('carries the classifier hint when given one', () => {
    const classifier = {
      reason: 'state_changed' as const,
      probe_status: 'ok' as const,
      live_events: [{ event_id: 'event-1', status: 'active', stored_verdict: 'confirms' }],
    };

    expect(toBatchEntry({ row: ['rule-A', source], classifier }).classifier).toEqual(classifier);
    expect(toBatchEntry({ row: ['rule-A', source] })).not.toHaveProperty('classifier');
  });
});
