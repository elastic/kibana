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
  type FormattedLead,
} from '../services/lead_generation_service';
import { entityRecordToLeadEntity } from '../entity_conversion';
import type { Lead } from '../types';

const createMockLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: 'lead-1',
  title: 'Test Lead',
  byline: 'A test byline',
  description: 'A test description',
  entities: [{ record: {} as never, type: 'user', name: 'alice' }],
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

describe('lead generation helpers', () => {
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

  describe('entityRecordToLeadEntity', () => {
    it('prefers entity.type and uses entity.name', () => {
      const record = {
        entity: {
          id: 'euid-1',
          name: 'alice',
          type: 'user',
        },
      } as never;
      const result = entityRecordToLeadEntity(record);

      expect(result.type).toBe('user');
      expect(result.name).toBe('alice');
      expect(result.record).toBe(record);
    });

    it('falls back to entity.id for name when entity.name is missing', () => {
      const record = {
        entity: { id: 'euid-host-1', type: 'host' },
      } as never;
      const result = entityRecordToLeadEntity(record);

      expect(result.name).toBe('euid-host-1');
      expect(result.type).toBe('host');
    });

    it('falls back to "unknown" for all fields when entity is minimal', () => {
      const record = { entity: {} } as never;
      const result = entityRecordToLeadEntity(record);

      expect(result.type).toBe('unknown');
      expect(result.name).toBe('unknown');
    });
  });
});
