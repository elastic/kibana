/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { EnrichmentRegistry } from './enrichment';
import type { EnrichmentStrategy } from './enrichment';
import type { ExtractedEntity } from './types';
import { DEFAULT_PIPELINE_CONFIG } from './types';

const logger = loggingSystemMock.createLogger();

const makeEntity = (typeKey: string, value: string): ExtractedEntity => ({
  typeKey: typeKey as ExtractedEntity['typeKey'],
  value,
  sourceField: 'test.field',
  alertId: 'alert-1',
});

const makePassthroughStrategy = (id: string, enrichCount: number = 0): EnrichmentStrategy => ({
  id,
  name: `Test ${id}`,
  enrich: async ({ entities }) => ({
    enrichedEntities: entities.map((e) => ({ ...e })),
    stats: { totalEnriched: enrichCount, bySource: { [id]: enrichCount } },
  }),
});

const makeFailingStrategy = (id: string): EnrichmentStrategy => ({
  id,
  name: `Failing ${id}`,
  enrich: async () => {
    throw new Error(`${id} failed`);
  },
});

describe('EnrichmentRegistry', () => {
  it('runs all registered strategies in order', async () => {
    const registry = new EnrichmentRegistry();
    const callOrder: string[] = [];

    const strategyA: EnrichmentStrategy = {
      id: 'a',
      name: 'A',
      enrich: async ({ entities }) => {
        callOrder.push('a');
        return {
          enrichedEntities: entities.map((e) => ({ ...e })),
          stats: { totalEnriched: 0, bySource: {} },
        };
      },
    };
    const strategyB: EnrichmentStrategy = {
      id: 'b',
      name: 'B',
      enrich: async ({ entities }) => {
        callOrder.push('b');
        return {
          enrichedEntities: entities.map((e) => ({ ...e })),
          stats: { totalEnriched: 0, bySource: {} },
        };
      },
    };

    registry.register(strategyA);
    registry.register(strategyB);

    await registry.runAll({
      entities: [makeEntity('ipv4', '10.0.0.1')],
      config: DEFAULT_PIPELINE_CONFIG,
      logger,
    });

    expect(callOrder).toEqual(['a', 'b']);
  });

  it('returns combined stats from multiple strategies', async () => {
    const registry = new EnrichmentRegistry();
    registry.register(makePassthroughStrategy('ti', 2));
    registry.register(makePassthroughStrategy('ml', 1));

    const result = await registry.runAll({
      entities: [makeEntity('ipv4', '10.0.0.1')],
      config: DEFAULT_PIPELINE_CONFIG,
      logger,
    });

    expect(result.stats.totalEnriched).toBe(3);
    expect(result.stats.bySource).toEqual({ ti: 2, ml: 1 });
  });

  it('continues running after a strategy failure', async () => {
    const registry = new EnrichmentRegistry();
    registry.register(makeFailingStrategy('broken'));
    registry.register(makePassthroughStrategy('working', 1));

    const result = await registry.runAll({
      entities: [makeEntity('ipv4', '10.0.0.1')],
      config: DEFAULT_PIPELINE_CONFIG,
      logger,
    });

    expect(result.stats.totalEnriched).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("'broken' failed"));
  });

  it('returns empty result for empty entities', async () => {
    const registry = new EnrichmentRegistry();
    registry.register(makePassthroughStrategy('s1'));

    const result = await registry.runAll({
      entities: [],
      config: DEFAULT_PIPELINE_CONFIG,
      logger,
    });

    expect(result.enrichedEntities).toHaveLength(0);
  });
});
