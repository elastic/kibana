/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityDefinitionsClient } from '@kbn/entity-store/server';
import { k8sDeploymentFixture } from '../inventory/__fixtures__/definitions';
import { InventoryDefinitionError } from '../inventory/generator';
import { probeAndPlanSources, toTypeDefinitionError } from './planning';

type RegisteredDefinition = Awaited<ReturnType<EntityDefinitionsClient['list']>>[number];

// The first source of `k8sDeploymentFixture` reads KUBELET and the second reads STATE.
const KUBELET = 'metrics-kubeletstatsreceiver.otel-default';
const STATE = 'metrics-kubernetes.state_deployment-*';
const definition: RegisteredDefinition = k8sDeploymentFixture;

// A probe answer: `@timestamp` typed `date` when a time-series index exists behind the pattern.
const probeResponse = (hasTimeSeries: boolean) => ({
  columns: [{ name: '@timestamp', type: hasTimeSeries ? 'date' : 'null' }],
  values: [],
  is_partial: false,
  took: 1,
  documents_found: 0,
});

const answerProbes = (
  esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>,
  { timeSeries = [], fails = [] }: { timeSeries?: string[]; fails?: string[] } = {}
) => {
  esClient.esql.query.mockImplementation(async ({ query }) => {
    const pattern = query.includes(KUBELET) ? KUBELET : STATE;
    if (fails.includes(pattern)) {
      throw Object.assign(new Error('index_not_found_exception'), { statusCode: 404 });
    }
    return probeResponse(timeSeries.includes(pattern));
  });
};

describe('probeAndPlanSources', () => {
  it('plans one FROM query per source when no pattern has a time-series index', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    answerProbes(esClient);

    const { allPlans, probeErrors, failedPatterns } = await probeAndPlanSources(
      esClient,
      definition,
      undefined
    );

    expect(allPlans.map(({ indexPattern, engine }) => ({ indexPattern, engine }))).toEqual([
      { indexPattern: KUBELET, engine: 'FROM' },
      { indexPattern: STATE, engine: 'FROM' },
    ]);
    expect(probeErrors).toEqual([]);
    expect(failedPatterns.size).toBe(0);
  });

  it('plans a TS query before the FROM query of a pattern with a time-series index', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    answerProbes(esClient, { timeSeries: [KUBELET] });

    const { allPlans } = await probeAndPlanSources(esClient, definition, undefined);

    expect(allPlans.map(({ indexPattern, engine }) => ({ indexPattern, engine }))).toEqual([
      { indexPattern: KUBELET, engine: 'TS' },
      { indexPattern: KUBELET, engine: 'FROM' },
      { indexPattern: STATE, engine: 'FROM' },
    ]);
  });

  it('reports a source whose probe failed and still plans every source', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    answerProbes(esClient, { fails: [STATE] });

    const { allPlans, probeErrors, failedPatterns } = await probeAndPlanSources(
      esClient,
      definition,
      undefined
    );

    expect(probeErrors).toEqual([expect.objectContaining({ indexPattern: STATE })]);
    expect([...failedPatterns]).toEqual([STATE]);
    // The columns of a failed source are still derived, so its plan is kept for the caller to drop.
    expect(allPlans.map(({ indexPattern }) => indexPattern)).toEqual([KUBELET, STATE]);
  });

  it('passes the abort signal to the probes', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    answerProbes(esClient);
    const { signal } = new AbortController();

    await probeAndPlanSources(esClient, definition, signal);

    expect(esClient.esql.query.mock.calls.length).toBeGreaterThan(0);
    esClient.esql.query.mock.calls.forEach(([, options]) => expect(options?.signal).toBe(signal));
  });

  it('throws InventoryDefinitionError when the definition cannot be planned', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    answerProbes(esClient);
    const { dynamic, ...withoutDynamic } = definition;

    await expect(probeAndPlanSources(esClient, withoutDynamic, undefined)).rejects.toThrow(
      InventoryDefinitionError
    );
  });
});

describe('toTypeDefinitionError', () => {
  it('turns an InventoryDefinitionError into InventoryTypeDefinitionError and logs it', () => {
    const logger = loggingSystemMock.createLogger();

    const result = toTypeDefinitionError(logger, definition, new InventoryDefinitionError('bad'));

    expect(result).toMatchObject({
      name: 'InventoryTypeDefinitionError',
      statusCode: 400,
      message: 'Entity type "k8s.deployment" cannot be queried: bad',
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Entity type "k8s.deployment" cannot be queried')
    );
  });

  it('returns any other error unchanged and logs nothing', () => {
    const logger = loggingSystemMock.createLogger();
    const error = new Error('crashed');

    expect(toTypeDefinitionError(logger, definition, error)).toBe(error);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
