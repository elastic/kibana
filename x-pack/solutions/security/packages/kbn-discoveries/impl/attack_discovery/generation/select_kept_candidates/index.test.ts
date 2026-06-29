/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectKeptCandidates } from '.';

const candidates = [
  { alert: '_id,id-1\nhost.name,web-01', id: 'id-1' },
  { alert: '_id,id-2\nhost.name,web-02', id: 'id-2' },
  { alert: '_id,id-3\nhost.name,web-03', id: 'id-3' },
];

describe('selectKeptCandidates', () => {
  it('forwards the original candidate bytes for kept ids', () => {
    const result = selectKeptCandidates({ candidates, keepAlertIds: ['id-1', 'id-3'] });

    expect(result.map((c) => c.alert)).toEqual([
      '_id,id-1\nhost.name,web-01',
      '_id,id-3\nhost.name,web-03',
    ]);
  });

  it('removes candidates whose id is not in the keep-set', () => {
    const result = selectKeptCandidates({ candidates, keepAlertIds: ['id-2'] });

    expect(result.map((c) => c.id)).toEqual(['id-2']);
  });

  it('ignores keep ids that do not match any candidate (no hallucinated injection)', () => {
    const result = selectKeptCandidates({ candidates, keepAlertIds: ['id-1', 'unknown-id'] });

    expect(result.map((c) => c.id)).toEqual(['id-1']);
  });

  it('preserves candidate order', () => {
    const result = selectKeptCandidates({ candidates, keepAlertIds: ['id-3', 'id-1'] });

    expect(result.map((c) => c.id)).toEqual(['id-1', 'id-3']);
  });

  it('returns an empty array when the keep-set is empty', () => {
    expect(selectKeptCandidates({ candidates, keepAlertIds: [] })).toEqual([]);
  });
});
