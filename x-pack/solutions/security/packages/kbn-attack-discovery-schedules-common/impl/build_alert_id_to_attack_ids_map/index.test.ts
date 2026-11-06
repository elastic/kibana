/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertIdToAttackIdsMap } from '.';

describe('buildAlertIdToAttackIdsMap', () => {
  it('inverts a single attack into a map keyed by each underlying alert id', () => {
    expect(
      buildAlertIdToAttackIdsMap({
        attacks: [{ alertIds: ['alert-a', 'alert-b'], attackId: 'attack-1' }],
      })
    ).toEqual({
      'alert-a': ['attack-1'],
      'alert-b': ['attack-1'],
    });
  });

  it('aggregates multiple attacks that share the same underlying alert id', () => {
    expect(
      buildAlertIdToAttackIdsMap({
        attacks: [
          { alertIds: ['alert-shared'], attackId: 'attack-1' },
          { alertIds: ['alert-shared'], attackId: 'attack-2' },
        ],
      })
    ).toEqual({
      'alert-shared': ['attack-1', 'attack-2'],
    });
  });

  it('returns an empty map when there are no attacks', () => {
    expect(buildAlertIdToAttackIdsMap({ attacks: [] })).toEqual({});
  });

  it('skips attacks that have no underlying alert ids', () => {
    expect(
      buildAlertIdToAttackIdsMap({
        attacks: [
          { alertIds: [], attackId: 'attack-1' },
          { alertIds: ['alert-a'], attackId: 'attack-2' },
        ],
      })
    ).toEqual({
      'alert-a': ['attack-2'],
    });
  });
});
