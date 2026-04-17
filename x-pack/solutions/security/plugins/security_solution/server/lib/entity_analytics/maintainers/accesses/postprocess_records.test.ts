/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postprocessEsqlResults } from './postprocess_records';

const COLUMNS = [
  { name: 'actorUserId', type: 'keyword' },
  { name: 'accesses_frequently', type: 'keyword' },
  { name: 'accesses_infrequently', type: 'keyword' },
];

describe('postprocessEsqlResults', () => {
  it('returns an empty array when values is empty', () => {
    expect(postprocessEsqlResults(COLUMNS, [])).toEqual([]);
  });

  it('sets entityId to null when actorUserId is null', () => {
    const [record] = postprocessEsqlResults(COLUMNS, [[null, null, null]]);
    expect(record.entityId).toBeNull();
  });

  it('prefixes actorUserId with "user:" to form entityId', () => {
    const [record] = postprocessEsqlResults(COLUMNS, [['alice@corp', null, null]]);
    expect(record.entityId).toBe('user:alice@corp');
  });

  it('wraps null accesses_frequently in { ids: [] }', () => {
    const [record] = postprocessEsqlResults(COLUMNS, [['alice@corp', null, null]]);
    expect(record.accesses_frequently).toEqual({ ids: [] });
  });

  it('wraps null accesses_infrequently in { ids: [] }', () => {
    const [record] = postprocessEsqlResults(COLUMNS, [['alice@corp', null, null]]);
    expect(record.accesses_infrequently).toEqual({ ids: [] });
  });

  it('wraps a single string accesses_frequently value in { ids: [value] }', () => {
    const [record] = postprocessEsqlResults(COLUMNS, [
      ['alice@corp', 'host:prod-db-01@corp', null],
    ]);
    expect(record.accesses_frequently).toEqual({ ids: ['host:prod-db-01@corp'] });
  });

  it('wraps an array accesses_frequently value in { ids: [...] }', () => {
    const [record] = postprocessEsqlResults(COLUMNS, [
      ['alice@corp', ['host:prod-db-01@corp', 'host:prod-db-02@corp'], null],
    ]);
    expect(record.accesses_frequently).toEqual({
      ids: ['host:prod-db-01@corp', 'host:prod-db-02@corp'],
    });
  });

  it('wraps accesses_infrequently independently from accesses_frequently', () => {
    const [record] = postprocessEsqlResults(COLUMNS, [
      ['alice@corp', ['host:prod-db-01@corp'], ['host:legacy-01@corp']],
    ]);
    expect(record.accesses_frequently).toEqual({ ids: ['host:prod-db-01@corp'] });
    expect(record.accesses_infrequently).toEqual({ ids: ['host:legacy-01@corp'] });
  });

  it('processes multiple rows independently', () => {
    const results = postprocessEsqlResults(COLUMNS, [
      ['alice@corp', ['host:a@corp'], null],
      ['bob@corp', null, ['host:b@corp']],
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].entityId).toBe('user:alice@corp');
    expect(results[0].accesses_frequently).toEqual({ ids: ['host:a@corp'] });
    expect(results[0].accesses_infrequently).toEqual({ ids: [] });
    expect(results[1].entityId).toBe('user:bob@corp');
    expect(results[1].accesses_frequently).toEqual({ ids: [] });
    expect(results[1].accesses_infrequently).toEqual({ ids: ['host:b@corp'] });
  });
});
