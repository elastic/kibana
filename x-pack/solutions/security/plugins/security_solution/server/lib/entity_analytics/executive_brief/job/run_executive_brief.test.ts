/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { createInferenceRequestError } from '@kbn/inference-common';
import { FIXTURE_BRIEF } from '../../../../../common/entity_analytics/executive_brief/__fixtures__/brief';
import {
  EUID,
  FIXTURE_ENTITIES,
  FIXTURE_SNAPSHOT,
} from '../../../../../common/entity_analytics/executive_brief/__fixtures__/snapshot';
import type {
  BriefEntity,
  ExecutiveBrief,
  ExecutiveBriefJob,
  GenerateBriefRequestBody,
} from '../../../../../common/entity_analytics/executive_brief/types';
import type { BriefGenerator } from '../generation/types';
import { TemplateBriefGenerator } from '../generation/template_brief_generator';
import type { SnapshotContext } from '../snapshot/context';
import { EvidenceRegistry } from '../snapshot/evidence_registry';
import type { BriefJobPatch, BriefJobStore } from './brief_job_store';
import { BriefJobError } from './job_errors';
import { runExecutiveBrief } from './run_executive_brief';
import type { SnapshotBuilders } from './run_executive_brief';

class FixtureRegistry extends EvidenceRegistry {
  public toCatalog() {
    return FIXTURE_SNAPSHOT.catalog;
  }
}

const params: GenerateBriefRequestBody = {
  timeRange: FIXTURE_SNAPSHOT.timeRange,
  generator: 'template',
  mode: 'names',
};

const createMemoryStore = (
  options: { failOn?: (patch: BriefJobPatch) => boolean } = {}
): BriefJobStore & { doc: ExecutiveBriefJob; patches: BriefJobPatch[] } => {
  const store: BriefJobStore & { doc: ExecutiveBriefJob; patches: BriefJobPatch[] } = {
    doc: {
      id: 'job-1',
      spaceId: 'default',
      status: 'pending',
      createdAt: FIXTURE_SNAPSHOT.generatedAt,
      updatedAt: FIXTURE_SNAPSHOT.generatedAt,
      createdBy: { username: 'elastic' },
      params,
    } as ExecutiveBriefJob,
    patches: [] as BriefJobPatch[],
    ensureIndex: jest.fn(async () => {}),
    create: jest.fn(async () => {}),
    get: jest.fn(async () => store.doc),
    update: jest.fn(async (_id: string, patch: BriefJobPatch) => {
      if (options.failOn?.(patch)) {
        throw new Error('es write failed');
      }
      store.patches.push(patch);
      store.doc = { ...store.doc, ...patch };
    }),
  };
  return store;
};

const entitiesFor = (euids: string[]): Record<string, BriefEntity> =>
  Object.fromEntries(
    euids.flatMap((euid) => (FIXTURE_ENTITIES[euid] ? [[euid, FIXTURE_ENTITIES[euid]]] : []))
  );

const createBuilders = (): jest.Mocked<SnapshotBuilders> => ({
  buildGlance: jest.fn(async (_ctx: SnapshotContext) => ({
    value: {
      glance: {
        ...FIXTURE_SNAPSHOT.glance,
        stats: FIXTURE_SNAPSHOT.glance.stats.filter(({ id }) => id !== 'stagesWithActivity'),
      },
      riskMoverEuids: [EUID.rodriguez],
    },
    sources: { posture: { status: 'ok' as const, tookMs: 1 } },
  })),
  buildStorylines: jest.fn(
    async (
      _ctx: SnapshotContext,
      _input: { materialRiskEuids: string[]; riskMoverEuids: string[] }
    ) => ({
      value: FIXTURE_SNAPSHOT.storylines,
      sources: { storylines: { status: 'ok' as const, tookMs: 2 } },
    })
  ),
  buildBlindSpots: jest.fn(
    async (
      _ctx: SnapshotContext,
      _input: { storylineEuids: string[]; materialRiskEuids: string[] }
    ) => ({
      value: FIXTURE_SNAPSHOT.blindSpots,
      sources: { alertsByTactic: { status: 'ok' as const, tookMs: 3 } },
    })
  ),
  fetchBriefEntities: jest.fn(async (_ctx, euids: string[]) => entitiesFor(euids)),
});

