/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import type { RelationshipObservationDoc } from '@kbn/entity-store/common';

import { writeRelationshipObservations } from './write_relationship_observations';
import type { EntityRelationshipRecord } from './types';

const baseContext = {
  scanId: '11111111-1111-1111-1111-111111111111',
  maintainerKind: 'accesses_frequently_and_infrequently',
  lookbackWindow: 'now-30d',
  entitySource: 'elastic_defend',
  observedAt: '2026-05-15T10:30:00.000Z',
};

const makeCrudClient = (
  responses: Array<{ status: number; type?: string; reason?: string }> = []
): {
  crudClient: EntityUpdateClient;
  bulkAppend: jest.Mock;
} => {
  const bulkAppend = jest.fn().mockResolvedValue(responses);
  const crudClient = {
    bulkAppendRelationshipObservations: bulkAppend,
  } as unknown as EntityUpdateClient;
  return { crudClient, bulkAppend };
};

const getDocsFromCall = (bulkAppend: jest.Mock): RelationshipObservationDoc[] => {
  const [args] = bulkAppend.mock.calls;
  return args[0] as RelationshipObservationDoc[];
};

describe('writeRelationshipObservations', () => {
  it('does not call the CRUD client when records is empty', async () => {
    const { crudClient, bulkAppend } = makeCrudClient();
    await writeRelationshipObservations(crudClient, loggerMock.create(), [], baseContext);
    expect(bulkAppend).not.toHaveBeenCalled();
  });

  it('emits one doc per (entityId, relType, targetId) triple', async () => {
    const { crudClient, bulkAppend } = makeCrudClient();
    const records: EntityRelationshipRecord[] = [
      {
        entityId: 'user:alice@corp',
        entityType: 'user',
        relationships: { accesses_frequently: ['host:laptopA'] },
      },
    ];
    await writeRelationshipObservations(crudClient, loggerMock.create(), records, baseContext);
    const docs = getDocsFromCall(bulkAppend);
    expect(docs).toHaveLength(1);
  });

  it('fans one entity × one kind × multiple targets into one doc per target', async () => {
    const { crudClient, bulkAppend } = makeCrudClient();
    const records: EntityRelationshipRecord[] = [
      {
        entityId: 'user:alice@corp',
        entityType: 'user',
        relationships: {
          accesses_frequently: ['host:laptopA', 'host:laptopB', 'host:laptopC'],
        },
      },
    ];
    await writeRelationshipObservations(crudClient, loggerMock.create(), records, baseContext);
    const docs = getDocsFromCall(bulkAppend);
    expect(docs).toHaveLength(3);
    const targets = docs.map((d) => d['entity.relationships.accesses_frequently.target']);
    expect(new Set(targets)).toEqual(new Set(['host:laptopA', 'host:laptopB', 'host:laptopC']));
  });

  it('fans multiple entities × multiple kinds × multiple targets correctly', async () => {
    const { crudClient, bulkAppend } = makeCrudClient();
    const records: EntityRelationshipRecord[] = [
      {
        entityId: 'user:alice@corp',
        entityType: 'user',
        relationships: {
          accesses_frequently: ['host:H1', 'host:H2'],
          accesses_infrequently: ['host:H3'],
        },
      },
      {
        entityId: 'user:bob@corp',
        entityType: 'user',
        relationships: {
          accesses_frequently: ['host:H4'],
        },
      },
    ];
    await writeRelationshipObservations(crudClient, loggerMock.create(), records, baseContext);
    const docs = getDocsFromCall(bulkAppend);
    // 2 + 1 + 1 = 4 docs.
    expect(docs).toHaveLength(4);
    const sourceIds = docs.map((d) => d['entity.id']);
    expect(sourceIds.filter((id) => id === 'user:alice@corp')).toHaveLength(3);
    expect(sourceIds.filter((id) => id === 'user:bob@corp')).toHaveLength(1);
  });

  it('skips records with null entityId (cannot identify the source actor)', async () => {
    const { crudClient, bulkAppend } = makeCrudClient();
    const records: EntityRelationshipRecord[] = [
      {
        entityId: null,
        entityType: 'user',
        relationships: { accesses_frequently: ['host:laptopA'] },
      },
    ];
    await writeRelationshipObservations(crudClient, loggerMock.create(), records, baseContext);
    expect(bulkAppend).not.toHaveBeenCalled();
  });

  it('skips records where every relationship array is empty (nothing to observe)', async () => {
    const { crudClient, bulkAppend } = makeCrudClient();
    const records: EntityRelationshipRecord[] = [
      {
        entityId: 'user:alice@corp',
        entityType: 'user',
        relationships: { accesses_frequently: [], accesses_infrequently: [] },
      },
    ];
    await writeRelationshipObservations(crudClient, loggerMock.create(), records, baseContext);
    expect(bulkAppend).not.toHaveBeenCalled();
  });

  describe('doc field population', () => {
    let docs: RelationshipObservationDoc[];

    beforeEach(async () => {
      const { crudClient, bulkAppend } = makeCrudClient();
      const records: EntityRelationshipRecord[] = [
        {
          entityId: 'user:alice@corp',
          entityType: 'user',
          relationships: { accesses_frequently: ['host:laptopA'] },
        },
      ];
      await writeRelationshipObservations(crudClient, loggerMock.create(), records, baseContext);
      docs = getDocsFromCall(bulkAppend);
    });

    it('sets @timestamp to context.observedAt', () => {
      expect(docs[0]['@timestamp']).toBe('2026-05-15T10:30:00.000Z');
    });

    it('sets event.kind to the literal "event"', () => {
      expect(docs[0]['event.kind']).toBe('event');
    });

    it('sets event.action to the literal "relationship_observed"', () => {
      expect(docs[0]['event.action']).toBe('relationship_observed');
    });

    it('sets entity.id to the source actor EUID', () => {
      expect(docs[0]['entity.id']).toBe('user:alice@corp');
    });

    it('sets entity.source to context.entitySource', () => {
      expect(docs[0]['entity.source']).toBe('elastic_defend');
    });

    it('sets entity.relationships.<kind>.target to the target EUID', () => {
      expect(docs[0]['entity.relationships.accesses_frequently.target']).toBe('host:laptopA');
    });

    it('sets Maintainer.kind to context.maintainerKind', () => {
      expect(docs[0].Maintainer.kind).toBe('accesses_frequently_and_infrequently');
    });

    it('sets Maintainer.scan_id to context.scanId', () => {
      expect(docs[0].Maintainer.scan_id).toBe('11111111-1111-1111-1111-111111111111');
    });

    it('sets Maintainer.lookback_window to context.lookbackWindow', () => {
      expect(docs[0].Maintainer.lookback_window).toBe('now-30d');
    });

    it('does NOT set event.ingested (the ingest pipeline owns that field)', () => {
      expect(docs[0]['event.ingested']).toBeUndefined();
    });
  });

  describe('related.* flat lookup arrays', () => {
    it('populates related.user with the source actor username parsed from entity.id', async () => {
      const { crudClient, bulkAppend } = makeCrudClient();
      const records: EntityRelationshipRecord[] = [
        {
          entityId: 'user:alice@corp',
          entityType: 'user',
          relationships: { accesses_frequently: ['host:laptopA'] },
        },
      ];
      await writeRelationshipObservations(crudClient, loggerMock.create(), records, baseContext);
      const docs = getDocsFromCall(bulkAppend);
      expect(docs[0]['related.user']).toEqual(['alice']);
    });

    it('populates related.hosts with the target host name when the target EUID is a host', async () => {
      const { crudClient, bulkAppend } = makeCrudClient();
      const records: EntityRelationshipRecord[] = [
        {
          entityId: 'user:alice@corp',
          entityType: 'user',
          relationships: { accesses_frequently: ['host:laptopA'] },
        },
      ];
      await writeRelationshipObservations(crudClient, loggerMock.create(), records, baseContext);
      const docs = getDocsFromCall(bulkAppend);
      expect(docs[0]['related.hosts']).toEqual(['laptopA']);
    });

    it('omits related.hosts when the target EUID is not a host', async () => {
      const { crudClient, bulkAppend } = makeCrudClient();
      const records: EntityRelationshipRecord[] = [
        {
          entityId: 'user:alice@corp',
          entityType: 'user',
          relationships: { communicates_with: ['user:bob@corp'] },
        },
      ];
      await writeRelationshipObservations(crudClient, loggerMock.create(), records, baseContext);
      const docs = getDocsFromCall(bulkAppend);
      expect(docs[0]['related.hosts']).toBeUndefined();
    });
  });

  describe('error propagation', () => {
    it('does NOT catch CRUDClient exceptions — they propagate to the boundary', async () => {
      const crudClient = {
        bulkAppendRelationshipObservations: jest
          .fn()
          .mockRejectedValue(new Error('bulk transport failure')),
      } as unknown as EntityUpdateClient;
      const records: EntityRelationshipRecord[] = [
        {
          entityId: 'user:alice@corp',
          entityType: 'user',
          relationships: { accesses_frequently: ['host:laptopA'] },
        },
      ];
      await expect(
        writeRelationshipObservations(crudClient, loggerMock.create(), records, baseContext)
      ).rejects.toThrow(/bulk transport failure/);
    });

    it('logs at error level when bulkAppend returns failed items but does not throw', async () => {
      const logger = loggerMock.create();
      const { crudClient } = makeCrudClient([
        { status: 503, type: 'cluster_block_exception', reason: 'read-only' },
      ]);
      const records: EntityRelationshipRecord[] = [
        {
          entityId: 'user:alice@corp',
          entityType: 'user',
          relationships: { accesses_frequently: ['host:laptopA'] },
        },
      ];
      await writeRelationshipObservations(crudClient, logger, records, baseContext);
      expect(logger.error).toHaveBeenCalled();
    });

    it('logs at info level (not error) when bulkAppend returns no failures', async () => {
      const logger = loggerMock.create();
      const { crudClient } = makeCrudClient();
      const records: EntityRelationshipRecord[] = [
        {
          entityId: 'user:alice@corp',
          entityType: 'user',
          relationships: { accesses_frequently: ['host:laptopA'] },
        },
      ];
      await writeRelationshipObservations(crudClient, logger, records, baseContext);
      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
