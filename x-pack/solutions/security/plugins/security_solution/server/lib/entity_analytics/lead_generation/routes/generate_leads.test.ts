/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  persistLeads,
  formatLeadForResponse,
  getEntityStoreLatestIndex,
  fetchAllEntityStoreRecords,
  entityRecordToLeadEntity,
  ENTITY_PAGE_SIZE,
  ENTITY_SOURCE_FIELDS,
} from './generate_leads';
import type { FormattedLead } from './generate_leads';
import type { Lead } from '../types';

const createMockLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: 'lead-1',
  title: 'Test Lead',
  byline: 'A test byline',
  description: 'A test description',
  entities: [{ record: {} as never, type: 'user', name: 'alice', id: 'euid-alice' }],
  tags: ['risk'],
  priority: 7,
  chatRecommendations: ['Investigate user alice'],
  timestamp: '2025-06-01T00:00:00.000Z',
  staleness: 'fresh',
  observations: [
    {
      entityId: 'user:alice',
      moduleId: 'risk_analysis',
      type: 'high_risk_score',
      score: 85,
      severity: 'high',
      confidence: 0.9,
      description: 'High risk score detected',
      metadata: { calculated_score_norm: 85 },
    },
  ],
  ...overrides,
});

const createMockFormattedLead = (overrides: Partial<FormattedLead> = {}): FormattedLead => ({
  id: 'lead-1',
  title: 'Test Lead',
  byline: 'A test byline',
  description: 'A test description',
  entities: [{ type: 'user', name: 'alice' }],
  tags: ['risk'],
  priority: 7,
  staleness: 'fresh',
  chatRecommendations: ['Investigate user alice'],
  observations: [
    {
      entityId: 'user:alice',
      moduleId: 'risk_analysis',
      type: 'high_risk_score',
      score: 85,
      severity: 'high',
      confidence: 0.9,
      description: 'High risk score detected',
      metadata: { calculated_score_norm: 85 },
    },
  ],
  timestamp: '2025-06-01T00:00:00.000Z',
  executionId: 'exec-1',
  ...overrides,
});

