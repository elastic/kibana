/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reportPreservationTelemetry } from './hunt_telemetry';
import type { PreserveResult } from './preserve';

const result = (overrides: Partial<PreserveResult> = {}): PreserveResult => ({
  investigationId: 'inv-1',
  evidenceCount: 2,
  addedCount: 2,
  created: false,
  isRetry: false,
  hadPriorEvidence: false,
  ...overrides,
});

const run = (overrides: Partial<PreserveResult>) => {
  const report = jest.fn().mockReturnValue(true);
  reportPreservationTelemetry({ report, huntId: 'hunt-a', result: result(overrides) });
  return report.mock.calls;
};

describe('reportPreservationTelemetry', () => {
  it('reports the Investigation it created and the first preservation', () => {
    expect(run({ created: true })).toEqual([
      ['alertzero_hunt_investigation_created', { hunt_id: 'hunt-a', trigger: 'manual' }],
      [
        'alertzero_hunt_session_preserved',
        { hunt_id: 'hunt-a', added_count: 2, evidence_count: 2 },
      ],
    ]);
  });

  it('reports a first preservation onto an Investigation it did not create', () => {
    expect(run({})).toEqual([
      [
        'alertzero_hunt_session_preserved',
        { hunt_id: 'hunt-a', added_count: 2, evidence_count: 2 },
      ],
    ]);
  });

  it('reports an append when the Investigation already held evidence', () => {
    expect(run({ hadPriorEvidence: true, addedCount: 1, evidenceCount: 3 })).toEqual([
      [
        'alertzero_hunt_evidence_appended',
        { hunt_id: 'hunt-a', added_count: 1, evidence_count: 3 },
      ],
    ]);
  });

  it('reports nothing for a retried preservation, even one that created the Investigation', () => {
    expect(run({ isRetry: true, created: true })).toEqual([]);
  });

  it('reports nothing for a selection that added no new row', () => {
    expect(run({ addedCount: 0, hadPriorEvidence: true })).toEqual([]);
  });

  it('sends no field beyond the hunt id, counts and trigger', () => {
    const payloads = run({ created: true }).map(([, payload]) => Object.keys(payload).sort());

    expect(payloads).toEqual([
      ['hunt_id', 'trigger'],
      ['added_count', 'evidence_count', 'hunt_id'],
    ]);
  });
});
