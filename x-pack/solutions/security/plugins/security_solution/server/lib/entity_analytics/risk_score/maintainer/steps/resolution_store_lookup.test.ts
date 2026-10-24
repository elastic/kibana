/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RESOLUTION_TARGET_LOOKUP_FIELDS,
  readResolutionTargetLookup,
} from './resolution_store_lookup';

const columns = [
  'alert_count',
  'scores',
  'risk_inputs',
  'contributing_entities_raw',
  'resolution_target_id',
  ...RESOLUTION_TARGET_LOOKUP_FIELDS,
].map((name) => ({ name }));

const row = (target: string, store: unknown[]) => [1, 20, '{}', `${target}|self`, target, ...store];

describe('readResolutionTargetLookup', () => {
  it("reads each target's own modifiers and stored resolution score from the joined columns", () => {
    const { entities, storedScores } = readResolutionTargetLookup(columns, [
      row('user:t1', ['user', 'high_impact', ['privileged'], 'High', 12.5, 78.25]),
    ]);

    expect(entities.get('user:t1')).toEqual(
      expect.objectContaining({
        entity: expect.objectContaining({ id: 'user:t1' }),
        asset: { criticality: 'high_impact' },
      })
    );
    expect(storedScores.get('user:t1')).toEqual({ level: 'High', score: 12.5, scoreNorm: 78.25 });
  });

  it('leaves out a target missing from the store', () => {
    const { entities, storedScores } = readResolutionTargetLookup(columns, [
      row('user:t2', [null, null, null, null, null, null]),
    ]);

    expect(entities.size).toBe(0);
    expect(storedScores.size).toBe(0);
  });

  it('ignores an unknown criticality', () => {
    const { entities } = readResolutionTargetLookup(columns, [
      row('user:t3', ['user', 'not_a_level', null, null, null, null]),
    ]);

    expect(entities.get('user:t3')?.asset?.criticality).toBeUndefined();
  });
});
