/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { huntingLeadsSignal } from './hunting_leads';
import type { SignalContext } from './types';

const timeRange = { from: '2026-10-05T00:00:00.000Z', to: '2026-10-12T00:00:00.000Z' };
const LEADS_INDEX = '.entity_analytics.entity-leads.entity-default';
const REASON = 'Hunting leads have never been generated';

const leadHit = {
  _id: 'lead-1',
  _source: {
    id: 'lead-1',
    title: 'Potential credential theft by a.rodriguez',
    byline: 'Privileged user reached a production host',
    priority: 9,
    timestamp: '2026-10-08T22:16:04.690Z',
    entity: { type: 'user', name: 'a.rodriguez', id: 'user:a.rodriguez@acme.example@okta' },
    observations: [
      { type: 'high_risk_score' },
      { type: 'new_infrequent_access' },
      { type: 'high_risk_score' },
    ],
    top_related_entities: [
      { id: 'host:laptop', type: 'host', name: 'LAPTOP-FIN03' },
      { id: 'host:jump-box', type: 'host', name: 'jump-box-01' },
      // The subject is never linked to itself.
      { id: 'user:a.rodriguez@acme.example@okta', type: 'user', name: 'a.rodriguez' },
    ],
  },
};

describe('huntingLeadsSignal', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const abortSignal = new AbortController().signal;
  const ctx: SignalContext = {
    esClient,
    spaceId: 'default',
    timeRange,
    now: new Date(timeRange.to),
    logger: loggingSystemMock.createLogger(),
    user: { username: 'elastic' },
    getCasesClient: async () => undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAvailable', () => {
    it('is available when the leads index has documents', async () => {
      esClient.count.mockResolvedValue({ count: 2 } as never);

      expect(await huntingLeadsSignal.isAvailable(ctx)).toEqual({ available: true });
      expect(esClient.count).toHaveBeenCalledWith({ index: LEADS_INDEX });
    });

    it('is unavailable when the leads index is empty', async () => {
      esClient.count.mockResolvedValue({ count: 0 } as never);

      expect(await huntingLeadsSignal.isAvailable(ctx)).toEqual({
        available: false,
        reason: REASON,
      });
    });

    it('is unavailable when the leads index does not exist', async () => {
      esClient.count.mockRejectedValue({
        meta: { body: { error: { type: 'index_not_found_exception' } } },
      });

      expect(await huntingLeadsSignal.isAvailable(ctx)).toEqual({
        available: false,
        reason: REASON,
      });
    });

    it('rethrows other errors', async () => {
      esClient.count.mockRejectedValue(new Error('security_exception'));

      await expect(huntingLeadsSignal.isAvailable(ctx)).rejects.toThrow('security_exception');
    });
  });

  describe('run', () => {
    it('searches active leads of the window by priority with the abort signal', async () => {
      esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

      const output = await huntingLeadsSignal.run(ctx, {}, abortSignal);

      expect(output).toEqual({ facts: [], links: [], candidates: [] });
      const [request, options] = esClient.search.mock.calls[0] as [
        estypes.SearchRequest,
        { signal: AbortSignal }
      ];
      expect(request).toMatchObject({
        index: LEADS_INDEX,
        size: 10,
        sort: [{ priority: { order: 'desc' } }, { timestamp: { order: 'desc' } }],
        query: {
          bool: {
            filter: [
              { term: { status: 'active' } },
              { range: { timestamp: { gte: timeRange.from, lte: timeRange.to } } },
            ],
          },
        },
      });
      expect(options.signal).toBe(abortSignal);
    });

    it('emits a lead fact, same_lead links from the subject and the lead entities as candidates', async () => {
      esClient.search.mockResolvedValue({ hits: { hits: [leadHit] } } as never);

      const { facts, links, candidates } = await huntingLeadsSignal.run(ctx, {}, abortSignal);

      const subject = { euid: leadHit._source.entity.id, type: 'user', name: 'a.rodriguez' };
      const laptop = { euid: 'host:laptop', type: 'host', name: 'LAPTOP-FIN03' };
      const jumpBox = { euid: 'host:jump-box', type: 'host', name: 'jump-box-01' };
      expect(facts).toEqual([
        {
          kind: 'lead',
          title: 'Potential credential theft by a.rodriguez',
          at: '2026-10-08T22:16:04.690Z',
          severity: 'critical',
          entities: [subject, laptop, jumpBox],
          numbers: { priority: 9, observations: 3 },
          details: {
            summary: 'Privileged user reached a production host',
            observationTypes: 'high_risk_score, new_infrequent_access',
          },
          source: { type: 'lead', id: 'lead-1', name: 'Potential credential theft by a.rodriguez' },
        },
      ]);
      expect(links).toEqual([
        { type: 'same_lead', from: subject, to: laptop, factIndexes: [0] },
        { type: 'same_lead', from: subject, to: jumpBox, factIndexes: [0] },
      ]);
      expect(candidates).toEqual([subject, laptop, jumpBox]);
    });

    it('maps priority to severity and skips leads without a subject entity', async () => {
      const lead = (id: string, priority: number) => ({
        _id: id,
        _source: { ...leadHit._source, id, priority, top_related_entities: [] },
      });
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            lead('a', 7),
            lead('b', 4),
            lead('c', 2),
            { _id: 'd', _source: { id: 'd', title: 'No subject', priority: 5 } },
          ],
        },
      } as never);

      const { facts, links } = await huntingLeadsSignal.run(ctx, {}, abortSignal);

      expect(facts.map(({ severity }) => severity)).toEqual(['high', 'medium', 'low']);
      expect(links).toEqual([]);
    });
  });
});
