/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { MitrePopulationService } from './mitre_population_service';
import type { CoreSetup, CoreStart, Logger } from '@kbn/core/server';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';

// Mock fs/promises so we don't read actual file in tests
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

// Mock @kbn/lock-manager so withLock just invokes the callback by default.
// Tests that need to assert on withLock calls override mockWithLock per-test.
jest.mock('@kbn/lock-manager', () => ({
  LockManagerService: jest.fn().mockImplementation(() => ({
    withLock: jest.fn((_lockId: string, fn: () => Promise<unknown>) => fn()),
  })),
  isLockAcquisitionError: jest.fn(() => false),
}));

import { readFile } from 'fs/promises';
import { LockManagerService } from '@kbn/lock-manager';

// Captured in beforeEach so each test can assert on withLock calls.
let mockWithLock: jest.Mock;

const ARTIFACT_VERSION = '19.1';

const MOCK_ENTITIES = [
  {
    type: 'tactic',
    framework: 'enterprise',
    framework_version: ARTIFACT_VERSION,
    id: 'TA0001',
    name: 'Initial Access',
    reference: 'https://attack.mitre.org/tactics/TA0001/',
    description: 'The adversary is trying to get into your network.',
    revoked: false,
    deprecated: false,
    position: 0,
  },
  {
    type: 'technique',
    framework: 'enterprise',
    framework_version: ARTIFACT_VERSION,
    id: 'T1001',
    name: 'Data Obfuscation',
    reference: 'https://attack.mitre.org/techniques/T1001/',
    description: 'Adversaries may obfuscate data.',
    revoked: false,
    deprecated: false,
    tactic_ids: ['TA0001'],
  },
];

// Compute content_hash using the same algorithm as the build script: sort by id, SHA-256.
const CONTENT_HASH = createHash('sha256')
  .update(
    JSON.stringify([...MOCK_ENTITIES].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)))
  )
  .digest('hex');

const MOCK_ARTIFACT = {
  framework: 'enterprise',
  framework_version: ARTIFACT_VERSION,
  content_hash: CONTENT_HASH,
  entities: MOCK_ENTITIES,
};

// Build a mock ES hit as the saved-objects raw search would return it.
const makeMockHit = (entity: (typeof MOCK_ENTITIES)[0]) => ({
  _id: `mitre-attack-entity:${entity.framework}:${entity.framework_version}:${entity.id}`,
  _source: {
    'mitre-attack-entity': {
      name: entity.name,
      description: entity.description,
    },
  },
});

const MOCK_HITS = MOCK_ENTITIES.map(makeMockHit);

const makeInferenceClient = () => ({
  inference: jest.fn().mockResolvedValue({}),
});

const makeRepository = (
  overrides: Partial<ISavedObjectsRepository> = {}
): jest.Mocked<ISavedObjectsRepository> =>
  ({
    get: jest.fn(),
    create: jest.fn().mockResolvedValue({
      id: 'population-status',
      type: 'mitre-attack-population-meta',
      attributes: {},
      references: [],
    }),
    bulkCreate: jest.fn().mockResolvedValue({ saved_objects: [] }),
    bulkUpdate: jest.fn().mockResolvedValue({
      saved_objects: MOCK_ENTITIES.map((e) => ({
        id: `enterprise:${ARTIFACT_VERSION}:${e.id}`,
        type: 'mitre-attack-entity',
        attributes: {},
      })),
    }),
    search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
    ...overrides,
  } as unknown as jest.Mocked<ISavedObjectsRepository>);

const makeCoreMocks = (
  repository: jest.Mocked<ISavedObjectsRepository>,
  inferenceClient = makeInferenceClient()
) => {
  const coreStart = {
    savedObjects: {
      createInternalRepository: jest.fn().mockReturnValue(repository),
    },
    elasticsearch: {
      client: {
        asInternalUser: {
          inference: inferenceClient,
        },
      },
    },
  } as unknown as CoreStart;

  const coreSetup = {
    getStartServices: jest.fn().mockResolvedValue([coreStart]),
  } as unknown as CoreSetup;

  return { coreStart, coreSetup };
};

const makeLogger = (): Logger =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    get: jest.fn().mockReturnThis(),
  } as unknown as Logger);

