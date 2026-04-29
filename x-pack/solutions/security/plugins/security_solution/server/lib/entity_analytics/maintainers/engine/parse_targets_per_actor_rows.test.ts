/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseTargetsPerActorRows } from './parse_targets_per_actor_rows';

const ACCESSES_COLUMNS = [
  { name: 'actorUserId', type: 'keyword' },
  { name: 'accesses_frequently', type: 'keyword' },
  { name: 'accesses_infrequently', type: 'keyword' },
];

const COMM_COLUMNS = [
  { name: 'actorUserId', type: 'keyword' },
  { name: 'communicates_with', type: 'keyword' },
];

const ACCESSES_CONFIG = {
  relationshipType: 'accesses' as const,
  enableFrequencyClassification: true,
};
const COMM_CONFIG = { relationshipType: 'communicates_with' as const };

describe('parseTargetsPerActorRows — accesses', () => {
  it('returns [] for empty values', () => {
    expect(parseTargetsPerActorRows(ACCESSES_COLUMNS, [], ACCESSES_CONFIG)).toEqual([]);
  });

  it('sets entityId to null when actorUserId is null', () => {
    const [rec] = parseTargetsPerActorRows(ACCESSES_COLUMNS, [[null, null, null]], ACCESSES_CONFIG);
    expect(rec.entityId).toBeNull();
  });

  it('uses actorUserId directly as entityId', () => {
    const [rec] = parseTargetsPerActorRows(
      ACCESSES_COLUMNS,
      [['user:alice@corp', null, null]],
      ACCESSES_CONFIG
    );
    expect(rec.entityId).toBe('user:alice@corp');
  });

  it('puts accesses_frequently target EUIDs in flat array', () => {
    const [rec] = parseTargetsPerActorRows(
      ACCESSES_COLUMNS,
      [['user:alice@corp', ['host:D3F5C9B9-web-01', 'host:D3F5C9B9-web-02'], null]],
      ACCESSES_CONFIG
    );
    expect(rec.relationships.accesses_frequently).toEqual([
      'host:D3F5C9B9-web-01',
      'host:D3F5C9B9-web-02',
    ]);
  });

  it('puts accesses_infrequently target EUIDs in flat array', () => {
    const [rec] = parseTargetsPerActorRows(
      ACCESSES_COLUMNS,
      [['user:alice@corp', null, 'host:D3F5C9B9-db-01']],
      ACCESSES_CONFIG
    );
    expect(rec.relationships.accesses_infrequently).toEqual(['host:D3F5C9B9-db-01']);
  });

  it('wraps null columns as empty arrays', () => {
    const [rec] = parseTargetsPerActorRows(
      ACCESSES_COLUMNS,
      [['user:alice@corp', null, null]],
      ACCESSES_CONFIG
    );
    expect(rec.relationships.accesses_frequently).toEqual([]);
    expect(rec.relationships.accesses_infrequently).toEqual([]);
  });
});

describe('parseTargetsPerActorRows — communicates_with', () => {
  it('puts communicates_with target EUIDs in flat array', () => {
    const [rec] = parseTargetsPerActorRows(
      COMM_COLUMNS,
      [['user:alice@okta', ['user:bob@okta', 'user:carol@okta']]],
      COMM_CONFIG
    );
    expect(rec.relationships.communicates_with).toEqual(['user:bob@okta', 'user:carol@okta']);
  });

  it('uses actorUserId directly as entityId', () => {
    const [rec] = parseTargetsPerActorRows(COMM_COLUMNS, [['user:alice@okta', null]], COMM_CONFIG);
    expect(rec.entityId).toBe('user:alice@okta');
  });
});
