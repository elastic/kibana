/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BASE_STORE_LOOKUP_FIELDS,
  isStoredScoreUnchanged,
  readBaseStoreLookup,
} from './base_store_lookup';

const columns = [
  'alert_count',
  'scores',
  'risk_inputs',
  'entity.id',
  ...BASE_STORE_LOOKUP_FIELDS,
].map((name) => ({ name }));

// [alert_count, scores, risk_inputs, entity.id, engine type, criticality, watchlists, resolved_to,
//  level, score, score_norm]
const row = (id: string, joined: unknown[]) => [1, 10, '{}', id, ...joined];

describe('readBaseStoreLookup', () => {
  it('reads the modifiers and stored score of entities in the store', () => {
    const { entities, storedScores } = readBaseStoreLookup(columns, [
      row('user:a', ['user', 'high_impact', ['wl-1', 'wl-2'], 'user:b', 'High', 80.5, 72.25]),
    ]);

    expect(entities.get('user:a')).toEqual({
      entity: {
        id: 'user:a',
        attributes: { watchlists: ['wl-1', 'wl-2'] },
        relationships: { resolution: { resolved_to: 'user:b' } },
      },
      asset: { criticality: 'high_impact' },
    });
    expect(storedScores.get('user:a')).toEqual({ level: 'High', score: 80.5, scoreNorm: 72.25 });
  });

  it('leaves out entities the join found no store document for', () => {
    const { entities, storedScores } = readBaseStoreLookup(columns, [
      row('user:missing', [null, null, null, null, null, null, null]),
    ]);

    expect(entities.size).toBe(0);
    expect(storedScores.size).toBe(0);
  });

  it('accepts a single watchlist and drops a criticality level it does not know', () => {
    const { entities } = readBaseStoreLookup(columns, [
      row('user:a', ['user', 'not_a_level', 'wl-1', null, null, null, null]),
    ]);

    expect(entities.get('user:a')?.entity?.attributes?.watchlists).toEqual(['wl-1']);
    expect(entities.get('user:a')?.asset?.criticality).toBeUndefined();
  });
});

describe('isStoredScoreUnchanged', () => {
  const score = {
    calculated_level: 'Moderate',
    calculated_score: 123.456789,
    calculated_score_norm: 45.678901,
  } as const;

  it('matches a stored score held at single precision', () => {
    expect(
      isStoredScoreUnchanged(score, {
        level: 'Moderate',
        score: Math.fround(123.456789),
        scoreNorm: Math.fround(45.678901),
      })
    ).toBe(true);
  });

  it('treats a different level, score, or a missing stored score as changed', () => {
    const stored = {
      level: 'Moderate',
      score: Math.fround(123.456789),
      scoreNorm: Math.fround(45.678901),
    };

    expect(isStoredScoreUnchanged(score, { ...stored, level: 'High' })).toBe(false);
    expect(isStoredScoreUnchanged(score, { ...stored, scoreNorm: Math.fround(45.7) })).toBe(false);
    expect(isStoredScoreUnchanged(score, { level: 'Moderate' })).toBe(false);
    expect(isStoredScoreUnchanged(score, undefined)).toBe(false);
  });
});