const makeNotFoundError = () =>
  Object.assign(new Error('Not Found'), { output: { statusCode: 404 } });

beforeEach(() => {
  (readFile as jest.Mock).mockResolvedValue(JSON.stringify(MOCK_ARTIFACT));
  mockWithLock = jest.fn((_lockId: string, fn: () => Promise<unknown>) => fn());
  (LockManagerService as jest.Mock).mockImplementation(() => ({ withLock: mockWithLock }));
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('MitrePopulationService', () => {
  // (a) hash matches marker AND the needs-embedding query returns zero → no lock acquired,
  // no bulkCreate, no bulkUpdate
  describe('(a) hash matches and no docs need embedding', () => {
    it('skips both Phase A and Phase B without acquiring the lock', async () => {
      const repository = makeRepository({
        get: jest.fn().mockResolvedValue({
          id: 'population-status',
          type: 'mitre-attack-population-meta',
          attributes: { artifactVersion: ARTIFACT_VERSION, artifactHash: CONTENT_HASH },
          references: [],
        }),
        // search returns zero hits — embeddings already complete
        search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
      });
      const { coreStart, coreSetup } = makeCoreMocks(repository);
      const logger = makeLogger();
      const service = new MitrePopulationService(coreSetup, logger);

      await service.run(coreStart);

      // Lock must never be acquired when there is nothing to do.
      expect(mockWithLock).not.toHaveBeenCalled();
      expect(repository.bulkCreate).not.toHaveBeenCalled();
      expect(repository.bulkUpdate).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('current and embeddings complete, nothing to do')
      );
    });
  });

  // (b) hash matches but needs-embedding query returns hits → lock IS acquired, Phase A
  // skipped, Phase B runs. The in-lock Phase B re-queries (does NOT reuse pre-lock result).
  describe('(b) hash matches but some docs are missing embeddings', () => {
    it('acquires the lock, skips Phase A, and runs Phase B; repository.search called twice', async () => {
      const repository = makeRepository({
        get: jest.fn().mockResolvedValue({
          id: 'population-status',
          type: 'mitre-attack-population-meta',
          attributes: { artifactVersion: ARTIFACT_VERSION, artifactHash: CONTENT_HASH },
          references: [],
        }),
        search: jest.fn().mockResolvedValue({ hits: { hits: MOCK_HITS } }),
      });
      const { coreStart, coreSetup } = makeCoreMocks(repository);
      const service = new MitrePopulationService(coreSetup, makeLogger());

      await service.run(coreStart);

      // Lock must be acquired when there is real embedding work.
      expect(mockWithLock).toHaveBeenCalled();
      expect(repository.bulkCreate).not.toHaveBeenCalled();
      expect(repository.bulkUpdate).toHaveBeenCalled();

      // repository.search must be called at least twice: once pre-lock and once inside the lock
      // (Phase B re-queries rather than reusing the pre-lock result — another node may have
      // made progress while we waited for the lock).
      expect(repository.search).toHaveBeenCalledTimes(2);

      // Verify exactly the hits returned by the query are used.
      const allUpdateCalls: Array<{ type: string; id: string }[]> = (
        repository.bulkUpdate as jest.Mock
      ).mock.calls.map(([objects]) => objects);
      const updatedIds = allUpdateCalls.flat().map((o) => o.id);
      expect(updatedIds).toHaveLength(MOCK_ENTITIES.length);
    });
  });

  // pre-lock search throws (e.g. index not yet created on first boot) → lock IS still acquired
  describe('pre-lock search throws → lock is still acquired', () => {
    it('falls through to the lock and runs Phase B when the pre-lock check fails', async () => {
      const repository = makeRepository({
        get: jest.fn().mockResolvedValue({
          id: 'population-status',
          type: 'mitre-attack-population-meta',
          attributes: { artifactVersion: ARTIFACT_VERSION, artifactHash: CONTENT_HASH },
          references: [],
        }),
        // First call (pre-lock) throws; second call (in-lock Phase B) returns MOCK_HITS.
        search: jest
          .fn()
          .mockRejectedValueOnce(new Error('index_not_found_exception'))
          .mockResolvedValueOnce({ hits: { hits: MOCK_HITS } }),
      });
      const { coreStart, coreSetup } = makeCoreMocks(repository);
      const service = new MitrePopulationService(coreSetup, makeLogger());

      await service.run(coreStart);

      // Lock must have been acquired despite the pre-lock check failure.
      expect(mockWithLock).toHaveBeenCalled();
      // Phase B must have run using the in-lock query result.
      expect(repository.bulkUpdate).toHaveBeenCalled();
    });
  });

  // (c) same framework_version but DIFFERENT content_hash → Phase A runs (regression test)
  describe('(c) same framework_version but different content_hash', () => {
    it('Phase A runs even when framework_version matches, because the hash differs', async () => {
      const repository = makeRepository({
        get: jest.fn().mockResolvedValue({
          id: 'population-status',
          type: 'mitre-attack-population-meta',
          // Same framework version, DIFFERENT hash — simulates a corrected rebuild.
          attributes: { artifactVersion: ARTIFACT_VERSION, artifactHash: 'stale-hash-differs' },
          references: [],
        }),
        search: jest.fn().mockResolvedValue({ hits: { hits: MOCK_HITS } }),
      });
      const { coreStart, coreSetup } = makeCoreMocks(repository);
      const service = new MitrePopulationService(coreSetup, makeLogger());

      await service.run(coreStart);

      // Phase A must run — the hash gate must detect the stale content.
      expect(repository.bulkCreate).toHaveBeenCalled();
    });
  });

  // (d) marker absent → Phase A then Phase B
  describe('(d) marker absent', () => {
    it('runs Phase A then Phase B', async () => {
      const repository = makeRepository({
        get: jest.fn().mockRejectedValue(makeNotFoundError()),
        search: jest.fn().mockResolvedValue({ hits: { hits: MOCK_HITS } }),
      });
      const { coreStart, coreSetup } = makeCoreMocks(repository);
      const service = new MitrePopulationService(coreSetup, makeLogger());

      await service.run(coreStart);

      expect(repository.bulkCreate).toHaveBeenCalled();
      expect(repository.bulkUpdate).toHaveBeenCalled();
    });
  });

  // (e) Phase A attributes exclude semantic_content; Phase B attributes include it from ES source
  describe('(e) attribute content', () => {
    it('Phase A creates entities without semantic_content', async () => {
      const repository = makeRepository({
        get: jest.fn().mockRejectedValue(makeNotFoundError()),
        search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
      });
      const { coreStart, coreSetup } = makeCoreMocks(repository);
      const service = new MitrePopulationService(coreSetup, makeLogger());

      await service.run(coreStart);

      expect(repository.bulkCreate).toHaveBeenCalled();
      const [[createdObjects]] = (repository.bulkCreate as jest.Mock).mock.calls;
      for (const obj of createdObjects) {
        expect(obj.attributes).not.toHaveProperty('semantic_content');
      }
    });

    it('Phase B builds semantic_content from the ES document source, not from the artifact', async () => {
      // Provide hits with different name/description than in MOCK_ENTITIES to prove
      // Phase B reads from the stored document source.
      const customHits = [
        {
          _id: 'mitre-attack-entity:enterprise:19.1:TA0001',
          _source: {
            'mitre-attack-entity': {
              name: 'Name From ES',
              description: 'Description From ES',
            },
          },
        },
      ];

      const repository = makeRepository({
        get: jest.fn().mockResolvedValue({
          id: 'population-status',
          type: 'mitre-attack-population-meta',
          attributes: { artifactVersion: ARTIFACT_VERSION, artifactHash: CONTENT_HASH },
          references: [],
        }),
        search: jest.fn().mockResolvedValue({ hits: { hits: customHits } }),
      });
      const { coreStart, coreSetup } = makeCoreMocks(repository);
      const service = new MitrePopulationService(coreSetup, makeLogger());

      await service.run(coreStart);

      expect(repository.bulkUpdate).toHaveBeenCalled();
      const [[updateObjects]] = (repository.bulkUpdate as jest.Mock).mock.calls;
      expect(updateObjects[0].attributes.semantic_content).toBe(
        'Name From ES\n\nDescription From ES'
      );
    });
  });

  // (f) marker written after Phase A contains artifactVersion and artifactHash, no backfillComplete
  describe('(f) marker written after Phase A', () => {
    it('contains artifactVersion and artifactHash and has no backfillComplete key', async () => {
      const repository = makeRepository({
        get: jest.fn().mockRejectedValue(makeNotFoundError()),
        search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
      });
      const { coreStart, coreSetup } = makeCoreMocks(repository);
      const service = new MitrePopulationService(coreSetup, makeLogger());

      await service.run(coreStart);

      expect(repository.create).toHaveBeenCalledWith(
        'mitre-attack-population-meta',
        expect.objectContaining({ artifactVersion: ARTIFACT_VERSION, artifactHash: CONTENT_HASH }),
        expect.any(Object)
      );

      const [[, writtenAttributes]] = (repository.create as jest.Mock).mock.calls;
      expect(writtenAttributes).not.toHaveProperty('backfillComplete');
    });
  });

  // (g) warm-up NOT called when there is nothing to embed
  describe('(g) warm-up not called when there is nothing to embed', () => {
    it('does not call inference when needs-embedding query returns zero hits', async () => {
      const inferenceClient = makeInferenceClient();
      const repository = makeRepository({
        get: jest.fn().mockResolvedValue({
          id: 'population-status',
          type: 'mitre-attack-population-meta',
          attributes: { artifactVersion: ARTIFACT_VERSION, artifactHash: CONTENT_HASH },
          references: [],
        }),
        search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
      });
      const { coreStart, coreSetup } = makeCoreMocks(repository, inferenceClient);
      const service = new MitrePopulationService(coreSetup, makeLogger());

      await service.run(coreStart);

      expect(inferenceClient.inference).not.toHaveBeenCalled();
    });
  });

  // (h) Phase B failures do not write any marker and do not throw
  describe('(h) Phase B failures', () => {
    it('does not write a marker on failures and does not throw', async () => {
      const failureError = { type: 'es_rejected_execution_exception', reason: 'queue full' };
      const repository = makeRepository({
        get: jest.fn().mockRejectedValue(makeNotFoundError()),
        search: jest.fn().mockResolvedValue({ hits: { hits: MOCK_HITS } }),
        bulkUpdate: jest.fn().mockResolvedValue({
          saved_objects: MOCK_ENTITIES.map((e) => ({
            id: `enterprise:${ARTIFACT_VERSION}:${e.id}`,
            type: 'mitre-attack-entity',
            attributes: {},
            error: failureError,
          })),
        }),
      });
      const { coreStart, coreSetup } = makeCoreMocks(repository);
      const logger = makeLogger();
      const service = new MitrePopulationService(coreSetup, logger);

      // Should not throw.
      await expect(service.run(coreStart)).resolves.toBeUndefined();

      // Phase A marker is written (marker absent → Phase A ran), but no second marker after Phase B.
      // create should be called exactly once (the Phase A writeMarker).
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('next startup will retry automatically')
      );
    });
  });

  describe('uses deterministic id: framework:framework_version:id', () => {
    it('passes correct id format to bulkCreate', async () => {
      const repository = makeRepository({
        get: jest.fn().mockRejectedValue(makeNotFoundError()),
        search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
      });
      const { coreStart, coreSetup } = makeCoreMocks(repository);
      const service = new MitrePopulationService(coreSetup, makeLogger());

      await service.run(coreStart);

      const [[createdObjects]] = (repository.bulkCreate as jest.Mock).mock.calls;
      expect(createdObjects[0].id).toBe(
        `${MOCK_ENTITIES[0].framework}:${MOCK_ENTITIES[0].framework_version}:${MOCK_ENTITIES[0].id}`
      );
    });
  });

  describe('missing content_hash in artifact', () => {
    it('throws with a clear error message', async () => {
      (readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({ framework: 'enterprise', framework_version: '19.1', entities: [] })
      );
      const repository = makeRepository({
        get: jest.fn().mockRejectedValue(makeNotFoundError()),
      });
      const { coreStart, coreSetup } = makeCoreMocks(repository);
      const logger = makeLogger();
      const service = new MitrePopulationService(coreSetup, logger);

      await service.run(coreStart);

      // The inner throw is caught by run() and logged as an error.
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('missing content_hash'));
    });
  });
});
