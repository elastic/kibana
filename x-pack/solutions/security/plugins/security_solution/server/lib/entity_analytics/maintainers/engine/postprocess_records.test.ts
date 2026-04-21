/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postprocessEsqlResults } from './postprocess_records';

const ACCESSES_COLUMNS = [
  { name: 'actorUserId', type: 'keyword' },
  { name: 'accesses_frequently', type: 'keyword' },
  { name: 'accesses_infrequently', type: 'keyword' },
];

const COMM_COLUMNS = [
  { name: 'actorUserId', type: 'keyword' },
  { name: 'communicates_with', type: 'keyword' },
];

describe('postprocessEsqlResults (accesses)', () => {
  it('returns [] for empty values', () => {
    expect(postprocessEsqlResults(ACCESSES_COLUMNS, [], 'accesses')).toEqual([]);
  });

  it('sets entityId to null when actorUserId is null', () => {
    const [rec] = postprocessEsqlResults(ACCESSES_COLUMNS, [[null, null, null]], 'accesses');
    expect(rec.entityId).toBeNull();
  });

  it('uses actorUserId directly as entityId (already has type prefix)', () => {
    const [rec] = postprocessEsqlResults(
      ACCESSES_COLUMNS,
      [['user:alice@corp', null, null]],
      'accesses'
    );
    expect(rec.entityId).toBe('user:alice@corp');
  });

  it('puts accesses_frequently targets in raw_identifiers["entity.id"]', () => {
    const [rec] = postprocessEsqlResults(
      ACCESSES_COLUMNS,
      [['user:alice@corp', ['host:web-01', 'host:web-02'], null]],
      'accesses'
    );
    expect(rec.relationships.accesses_frequently).toEqual({
      'entity.id': ['host:web-01', 'host:web-02'],
    });
  });

  it('puts accesses_infrequently targets in raw_identifiers["entity.id"]', () => {
    const [rec] = postprocessEsqlResults(
      ACCESSES_COLUMNS,
      [['user:alice@corp', null, 'host:db-01']],
      'accesses'
    );
    expect(rec.relationships.accesses_infrequently).toEqual({ 'entity.id': ['host:db-01'] });
  });

  it('wraps null columns as empty arrays', () => {
    const [rec] = postprocessEsqlResults(
      ACCESSES_COLUMNS,
      [['user:alice@corp', null, null]],
      'accesses'
    );
    expect(rec.relationships.accesses_frequently).toEqual({ 'entity.id': [] });
    expect(rec.relationships.accesses_infrequently).toEqual({ 'entity.id': [] });
  });
});

describe('postprocessEsqlResults (communicates_with)', () => {
  it('puts communicates_with targets in raw_identifiers["entity.id"]', () => {
    const [rec] = postprocessEsqlResults(
      COMM_COLUMNS,
      [['user:alice@okta', ['user:bob@okta', 'user:carol@okta']]],
      'communicates_with'
    );
    expect(rec.relationships.communicates_with).toEqual({
      'entity.id': ['user:bob@okta', 'user:carol@okta'],
    });
  });

  it('uses actorUserId directly as entityId', () => {
    const [rec] = postprocessEsqlResults(
      COMM_COLUMNS,
      [['user:alice@okta', null]],
      'communicates_with'
    );
    expect(rec.entityId).toBe('user:alice@okta');
  });
});
