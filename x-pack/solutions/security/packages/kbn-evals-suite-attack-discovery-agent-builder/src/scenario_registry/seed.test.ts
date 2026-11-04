/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import { AD2_ALERTS_INDEX, AD2_SCENARIO_ALL_INDICES, AD2_SCENARIO_SEED_LABEL } from './constants';
import { AD2_DENSE_TARGET_ALERTS } from './dense_scenarios';
import { buildAd2SeedPlan } from './registry';
import { createAd2RunMarker } from './run_marker';
import {
  cleanupAd2ScenarioProfile,
  countAd2ScenarioProfileDocuments,
  seedAd2ScenarioProfile,
} from './seed';
import type { Ad2SeedProfile } from './types';

// Shape of a seeded id (`ids.ts`): the digest of the fixture coordinates, so
// the mocked failure names no scenario.
const REJECTED_DOCUMENT = {
  id: 'ad-scenario-alert-3f7c19ab02d84e51',
  reason: 'failed to parse field [kibana.alert.rule.name]',
};

const buildBulkResponse = (
  count: number,
  failures: Array<{ id: string; reason: string }> = [],
  opKey: 'index' | 'create' = 'index'
) => ({
  errors: failures.length > 0,
  items: Array.from({ length: count }, (_, position) =>
    position < failures.length
      ? {
          [opKey]: {
            _id: failures[position].id,
            status: 400,
            error: { type: 'mapper_parsing_exception', reason: failures[position].reason },
          },
        }
      : { [opKey]: { _id: `doc-${position}`, status: 201 } }
  ),
  took: 1,
  ingest_took: 0,
});

/**
 * The seeding call issues two bulk requests — alerts (`index` op) first, then
 * raw events (`create` op, data streams reject `index`) — so each test
 * rejects exactly one of them, using that call's actual op key.
 */
const buildBulk = (rejectedCall: 1 | 2 | undefined) => {
  let call = 0;
  return jest
    .fn()
    .mockImplementation(({ operations }: { operations: Array<Record<string, unknown>> }) => {
      call += 1;
      const count = operations.length / 2;
      // Read the op the caller actually submitted — the submitted op IS the
      // contract under test (raw events go to data streams, which reject
      // `index`). Simulating the data-stream rejection for a submitted `index`
      // op keeps the mock honest: reverting production to `index` now turns
      // these tests red instead of passing vacuously through a call-count key.
      const opKey =
        operations.length > 0 && Object.prototype.hasOwnProperty.call(operations[0], 'create')
          ? 'create'
          : 'index';
      if (call === 2 && opKey !== 'create') {
        // Data streams reject non-create writes outright; mirror that instead of
        // answering `create`-shaped success for an `index` request.
        return Promise.resolve(
          buildBulkResponse(
            count,
            [
              {
                id: REJECTED_DOCUMENT.id,
                reason: 'only write ops with an op_type of create are allowed in data streams',
              },
            ],
            'index'
          )
        );
      }
      return Promise.resolve(
        call === rejectedCall
          ? buildBulkResponse(count, [REJECTED_DOCUMENT], opKey)
          : buildBulkResponse(count, [], opKey)
      );
    });
};

const buildEsClient = (bulk: jest.Mock): EsClient => ({ bulk } as unknown as EsClient);
const buildFetch = (): HttpHandler => jest.fn().mockResolvedValue({}) as unknown as HttpHandler;
const DENSE_MARKER = createAd2RunMarker('dense-run');