const createContext = (
  abortSignal: AbortSignal = new AbortController().signal
): SnapshotContext => ({
  spaceId: 'default',
  timeRange: FIXTURE_SNAPSHOT.timeRange,
  esClient: elasticsearchServiceMock.createElasticsearchClient(),
  request: httpServerMock.createKibanaRequest(),
  logger: loggingSystemMock.createLogger(),
  abortSignal,
  registry: new FixtureRegistry(),
  services: {},
});

const run = async ({
  store = createMemoryStore(),
  builders = createBuilders(),
  generator = new TemplateBriefGenerator(),
  context = createContext(),
}: {
  store?: ReturnType<typeof createMemoryStore>;
  builders?: jest.Mocked<SnapshotBuilders>;
  generator?: BriefGenerator;
  context?: SnapshotContext;
} = {}) => {
  let tick = 0;
  await runExecutiveBrief({
    briefId: 'job-1',
    params,
    context,
    builders,
    generator,
    store,
    now: () => 1_000 + (tick += 10),
  });
  return { store, builders, context };
};

const generatorReturning = (brief: ExecutiveBrief): BriefGenerator => ({
  kind: 'template',
  generate: jest.fn(async () => ({ brief, tokens: { prompt: 5, completion: 7 } })),
});

describe('runExecutiveBrief', () => {
  describe('success', () => {
    it('persists a validated brief and a complete snapshot', async () => {
      const { store } = await run();
      const { doc } = store;

      expect(doc.status).toBe('succeeded');
      expect(doc.stage).toBe('persist');
      expect(doc.error).toBeUndefined();
      expect(doc.startedAt).toBeDefined();
      expect(doc.completedAt).toBeDefined();
      expect(doc.validation).toEqual({
        totalClaims: 13,
        droppedClaims: 0,
        invalidEvidenceIds: [],
        unbackedRelations: [],
        inventedNumbers: [],
      });
      expect(doc.brief?.storylines).toHaveLength(3);
    });

    it('moves through every stage in order and records a timing for each', async () => {
      const { store } = await run();
      const stages = store.patches.flatMap((patch) => (patch.stage ? [patch.stage] : []));
      expect(stages).toEqual([
        'snapshot',
        'storylines',
        'blind_spots',
        'generate',
        'validate',
        'persist',
      ]);
      expect(Object.keys(store.doc.timings ?? {}).sort()).toEqual(
        ['blind_spots', 'generate', 'persist', 'snapshot', 'storylines', 'validate'].sort()
      );
      expect(store.patches[0]).toMatchObject({ status: 'running', stage: 'snapshot' });
    });

    it('does not let earlier timing writes change after the fact', async () => {
      const { store } = await run();
      const early = store.patches.find((patch) => patch.stage === 'storylines')?.timings;
      expect(Object.keys(early ?? {})).toEqual(['snapshot']);
    });

    it('stores the snapshot before generating so a failed generation keeps it for debugging', async () => {
      const store = createMemoryStore();
      const generator: BriefGenerator = {
        kind: 'template',
        generate: jest.fn(async () => {
          throw new Error('boom');
        }),
      };
      await run({ store, generator });
      expect(store.doc.status).toBe('failed');
      expect(store.doc.snapshot?.storylines.storylines).toHaveLength(3);
    });

    it('derives material-risk euids from High/Critical exposure leaders', async () => {
      const { builders } = await run();
      const expected = [
        EUID.prodHost,
        EUID.laptopFin,
        EUID.rodriguez,
        EUID.jumpBox,
        EUID.noiseUser,
      ];
      expect(builders.buildStorylines).toHaveBeenCalledWith(expect.anything(), {
        materialRiskEuids: expected,
        riskMoverEuids: [EUID.rodriguez],
      });
      expect(builders.buildBlindSpots).toHaveBeenCalledWith(expect.anything(), {
        storylineEuids: expect.arrayContaining([EUID.rodriguez, EUID.chen, EUID.fileServer]),
        materialRiskEuids: expected,
      });
    });

    it('fetches only the entities that the leaders fetch did not already cover', async () => {
      const { builders } = await run();
      expect(builders.fetchBriefEntities).toHaveBeenCalledTimes(2);
      const [, firstEuids] = builders.fetchBriefEntities.mock.calls[0];
      const [, secondEuids] = builders.fetchBriefEntities.mock.calls[1];
      expect(firstEuids).toEqual(FIXTURE_SNAPSHOT.glance.exposureLeaders);
      expect(secondEuids.filter((euid) => firstEuids.includes(euid))).toEqual([]);
      expect(secondEuids).toEqual(
        expect.arrayContaining([EUID.dc, EUID.fileServer, EUID.svcBuild])
      );
    });

    it('skips the second entity fetch when the leaders cover everything', async () => {
      const builders = createBuilders();
      builders.buildGlance.mockResolvedValue({
        value: {
          glance: {
            ...FIXTURE_SNAPSHOT.glance,
            needsAttention: [],
            exposureLeaders: [EUID.prodHost],
          },
          riskMoverEuids: [],
        },
        sources: {},
      });
      builders.buildStorylines.mockResolvedValue({
        value: { storylines: [], otherNotableEntities: [], trace: [] },
        sources: {},
      });
      builders.buildBlindSpots.mockResolvedValue({
        value: {
          attackStages: { stages: [], unmapped: { alerts: 0, share: 0, topRuleEvidenceIds: [] } },
          gaps: [],
        },
        sources: {},
      });
      await run({ builders });
      expect(builders.fetchBriefEntities).toHaveBeenCalledTimes(1);
    });

    it('assembles the snapshot: catalog from the registry, merged sources, fixed now, extra stat', async () => {
      const { store } = await run();
      const snapshot = store.doc.snapshot;
      expect(snapshot?.generatedAt).toBe(FIXTURE_SNAPSHOT.timeRange.to);
      expect(snapshot?.spaceId).toBe('default');
      expect(snapshot?.catalog).toBe(FIXTURE_SNAPSHOT.catalog);
      expect(snapshot?.sources).toEqual({
        posture: { status: 'ok', tookMs: 1 },
        storylines: { status: 'ok', tookMs: 2 },
        alertsByTactic: { status: 'ok', tookMs: 3 },
      });
      expect(Object.keys(snapshot?.entities ?? {})).toEqual(
        expect.arrayContaining([EUID.rodriguez, EUID.dc, EUID.noiseUser])
      );
      expect(snapshot?.glance.stats.find(({ id }) => id === 'stagesWithActivity')).toEqual({
        id: 'stagesWithActivity',
        value: 6,
        upIsBad: true,
      });
    });

    it('counts a stage as active from ML anomalies alone and replaces a stale stat', async () => {
      const builders = createBuilders();
      const [stage, ...rest] = FIXTURE_SNAPSHOT.blindSpots.attackStages.stages;
      builders.buildBlindSpots.mockResolvedValue({
        value: {
          ...FIXTURE_SNAPSHOT.blindSpots,
          attackStages: {
            ...FIXTURE_SNAPSHOT.blindSpots.attackStages,
            stages: [
              { ...stage, observed: { alerts: 0, attackDiscoveries: 0, mlAnomalies: 2 } },
              ...rest.map((s) => ({
                ...s,
                observed: { alerts: 0, attackDiscoveries: 0, mlAnomalies: 0 },
              })),
            ],
          },
        },
        sources: {},
      });
      builders.buildGlance.mockResolvedValue({
        value: { glance: FIXTURE_SNAPSHOT.glance, riskMoverEuids: [] },
        sources: {},
      });
      const { store } = await run({ builders });
      const stats = store.doc.snapshot?.glance.stats.filter(
        ({ id }) => id === 'stagesWithActivity'
      );
      expect(stats).toEqual([{ id: 'stagesWithActivity', value: 1, upIsBad: true }]);
    });

    it('passes the narration mode and abort signal to the generator, and records tokens', async () => {
      const controller = new AbortController();
      const generator = generatorReturning(FIXTURE_BRIEF);
      const { store } = await run({ generator, context: createContext(controller.signal) });
      expect(generator.generate).toHaveBeenCalledWith({
        snapshot: expect.objectContaining({ spaceId: 'default' }),
        mode: 'names',
        abortSignal: controller.signal,
      });
      expect(store.doc.tokens).toEqual({ prompt: 5, completion: 7 });
    });

    it('persists the cleaned brief and reports what the validator dropped', async () => {
      const generator = generatorReturning({
        ...FIXTURE_BRIEF,
        glance: { ...FIXTURE_BRIEF.glance, threatNarrative: '57 entities are compromised.' },
        decisions: [{ ...FIXTURE_BRIEF.decisions[0], evidence: ['RULE-99'] }],
      });
      const { store } = await run({ generator });
      expect(store.doc.status).toBe('succeeded');
      expect(store.doc.validation).toMatchObject({
        droppedClaims: 3,
        inventedNumbers: ['57'],
        invalidEvidenceIds: ['RULE-99'],
      });
      expect(store.doc.brief?.glance.threatNarrative).toBe('');
      expect(store.doc.brief?.decisions).toEqual([]);
    });
  });

  describe('failures map to explicit error codes', () => {
    const failedWith = async (overrides: Parameters<typeof run>[0]) => {
      const { store } = await run(overrides);
      expect(store.doc.status).toBe('failed');
      expect(store.doc.completedAt).toBeDefined();
      expect(store.doc.brief).toBeUndefined();
      return store.doc.error;
    };

    it('unexpected builder error becomes unknown, with the original message', async () => {
      const builders = createBuilders();
      builders.buildStorylines.mockRejectedValue(new Error('storyline query exploded'));
      expect(await failedWith({ builders })).toEqual({
        code: 'unknown',
        message: 'storyline query exploded',
      });
    });

    it('entity fetch failure becomes unknown', async () => {
      const builders = createBuilders();
      builders.fetchBriefEntities.mockRejectedValue(new Error('entity store down'));
      expect(await failedWith({ builders })).toEqual({
        code: 'unknown',
        message: 'entity store down',
      });
    });

    it('a generator BriefJobError keeps its code', async () => {
      const generator: BriefGenerator = {
        kind: 'inference',
        generate: jest.fn(async () => {
          throw new BriefJobError('llm_output', 'Model output is invalid at glance.headline');
        }),
      };
      expect(await failedWith({ generator })).toEqual({
        code: 'llm_output',
        message: 'Model output is invalid at glance.headline',
      });
    });

    it('a connector/provider error becomes connector', async () => {
      const generator: BriefGenerator = {
        kind: 'inference',
        generate: jest.fn(async () => {
          throw createInferenceRequestError('No connector matching id', 404);
        }),
      };
      expect(await failedWith({ generator })).toMatchObject({ code: 'connector' });
    });

    it('an abort during generation becomes timeout', async () => {
      const controller = new AbortController();
      const generator: BriefGenerator = {
        kind: 'inference',
        generate: jest.fn(async () => {
          controller.abort();
          throw new Error('The operation was aborted');
        }),
      };
      expect(
        await failedWith({ generator, context: createContext(controller.signal) })
      ).toMatchObject({ code: 'timeout' });
    });

    it('a signal that is already aborted stops before the first stage and becomes timeout', async () => {
      const controller = new AbortController();
      controller.abort();
      const builders = createBuilders();
      const error = await failedWith({ builders, context: createContext(controller.signal) });
      expect(error).toEqual({
        code: 'timeout',
        message: 'The brief job was aborted before the snapshot stage',
      });
      expect(builders.buildGlance).not.toHaveBeenCalled();
    });

    it('an abort between stages stops at the next stage boundary and keeps earlier timings', async () => {
      const controller = new AbortController();
      const builders = createBuilders();
      builders.buildStorylines.mockImplementation(async () => {
        controller.abort();
        return { value: FIXTURE_SNAPSHOT.storylines, sources: {} };
      });
      const { store } = await run({ builders, context: createContext(controller.signal) });
      expect(store.doc.error).toEqual({
        code: 'timeout',
        message: 'The brief job was aborted before the blind_spots stage',
      });
      expect(Object.keys(store.doc.timings ?? {}).sort()).toEqual(['snapshot', 'storylines']);
      expect(builders.buildBlindSpots).not.toHaveBeenCalled();
    });

    it('records the timing of a stage that failed', async () => {
      const generator: BriefGenerator = {
        kind: 'template',
        generate: jest.fn(async () => {
          throw new Error('boom');
        }),
      };
      const { store } = await run({ generator });
      expect(store.doc.timings?.generate).toBeGreaterThan(0);
      expect(store.doc.timings?.validate).toBeUndefined();
    });

    it('a failed persist write fails the job instead of reporting success', async () => {
      const store = createMemoryStore({ failOn: (patch) => patch.brief !== undefined });
      await run({ store });
      expect(store.doc.status).toBe('failed');
      expect(store.doc.error).toEqual({ code: 'unknown', message: 'es write failed' });
      expect(store.doc.brief).toBeUndefined();
    });

    it('rejects when even the failure cannot be recorded', async () => {
      const store = createMemoryStore({ failOn: () => true });
      await expect(run({ store })).rejects.toThrow('es write failed');
    });

    it('logs failures', async () => {
      const context = createContext();
      const builders = createBuilders();
      builders.buildGlance.mockRejectedValue(new Error('nope'));
      await run({ builders, context });
      expect(context.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('job-1 failed (unknown): nope')
      );
    });
  });
});
