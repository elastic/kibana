/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dedupeCandidatesById } from '.';

describe('dedupeCandidatesById', () => {
  it('keeps a single candidate per _id', () => {
    const result = dedupeCandidatesById([
      { alert: '_id,id-1\na', id: 'id-1' },
      { alert: '_id,id-1\nab', id: 'id-1' },
    ]);

    expect(result).toHaveLength(1);
  });

  it('keeps the richest (longest) version when an _id is duplicated', () => {
    const result = dedupeCandidatesById([
      { alert: '_id,id-1\nhost.name,web-01', id: 'id-1' },
      { alert: '_id,id-1\nhost.name,web-01\nuser.name,root\nseverity,high', id: 'id-1' },
    ]);

    expect(result[0].alert).toBe('_id,id-1\nhost.name,web-01\nuser.name,root\nseverity,high');
  });

  it('keeps the first-seen candidate on a length tie (deterministic tiebreak)', () => {
    const result = dedupeCandidatesById([
      { alert: '_id,id-1\naa', id: 'id-1' },
      { alert: '_id,id-1\nbb', id: 'id-1' },
    ]);

    expect(result[0].alert).toBe('_id,id-1\naa');
  });

  it('preserves first-seen _id order', () => {
    const result = dedupeCandidatesById([
      { alert: '_id,id-2\na', id: 'id-2' },
      { alert: '_id,id-1\na', id: 'id-1' },
      { alert: '_id,id-2\nabc', id: 'id-2' },
    ]);

    expect(result.map((c) => c.id)).toEqual(['id-2', 'id-1']);
  });

  it('returns distinct candidates unchanged', () => {
    const candidates = [
      { alert: '_id,id-1\na', id: 'id-1' },
      { alert: '_id,id-2\nb', id: 'id-2' },
    ];

    expect(dedupeCandidatesById(candidates)).toEqual(candidates);
  });

  it('returns an empty array for no candidates', () => {
    expect(dedupeCandidatesById([])).toEqual([]);
  });
});