describe('seedAd2ScenarioProfile', () => {
  it('rejects a profile whose alerts were partially rejected', async () => {
    const bulk = buildBulk(1);

    await expect(
      seedAd2ScenarioProfile(buildEsClient(bulk), buildFetch(), {
        profile: 'dense',
        runMarker: DENSE_MARKER,
      })
    ).rejects.toThrow(/mapper_parsing_exception.*failed to parse field/);
  });

  it('rejects a profile whose raw events were partially rejected', async () => {
    const bulk = buildBulk(2);

    await expect(
      seedAd2ScenarioProfile(buildEsClient(bulk), buildFetch(), {
        profile: 'dense',
        runMarker: DENSE_MARKER,
      })
    ).rejects.toThrow(/mapper_parsing_exception.*failed to parse field/);
  });

  it('seeds the dense profile when Elasticsearch accepts every document', async () => {
    const bulk = buildBulk(undefined);

    const summary = await seedAd2ScenarioProfile(buildEsClient(bulk), buildFetch(), {
      profile: 'dense',
      runMarker: DENSE_MARKER,
    });

    expect(summary.alertCount).toBe(AD2_DENSE_TARGET_ALERTS);
    expect(summary.runMarker).toBe(DENSE_MARKER);
    expect(bulk).toHaveBeenCalledTimes(2);
  });

  // The raw-event write must submit `create` ops: raw events go to data
  // streams, which reject `index` outright. Asserting the SUBMITTED op (not
  // the call number) is what makes reverting production to `index` a red
  // test instead of a vacuous green.
  it('submits create ops for the raw-event bulk request', async () => {
    const bulk = buildBulk(undefined);

    await seedAd2ScenarioProfile(buildEsClient(bulk), buildFetch(), {
      profile: 'dense',
      runMarker: DENSE_MARKER,
    });

    const rawEventOperations = (bulk as jest.Mock).mock.calls[1][0].operations as Array<
      Record<string, unknown>
    >;
    expect(rawEventOperations.length).toBeGreaterThan(0);
    // Flat op form: the action descriptor and the document alternate, so every
    // even position carries exactly the `create` action.
    for (let i = 0; i < rawEventOperations.length; i += 2) {
      expect(Object.keys(rawEventOperations[i])).toEqual(['create']);
    }
  });
});

const FIXED_BASE_TIME = new Date('2026-07-01T00:00:00.000Z');

interface SeedOptions {
  readonly profile: Ad2SeedProfile;
  readonly scenarioKey?: string;
  readonly runMarker: string;
}

interface StoredDocument {
  readonly index: string;
  readonly id: string;
  readonly source: Record<string, unknown>;
}

const readField = (source: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>((value, segment) => {
    if (typeof value !== 'object' || value === null) {
      return undefined;
    }
    return (value as Record<string, unknown>)[segment];
  }, source);

/**
 * Evaluates the query the PRODUCTION cleanup builds. A shape it cannot
 * interpret throws rather than matching nothing, so a query change cannot turn
 * these tests green by deleting nothing.
 */
const matchesQuery = (source: Record<string, unknown>, query: unknown): boolean => {
  const clause = query as { term?: Record<string, unknown>; bool?: { filter?: unknown[] } };

  if (clause.term !== undefined) {
    return Object.entries(clause.term).every(
      ([field, value]) => readField(source, field) === value
    );
  }

  if (clause.bool?.filter !== undefined) {
    return clause.bool.filter.every((nested) => matchesQuery(source, nested));
  }

  throw new Error(`the ES double cannot evaluate the query ${JSON.stringify(query)}`);
};

/**
 * In-memory stand-in for the two calls the seed/cleanup pair makes, so a test
 * can run two seeding runs against one "index" and see what a cleanup actually
 * deletes.
 */
const buildStoreClient = () => {
  const documents = new Map<string, StoredDocument>();
  const countMatching = (index: string, query: unknown) =>
    [...documents.values()].filter(
      (document) => document.index === index && matchesQuery(document.source, query)
    ).length;

  const esClient = {
    bulk: jest.fn(async ({ operations }: { operations: unknown[] }) => {
      const items = [];
      for (let position = 0; position < operations.length; position += 2) {
        const action = operations[position] as {
          index?: { _index: string; _id: string };
          create?: { _index: string; _id: string };
        };
        const target = action.index ?? action.create;
        const opKey = action.index !== undefined ? 'index' : 'create';
        const source = operations[position + 1] as Record<string, unknown>;
        documents.set(`${target!._index}\u0000${target!._id}`, {
          index: target!._index,
          id: target!._id,
          source,
        });
        items.push({ [opKey]: { _id: target!._id, status: 201 } });
      }
      return { errors: false, items, took: 1 };
    }),
    deleteByQuery: jest.fn(async ({ index, query }: { index: string; query: unknown }) => {
      for (const [documentKey, document] of documents) {
        if (document.index === index && matchesQuery(document.source, query)) {
          documents.delete(documentKey);
        }
      }
      return { deleted: 1 };
    }),
    count: jest.fn(async ({ index, query }: { index: string; query: unknown }) => ({
      count: countMatching(index, query),
    })),
  };

  return { esClient: esClient as unknown as EsClient, documents };
};

/** What one plan writes, per index — the counts a live index would report. */
const planCountsByIndex = (options: SeedOptions): Record<string, number> => {
  const plan = buildAd2SeedPlan({ ...options, baseTime: FIXED_BASE_TIME });
  const counts: Record<string, number> = {};
  for (const index of AD2_SCENARIO_ALL_INDICES) {
    counts[index] = 0;
  }
  counts[AD2_ALERTS_INDEX] += plan.alerts.length;
  for (const event of plan.rawEvents) {
    counts[event.index] += 1;
  }
  return counts;
};

/** Every index at zero — the counts a cleanup that reached everything leaves. */
const zeroCounts = (): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const index of AD2_SCENARIO_ALL_INDICES) {
    counts[index] = 0;
  }
  return counts;
};

