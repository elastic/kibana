/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

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
  kind: 'bucketed' as const,
  id: 'elastic_defend',
  bucketTargetByThreshold: {
    threshold: 4,
    aboveThresholdRelationship: 'accesses_frequently',
    belowThresholdRelationship: 'accesses_infrequently',
  },
} as const;
const COMM_CONFIG = {
  kind: 'standard' as const,
  id: 'okta',
  relationshipKey: 'communicates_with' as const,
};

const COMM_OVERRIDE_CONFIG = {
  kind: 'override' as const,
  id: 'okta',
  relationshipKey: 'communicates_with' as const,
};
const OWNS_OVERRIDE_CONFIG = {
  kind: 'override' as const,
  id: 'hypothetical_owns_override',
  relationshipKey: 'owns' as const,
};

const createLogger = () => loggingSystemMock.createLogger();

describe('parseTargetsPerActorRows — accesses', () => {
  it('returns [] for empty values', () => {
    expect(parseTargetsPerActorRows(ACCESSES_COLUMNS, [], ACCESSES_CONFIG, createLogger())).toEqual(
      []
    );
  });

  it('sets entityId to null when actorUserId is null', () => {
    const [rec] = parseTargetsPerActorRows(
      ACCESSES_COLUMNS,
      [[null, null, null]],
      ACCESSES_CONFIG,
      createLogger()
    );
    expect(rec.entityId).toBeNull();
  });

  it('uses actorUserId directly as entityId', () => {
    const [rec] = parseTargetsPerActorRows(
      ACCESSES_COLUMNS,
      [['user:alice@corp', null, null]],
      ACCESSES_CONFIG,
      createLogger()
    );
    expect(rec.entityId).toBe('user:alice@corp');
  });

  it('puts accesses_frequently target EUIDs in flat array', () => {
    const [rec] = parseTargetsPerActorRows(
      ACCESSES_COLUMNS,
      [['user:alice@corp', ['host:D3F5C9B9-web-01', 'host:D3F5C9B9-web-02'], null]],
      ACCESSES_CONFIG,
      createLogger()
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
      ACCESSES_CONFIG,
      createLogger()
    );
    expect(rec.relationships.accesses_infrequently).toEqual(['host:D3F5C9B9-db-01']);
  });

  it('wraps null columns as empty arrays', () => {
    const [rec] = parseTargetsPerActorRows(
      ACCESSES_COLUMNS,
      [['user:alice@corp', null, null]],
      ACCESSES_CONFIG,
      createLogger()
    );
    expect(rec.relationships.accesses_frequently).toEqual([]);
    expect(rec.relationships.accesses_infrequently).toEqual([]);
  });

  it('writes the bucket relationship keys the config declares (engine has no hardcoded names)', () => {
    // Same shape as accesses but with a different schema-valid pair to prove
    // the parser reads keys from config, not from a baked-in literal.
    const ownsConfig = {
      kind: 'bucketed' as const,
      id: 'hypothetical_owns_bucketed',
      bucketTargetByThreshold: {
        threshold: 4,
        aboveThresholdRelationship: 'owns',
        belowThresholdRelationship: 'owns_inferred',
      },
    } as const;
    const [rec] = parseTargetsPerActorRows(
      [
        { name: 'actorUserId', type: 'keyword' },
        { name: 'owns', type: 'keyword' },
        { name: 'owns_inferred', type: 'keyword' },
      ],
      [['user:alice@corp', ['host:1', 'host:2'], 'host:3']],
      ownsConfig,
      createLogger()
    );
    expect(rec.relationships.owns).toEqual(['host:1', 'host:2']);
    expect(rec.relationships.owns_inferred).toEqual(['host:3']);
    expect(rec.relationships.accesses_frequently).toBeUndefined();
    expect(rec.relationships.accesses_infrequently).toBeUndefined();
  });
});

describe('parseTargetsPerActorRows — communicates_with', () => {
  it('puts communicates_with target EUIDs in flat array', () => {
    const [rec] = parseTargetsPerActorRows(
      COMM_COLUMNS,
      [['user:alice@okta', ['user:bob@okta', 'user:carol@okta']]],
      COMM_CONFIG,
      createLogger()
    );
    expect(rec.relationships.communicates_with).toEqual(['user:bob@okta', 'user:carol@okta']);
  });

  it('uses actorUserId directly as entityId', () => {
    const [rec] = parseTargetsPerActorRows(
      COMM_COLUMNS,
      [['user:alice@okta', null]],
      COMM_CONFIG,
      createLogger()
    );
    expect(rec.entityId).toBe('user:alice@okta');
  });
});

describe('parseTargetsPerActorRows — kind: "override" safety net', () => {
  it('does not warn for kind: "standard" / "bucketed" configs even with mismatched columns', () => {
    const logger = createLogger();
    parseTargetsPerActorRows([{ name: 'wrong', type: 'keyword' }], [], ACCESSES_CONFIG, logger);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does not warn when override columns match the relationshipType contract', () => {
    const logger = createLogger();
    parseTargetsPerActorRows(COMM_COLUMNS, [], COMM_OVERRIDE_CONFIG, logger);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns naming the relationshipType column when override is missing it', () => {
    const logger = createLogger();
    parseTargetsPerActorRows(
      [{ name: 'actorUserId', type: 'keyword' }],
      [],
      COMM_OVERRIDE_CONFIG,
      logger
    );
    expect(logger.warn).toHaveBeenCalledTimes(1);
    const message = (logger.warn as jest.Mock).mock.calls[0][0] as string;
    expect(message).toContain('[okta]');
    expect(message).toContain('communicates_with');
    expect(message).toContain('results will be empty');
  });

  it('warns when override is missing actorUserId', () => {
    const logger = createLogger();
    parseTargetsPerActorRows(
      [{ name: 'communicates_with', type: 'keyword' }],
      [],
      COMM_OVERRIDE_CONFIG,
      logger
    );
    expect(logger.warn).toHaveBeenCalledTimes(1);
    const message = (logger.warn as jest.Mock).mock.calls[0][0] as string;
    expect(message).toContain('actorUserId');
  });

  it('warns naming the literal relationshipKey for non-bucketed overrides (no bucket-pair fallback)', () => {
    // Override configs are flat-only by design (the type system disallows
    // override + bucketing). For a `relationshipKey: 'owns'` override the
    // expected column is literally `owns`, not any bucket pair like
    // `owns` + `owns_inferred`. Proves the parser names the literal
    // schema key the override is configured to write to.
    const logger = createLogger();
    parseTargetsPerActorRows(
      [{ name: 'actorUserId', type: 'keyword' }],
      [],
      OWNS_OVERRIDE_CONFIG,
      logger
    );
    expect(logger.warn).toHaveBeenCalledTimes(1);
    const message = (logger.warn as jest.Mock).mock.calls[0][0] as string;
    expect(message).toContain('[hypothetical_owns_override]');
    expect(message).toContain('owns');
    expect(message).not.toContain('owns_inferred');
  });
});
