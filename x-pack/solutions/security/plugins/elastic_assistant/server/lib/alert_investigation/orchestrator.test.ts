/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { CasesServerStart } from '@kbn/cases-plugin/server';
import type { SearchHit, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { runInvestigationPipeline } from './orchestrator';
import { EnrichmentRegistry } from './enrichment';
import type { EnrichmentStrategy, EnrichmentResult } from './enrichment';

const logger = loggingSystemMock.createLogger();
const esClient = elasticsearchServiceMock.createElasticsearchClient();

const mockActionsClient = {} as unknown as PublicMethodsOf<ActionsClient>;
const mockRequest = {} as unknown as KibanaRequest;
const mockSavedObjectsClient = {} as unknown as SavedObjectsClientContract;

const MOCK_ALERTS = [
  {
    _id: 'alert-1',
    _source: {
      kibana: { alert: { rule: { name: 'Brute Force' }, risk_score: 80, workflow_status: 'open' } },
      host: { name: 'web-01' },
      source: { ip: '10.0.0.5' },
      user: { name: 'admin' },
    },
  },
  {
    _id: 'alert-2',
    _source: {
      kibana: {
        alert: { rule: { name: 'Suspicious Download' }, risk_score: 60, workflow_status: 'open' },
      },
      host: { name: 'web-01' },
      source: { ip: '192.168.1.100' },
      process: { name: 'curl' },
    },
  },
];

const createMockCasesClient = () => {
  const mockAttachments = {
    add: jest.fn().mockResolvedValue({ id: 'attachment-1' }),
  };
  const mockCasesApi = {
    find: jest.fn().mockResolvedValue({
      cases: [
        {
          id: 'case-1',
          title: 'Existing Investigation',
          updated_at: new Date().toISOString(),
          observables: [
            { typeKey: 'observable-type-ipv4', value: '10.0.0.5' },
            { typeKey: 'observable-type-hostname', value: 'web-01' },
          ],
        },
      ],
    }),
    create: jest.fn().mockResolvedValue({
      id: 'case-new',
      title: 'Auto-grouped',
    }),
    bulkAddObservables: jest.fn().mockResolvedValue({}),
  };

  return { attachments: mockAttachments, cases: mockCasesApi };
};

const createMockCases = (casesClient: ReturnType<typeof createMockCasesClient>) =>
  ({
    getCasesClientWithRequest: jest.fn().mockResolvedValue(casesClient),
  } as unknown as CasesServerStart);

const mockSearchResponse = (hits: Array<SearchHit<unknown>>): SearchResponse => ({
  hits: { hits, total: { value: hits.length, relation: 'eq' } },
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
});

describe('runInvestigationPipeline (integration)', () => {
  let casesClient: ReturnType<typeof createMockCasesClient>;
  let cases: CasesServerStart;

  beforeEach(() => {
    jest.clearAllMocks();
    casesClient = createMockCasesClient();
    cases = createMockCases(casesClient);

    esClient.search.mockResponse(mockSearchResponse(MOCK_ALERTS as Array<SearchHit<unknown>>));
    esClient.bulk.mockResponse({ errors: false, items: [], took: 1 });
  });

  it('runs the full pipeline in dry-run mode', async () => {
    const result = await runInvestigationPipeline({
      actionsClient: mockActionsClient,
      cases,
      esClient,
      logger,
      request: mockRequest,
      savedObjectsClient: mockSavedObjectsClient,
      spaceId: 'default',
      dryRun: true,
      generateAttackDiscoveriesFn: jest.fn(),
    });

    expect(result.alertsProcessed).toBe(2);
    expect(result.entitiesExtracted).toBeGreaterThan(0);
    expect(result.casesMatched).toBe(0);
    expect(result.casesCreated).toBe(0);
    expect(casesClient.cases.find).not.toHaveBeenCalled();
  });

  it('processes alerts through the full pipeline', async () => {
    const mockGenerate = jest.fn().mockResolvedValue({
      attackDiscoveries: [],
      generationUuid: 'gen-1',
    });

    const casesClientForPipeline = createMockCasesClient();
    casesClientForPipeline.cases.find.mockResolvedValue({
      cases: [
        {
          id: 'case-1',
          title: 'Existing Case',
          updated_at: new Date().toISOString(),
          observables: [{ typeKey: 'observable-type-ipv4', value: '10.0.0.5' }],
        },
      ],
    });

    const casesForRun = {
      getCasesClientWithRequest: jest.fn().mockResolvedValue({
        ...casesClientForPipeline,
        attachments: {
          ...casesClientForPipeline.attachments,
          getAllDocumentsAttachedToCase: jest.fn().mockResolvedValue([{ id: 'alert-1' }]),
        },
      }),
    } as unknown as CasesServerStart;

    esClient.index.mockResponse({ result: 'created' } as ReturnType<
      typeof esClient.index
    > extends Promise<infer R>
      ? R
      : never);
    esClient.indices.exists.mockResponse(true);

    const result = await runInvestigationPipeline({
      actionsClient: mockActionsClient,
      cases: casesForRun,
      esClient,
      logger,
      request: mockRequest,
      savedObjectsClient: mockSavedObjectsClient,
      spaceId: 'default',
      dryRun: false,
      generateAttackDiscoveriesFn: mockGenerate,
    });

    expect(result.alertsProcessed).toBe(2);
    expect(result.errors.length).toBe(0);
    expect(result.executionId).toBeDefined();
    expect(result.completedAt).toBeDefined();
  });

  it('returns no-op result when no unprocessed alerts exist', async () => {
    esClient.search.mockResponse(mockSearchResponse([] as Array<SearchHit<unknown>>));

    const result = await runInvestigationPipeline({
      actionsClient: mockActionsClient,
      cases,
      esClient,
      logger,
      request: mockRequest,
      savedObjectsClient: mockSavedObjectsClient,
      spaceId: 'default',
      generateAttackDiscoveriesFn: jest.fn(),
    });

    expect(result.alertsProcessed).toBe(0);
    expect(result.casesMatched).toBe(0);
    expect(result.casesCreated).toBe(0);
  });

  it('captures errors without crashing the pipeline', async () => {
    casesClient.cases.find.mockRejectedValue(new Error('Cases service unavailable'));

    const result = await runInvestigationPipeline({
      actionsClient: mockActionsClient,
      cases,
      esClient,
      logger,
      request: mockRequest,
      savedObjectsClient: mockSavedObjectsClient,
      spaceId: 'default',
      generateAttackDiscoveriesFn: jest.fn(),
    });

    expect(result.alertsProcessed).toBe(2);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('uses correct index for non-default space', async () => {
    const result = await runInvestigationPipeline({
      actionsClient: mockActionsClient,
      cases,
      esClient,
      logger,
      request: mockRequest,
      savedObjectsClient: mockSavedObjectsClient,
      spaceId: 'sec-ops',
      dryRun: true,
      generateAttackDiscoveriesFn: jest.fn(),
    });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.alerts-security.alerts-sec-ops',
      })
    );
    expect(result.alertsProcessed).toBe(2);
  });

  it('runs enrichment strategies when registry is provided', async () => {
    const mockStrategy: EnrichmentStrategy = {
      id: 'test_strategy',
      name: 'Test Strategy',
      enrich: jest.fn().mockResolvedValue({
        enrichedEntities: MOCK_ALERTS.map((a) => ({
          typeKey: 'hostname',
          value: 'host-enriched',
          sourceField: 'host.name',
          alertId: a._id,
          enrichments: [
            {
              source: 'test',
              type: 'custom',
              severity: 'medium',
              details: { test: true },
              timestamp: '2025-01-01T00:00:00Z',
            },
          ],
        })),
        stats: { totalEnriched: 2, bySource: { test: 2 } },
      } satisfies EnrichmentResult),
    };

    const registry = new EnrichmentRegistry();
    registry.register(mockStrategy);

    const result = await runInvestigationPipeline({
      actionsClient: mockActionsClient,
      cases,
      enrichmentRegistry: registry,
      esClient,
      logger,
      request: mockRequest,
      savedObjectsClient: mockSavedObjectsClient,
      spaceId: 'default',
      dryRun: true,
      generateAttackDiscoveriesFn: jest.fn(),
    });

    expect(mockStrategy.enrich).toHaveBeenCalledTimes(1);
    expect(result.entitiesEnriched).toBe(2);
    expect(result.enrichmentStats).toEqual({ test: 2 });
  });

  it('includes enrichment fields with defaults when no registry is provided', async () => {
    const result = await runInvestigationPipeline({
      actionsClient: mockActionsClient,
      cases,
      esClient,
      logger,
      request: mockRequest,
      savedObjectsClient: mockSavedObjectsClient,
      spaceId: 'default',
      dryRun: true,
      generateAttackDiscoveriesFn: jest.fn(),
    });

    expect(result.entitiesEnriched).toBe(0);
    expect(result.enrichmentStats).toEqual({});
  });
});