const documentIds = (options: SeedOptions): string[] => {
  const plan = buildAd2SeedPlan({ ...options, baseTime: FIXED_BASE_TIME });
  return [...plan.alerts.map((alert) => alert.id), ...plan.rawEvents.map((event) => event.id)];
};

const seedRun = async (esClient: EsClient, options: SeedOptions) =>
  seedAd2ScenarioProfile(esClient, buildFetch(), { ...options, baseTime: FIXED_BASE_TIME });

describe('cleanupAd2ScenarioProfile', () => {
  const runA: SeedOptions = {
    profile: 'clean',
    scenarioKey: 'encoded-powershell',
    runMarker: createAd2RunMarker('run-a'),
  };
  const runB: SeedOptions = {
    profile: 'clean',
    scenarioKey: 'wmi-lateral',
    runMarker: createAd2RunMarker('run-b'),
  };

  it('deletes only the documents its own run seeded', async () => {
    const { esClient, documents } = buildStoreClient();

    const seededA = await seedRun(esClient, runA);
    await seedRun(esClient, runB);

    // Non-vacuity: the two runs wrote disjoint, non-empty populations, so
    // "A is gone and B is counted" is a statement about scoping and not about
    // an empty index.
    expect(documentIds(runA).length).toBeGreaterThan(0);
    expect(documentIds(runB).length).toBeGreaterThan(0);
    expect(documents.size).toBe(documentIds(runA).length + documentIds(runB).length);

    await cleanupAd2ScenarioProfile(esClient, seededA);

    const remainingIds = new Set([...documents.values()].map((document) => document.id));
    for (const id of documentIds(runA)) {
      expect(remainingIds.has(id)).toBe(false);
    }
    for (const id of documentIds(runB)) {
      expect(remainingIds.has(id)).toBe(true);
    }
    // ...and B is still counted, per index, exactly as its plan describes.
    expect(await countAd2ScenarioProfileDocuments(esClient, runB)).toEqual(planCountsByIndex(runB));
  });

  it('writes a disjoint id space from a concurrent clean run', async () => {
    const { esClient, documents } = buildStoreClient();
    const denseRun: SeedOptions = {
      profile: 'dense',
      runMarker: createAd2RunMarker('dense-run'),
    };
    const cleanRun: SeedOptions = { profile: 'clean', runMarker: createAd2RunMarker('clean-run') };

    await seedRun(esClient, denseRun);
    await seedRun(esClient, cleanRun);

    // The clean profile IS the dense profile minus background chains, so a
    // run-independent id space has the clean seed overwrite four of the dense
    // run's chains in place — 16 alerts and their raw events.
    expect(documents.size).toBe(documentIds(denseRun).length + documentIds(cleanRun).length);
  });

  it("leaves a dense run's population intact when the clean run seeds and cleans up after it", async () => {
    const { esClient } = buildStoreClient();
    const denseRun: SeedOptions = {
      profile: 'dense',
      runMarker: createAd2RunMarker('dense-run'),
    };
    const cleanRun: SeedOptions = { profile: 'clean', runMarker: createAd2RunMarker('clean-run') };

    // The ordering that can fail: the dense run seeds first (its spec's example
    // is the long one), the clean run's whole lifecycle completes while it is
    // still in flight. The clean run re-seeds four of the dense run's chains —
    // and a cleanup keyed on the fixture generation, or on the ids the clean
    // run seeded, takes those four target chains with it.
    await seedRun(esClient, denseRun);
    const seededClean = await seedRun(esClient, cleanRun);

    await cleanupAd2ScenarioProfile(esClient, seededClean);

    // The cleanup did reach the clean run's own documents, so "the dense
    // population is complete" is not the statement of a cleanup that deleted
    // nothing.
    expect(await countAd2ScenarioProfileDocuments(esClient, cleanRun)).toEqual(zeroCounts());
    expect(await countAd2ScenarioProfileDocuments(esClient, denseRun)).toEqual(
      planCountsByIndex(denseRun)
    );
    expect(planCountsByIndex(denseRun)[AD2_ALERTS_INDEX]).toBe(AD2_DENSE_TARGET_ALERTS);
  });

  it('keeps two runs of the same profile disjoint', async () => {
    const { esClient } = buildStoreClient();
    const firstDense: SeedOptions = {
      profile: 'dense',
      runMarker: createAd2RunMarker('dense-one'),
    };
    const secondDense: SeedOptions = {
      profile: 'dense',
      runMarker: createAd2RunMarker('dense-two'),
    };

    await seedRun(esClient, firstDense);
    const seededSecond = await seedRun(esClient, secondDense);

    await cleanupAd2ScenarioProfile(esClient, seededSecond);

    // A second invocation of the same suite against one started stack is the
    // case the shared ids could not survive: the second seed used to overwrite
    // the first run's documents, and the second run's cleanup — which owns them
    // by then — then took them.
    expect(await countAd2ScenarioProfileDocuments(esClient, firstDense)).toEqual(
      planCountsByIndex(firstDense)
    );
    expect(await countAd2ScenarioProfileDocuments(esClient, secondDense)).toEqual(zeroCounts());
  });

  it('stamps the run marker on every document it writes', async () => {
    const { esClient, documents } = buildStoreClient();

    const seeded = await seedRun(esClient, {
      profile: 'dense',
      runMarker: createAd2RunMarker('stamp-run'),
    });

    expect(documents.size).toBeGreaterThan(0);
    expect(seeded.runMarker).toContain(AD2_SCENARIO_SEED_LABEL);
    for (const document of documents.values()) {
      // Every document, not a sample: a document written without the marker is
      // one its own run's cleanup would leave behind, and one a concurrent
      // run's cleanup could take.
      expect(document.source.labels).toEqual({ ad_portable_seed: seeded.runMarker });
    }

    // Root `tags` is the retrieval marker, which only the alerts carry (the raw
    // event indices are not what a live retrieval is scoped over).
    const alerts = [...documents.values()].filter(
      (document) => document.index === AD2_ALERTS_INDEX
    );
    expect(alerts).toHaveLength(AD2_DENSE_TARGET_ALERTS);
    for (const alert of alerts) {
      expect(alert.source.tags).toEqual([seeded.runMarker]);
    }
  });
});
