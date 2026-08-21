/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import {
  entityRecordToLeadEntity,
  fetchCandidateEntities,
  resolveDisplayName,
} from './entity_conversion';

type EntityRecord = Parameters<typeof entityRecordToLeadEntity>[0];

const buildRecord = (entity: EntityRecord['entity'] | undefined): EntityRecord =>
  ({ entity } as unknown as EntityRecord);

describe('entityRecordToLeadEntity', () => {
  it('returns a LeadEntity with id, type, and name when the record has an EUID', () => {
    const record = buildRecord({ id: 'user:alice', type: 'user', name: 'Alice Adams' });

    const lead = entityRecordToLeadEntity(record);

    expect(lead).toEqual({
      record,
      id: 'user:alice',
      type: 'user',
      name: 'Alice Adams',
    });
  });

  it('uses EngineMetadata.Type when entity.type is absent', () => {
    const record = buildRecord({
      id: 'host:server-01',
      EngineMetadata: { Type: 'host' },
      name: 'server-01',
    } as EntityRecord['entity']);

    const lead = entityRecordToLeadEntity(record);

    expect(lead?.type).toBe('host');
  });

  it('falls back to id for the display name when entity.name is absent', () => {
    const record = buildRecord({ id: 'user:bob', type: 'user' });

    const lead = entityRecordToLeadEntity(record);

    expect(lead?.name).toBe('user:bob');
  });

  it('returns undefined when entity.id is absent', () => {
    const record = buildRecord({ type: 'user', name: 'Alice Adams' });

    expect(entityRecordToLeadEntity(record)).toBeUndefined();
  });

  it('returns undefined when the entity object itself is missing', () => {
    const record = buildRecord(undefined);

    expect(entityRecordToLeadEntity(record)).toBeUndefined();
  });

  it('returns undefined when entity.id is an empty string', () => {
    const record = buildRecord({ id: '', type: 'user', name: 'Alice' });

    expect(entityRecordToLeadEntity(record)).toBeUndefined();
  });

  it('prefers the type-specific ECS name over entity.name for users', () => {
    const record = {
      entity: { id: 'user:8c67cb16', type: 'user', name: '8c67cb16' },
      user: { name: 'alice.smith', email: ['alice@corp.example'] },
    } as unknown as EntityRecord;

    expect(entityRecordToLeadEntity(record)?.name).toBe('alice.smith');
  });

  it('prefers the type-specific ECS name over entity.name for hosts', () => {
    const record = {
      entity: { id: 'host:guid', EngineMetadata: { Type: 'host' }, name: 'guid' },
      host: { name: 'web-server-01', hostname: ['web-server-01.corp'] },
    } as unknown as EntityRecord;

    expect(entityRecordToLeadEntity(record)?.name).toBe('web-server-01');
  });
});

describe('resolveDisplayName', () => {
  const build = (record: object) => record as Parameters<typeof resolveDisplayName>[0];

  it('uses user.name when present', () => {
    const record = build({ entity: { name: 'guid' }, user: { name: 'jane.doe' } });
    expect(resolveDisplayName(record, 'user', 'user:guid')).toBe('jane.doe');
  });

  it('falls back to user.email when user.name is absent', () => {
    const record = build({ entity: { name: 'guid' }, user: { email: ['jane@corp.example'] } });
    expect(resolveDisplayName(record, 'user', 'user:guid')).toBe('jane@corp.example');
  });

  it('uses host.name, then host.hostname for hosts', () => {
    expect(resolveDisplayName(build({ host: { name: 'h1' } }), 'host', 'host:x')).toBe('h1');
    expect(resolveDisplayName(build({ host: { hostname: ['h1.corp'] } }), 'host', 'host:x')).toBe(
      'h1.corp'
    );
  });

  it('uses service.name for services', () => {
    const record = build({ service: { name: 'billing-api' } });
    expect(resolveDisplayName(record, 'service', 'service:x')).toBe('billing-api');
  });

  it('falls back to entity.name when no type-specific name exists', () => {
    const record = build({ entity: { name: 'Generic Name' } });
    expect(resolveDisplayName(record, 'user', 'user:x')).toBe('Generic Name');
  });

  it('falls back to the id when nothing else is available', () => {
    expect(resolveDisplayName(build({ entity: {} }), 'user', 'user:x')).toBe('user:x');
  });

  it('ignores blank strings when resolving', () => {
    const record = build({ entity: { name: '   ' }, user: { name: '' } });
    expect(resolveDisplayName(record, 'user', 'user:x')).toBe('user:x');
  });
});

describe('fetchCandidateEntities', () => {
  const logger = loggingSystemMock.createLogger();
  const listEntities = jest.fn();
  const crudClient = { listEntities } as unknown as EntityStoreCRUDClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters out records that have no EUID', async () => {
    listEntities.mockResolvedValueOnce({
      entities: [
        { entity: { id: 'user:alice', type: 'user', name: 'Alice' } },
        { entity: { type: 'user', name: 'NoId' } },
        { entity: { id: 'host:server-01', EngineMetadata: { Type: 'host' }, name: 'server-01' } },
      ],
      total: 3,
    });

    const result = await fetchCandidateEntities(crudClient, logger);

    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toEqual(['user:alice', 'host:server-01']);
  });

  it('logs the skipped-without-EUID count when non-zero', async () => {
    listEntities.mockResolvedValueOnce({
      entities: [
        { entity: { id: 'user:alice', type: 'user', name: 'Alice' } },
        { entity: { type: 'user', name: 'NoId' } },
      ],
      total: 2,
    });

    await fetchCandidateEntities(crudClient, logger);

    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('skipped 1 without EUID'));
  });

  it('does not mention skipped entities when all records have an EUID', async () => {
    listEntities.mockResolvedValueOnce({
      entities: [{ entity: { id: 'user:alice', type: 'user', name: 'Alice' } }],
      total: 1,
    });

    await fetchCandidateEntities(crudClient, logger);

    const debugCalls = logger.debug.mock.calls.flat().join(' ');
    expect(debugCalls).not.toContain('skipped');
  });
});