describe('generate_leads helpers', () => {
  describe('formatLeadForResponse', () => {
    it('maps lead fields and attaches executionId', () => {
      const lead = createMockLead();
      const result = formatLeadForResponse(lead, 'exec-abc');

      expect(result.id).toBe('lead-1');
      expect(result.executionId).toBe('exec-abc');
      expect(result.title).toBe('Test Lead');
      expect(result.priority).toBe(7);
      expect(result.staleness).toBe('fresh');
    });

    it('strips the full entity record, keeping only type and name', () => {
      const lead = createMockLead({
        entities: [
          {
            record: { some: 'full-record' } as never,
            type: 'host',
            name: 'server-01',
            id: 'euid-server-01',
          },
        ],
      });
      const result = formatLeadForResponse(lead, 'exec-1');

      expect(result.entities).toEqual([{ type: 'host', name: 'server-01' }]);
    });

    it('maps observation fields without extra properties', () => {
      const result = formatLeadForResponse(createMockLead(), 'exec-1');

      expect(result.observations).toHaveLength(1);
      const obs = result.observations[0];
      expect(Object.keys(obs).sort()).toEqual([
        'confidence',
        'description',
        'entityId',
        'metadata',
        'moduleId',
        'score',
        'severity',
        'type',
      ]);
    });
  });

  describe('persistLeads', () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('bulk indexes leads and deletes stale docs', async () => {
      const leads: FormattedLead[] = [
        createMockFormattedLead({ id: 'lead-1' }),
        createMockFormattedLead({ id: 'lead-2' }),
      ];

      await persistLeads(esClient, 'default', 'adhoc', leads, 'exec-1', logger);

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      const bulkCall = esClient.bulk.mock.calls[0][0] as { body: unknown[] };
      expect(bulkCall.body).toHaveLength(4);

      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(esClient.deleteByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { bool: { must_not: [{ term: { executionId: 'exec-1' } }] } },
          refresh: true,
          conflicts: 'proceed',
          ignore_unavailable: true,
        })
      );
    });

    it('uses the correct index name for the given space and mode', async () => {
      await persistLeads(
        esClient,
        'my-space',
        'scheduled',
        [createMockFormattedLead()],
        'exec-1',
        logger
      );

      const bulkCall = esClient.bulk.mock.calls[0][0] as {
        body: Array<{ index?: { _index: string } }>;
      };
      expect(bulkCall.body[0].index?._index).toBe(
        '.internal.scheduled.entity-analytics.entity-leads.entity-my-space'
      );
    });

    it('still deletes stale docs when leads array is empty', async () => {
      await persistLeads(esClient, 'default', 'adhoc', [], 'exec-1', logger);

      expect(esClient.bulk).not.toHaveBeenCalled();
      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
    });

    it('uses wait_for refresh on bulk to ensure new docs are searchable before cleanup', async () => {
      await persistLeads(
        esClient,
        'default',
        'adhoc',
        [createMockFormattedLead()],
        'exec-1',
        logger
      );

      expect(esClient.bulk).toHaveBeenCalledWith(expect.objectContaining({ refresh: 'wait_for' }));
    });

    it('logs a warning when persistence fails', async () => {
      esClient.bulk.mockRejectedValueOnce(new Error('cluster unavailable'));

      await persistLeads(
        esClient,
        'default',
        'adhoc',
        [createMockFormattedLead()],
        'exec-1',
        logger
      );

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to persist leads'));
    });

    it('indexes each lead with its id as the document _id', async () => {
      const leads = [
        createMockFormattedLead({ id: 'aaa' }),
        createMockFormattedLead({ id: 'bbb' }),
      ];

      await persistLeads(esClient, 'default', 'adhoc', leads, 'exec-1', logger);

      const bulkCall = esClient.bulk.mock.calls[0][0] as {
        body: Array<{ index?: { _id: string } }>;
      };
      expect(bulkCall.body[0].index?._id).toBe('aaa');
      expect(bulkCall.body[2].index?._id).toBe('bbb');
    });
  });

  describe('getEntityStoreLatestIndex', () => {
    it('returns the V2 unified index for the default namespace', () => {
      expect(getEntityStoreLatestIndex('default')).toBe('.entities.v2.latest.security_default');
    });

    it('returns the V2 unified index for a custom namespace', () => {
      expect(getEntityStoreLatestIndex('my-space')).toBe('.entities.v2.latest.security_my-space');
    });
  });

  describe('entityRecordToLeadEntity', () => {
    it('prefers EngineMetadata.Type over entity.type for the type field', () => {
      const record = {
        entity: {
          id: 'euid-1',
          name: 'alice',
          type: 'Identity',
          EngineMetadata: { Type: 'user' },
        },
      } as never;
      const result = entityRecordToLeadEntity(record);

      expect(result.type).toBe('user');
      expect(result.name).toBe('alice');
      expect(result.id).toBe('euid-1');
      expect(result.record).toBe(record);
    });

    it('falls back to entity.type when EngineMetadata.Type is missing', () => {
      const record = { entity: { id: 'euid-1', name: 'alice', type: 'user' } } as never;
      const result = entityRecordToLeadEntity(record);

      expect(result.type).toBe('user');
    });

    it('falls back to entity.id for name when entity.name is missing', () => {
      const record = {
        entity: { id: 'euid-host-1', type: 'Host', EngineMetadata: { Type: 'host' } },
      } as never;
      const result = entityRecordToLeadEntity(record);

      expect(result.name).toBe('euid-host-1');
      expect(result.id).toBe('euid-host-1');
      expect(result.type).toBe('host');
    });

    it('falls back to entity.name for id when entity.id is missing', () => {
      const record = { entity: { name: 'alice', type: 'user' } } as never;
      const result = entityRecordToLeadEntity(record);

      expect(result.name).toBe('alice');
      expect(result.id).toBe('alice');
    });

    it('falls back to "unknown" for all fields when entity is minimal', () => {
      const record = { entity: {} } as never;
      const result = entityRecordToLeadEntity(record);

      expect(result.type).toBe('unknown');
      expect(result.name).toBe('unknown');
      expect(result.id).toBe('unknown');
    });
  });

  describe('fetchAllEntityStoreRecords', () => {
    const logger = loggingSystemMock.createLogger();
    let esClient: ReturnType<
      typeof elasticsearchClientMock.createScopedClusterClient
    >['asCurrentUser'];

    beforeEach(() => {
      jest.clearAllMocks();
      esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    });

    it('queries the V2 unified entity store index', async () => {
      esClient.search.mockResolvedValueOnce({ hits: { hits: [] } } as never);

      await fetchAllEntityStoreRecords(esClient, 'default', logger);

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.entities.v2.latest.security_default',
        })
      );
    });

    it('includes _source filtering and ignore_unavailable', async () => {
      esClient.search.mockResolvedValueOnce({ hits: { hits: [] } } as never);

      await fetchAllEntityStoreRecords(esClient, 'default', logger);

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          _source: ENTITY_SOURCE_FIELDS,
          ignore_unavailable: true,
          size: ENTITY_PAGE_SIZE,
        })
      );
    });

    it('accumulates entities across paginated responses', async () => {
      const page1Hits = Array.from({ length: ENTITY_PAGE_SIZE }, (_, i) => ({
        _source: { entity: { id: `e-${i}`, name: `entity-${i}`, type: 'user' } },
        sort: [i, `id-${i}`],
      }));
      const page2Hits = [
        {
          _source: { entity: { id: 'e-last', name: 'entity-last', type: 'host' } },
          sort: [ENTITY_PAGE_SIZE, 'id-last'],
        },
      ];

      esClient.search
        .mockResolvedValueOnce({ hits: { hits: page1Hits } } as never)
        .mockResolvedValueOnce({ hits: { hits: page2Hits } } as never);

      const results = await fetchAllEntityStoreRecords(esClient, 'default', logger);

      expect(results).toHaveLength(ENTITY_PAGE_SIZE + 1);
      expect(esClient.search).toHaveBeenCalledTimes(2);

      const secondCall = esClient.search.mock.calls[1][0] as { search_after: unknown[] };
      expect(secondCall.search_after).toEqual([ENTITY_PAGE_SIZE - 1, `id-${ENTITY_PAGE_SIZE - 1}`]);
    });

    it('returns empty array and logs a warning on search failure', async () => {
      esClient.search.mockRejectedValueOnce(new Error('index_not_found'));

      const results = await fetchAllEntityStoreRecords(esClient, 'default', logger);

      expect(results).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch entity records')
      );
    });

    it('skips hits without _source', async () => {
      esClient.search.mockResolvedValueOnce({
        hits: {
          hits: [
            { _source: { entity: { id: 'e1', name: 'alice', type: 'user' } }, sort: [1, 'a'] },
            { _source: undefined, sort: [2, 'b'] },
          ],
        },
      } as never);

      const results = await fetchAllEntityStoreRecords(esClient, 'default', logger);

      expect(results).toHaveLength(1);
    });
  });
});
