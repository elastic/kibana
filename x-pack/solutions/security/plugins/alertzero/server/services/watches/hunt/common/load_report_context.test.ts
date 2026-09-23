/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loadReportHuntContext } from './load_report_context';

const respond = (hits: unknown[]): SearchResponse<unknown, unknown> =>
  ({
    took: 0,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { hits, total: { value: hits.length, relation: 'eq' } },
  } as unknown as SearchResponse<unknown, unknown>);

const reportHit = {
  _index: '.kibana-threat-reports',
  _id: 'rpt-1',
  _source: {
    content: { body_text: 'AssumeRole into OrgAdminBoundary from a rarely used identity.' },
    extracted: {
      iocs: [
        { type: 'ip', value: '192.0.2.30' },
        { type: 'user', value: 'dev-user' },
        { type: 'hash', value: 'a'.repeat(64) },
        { type: 'email' },
      ],
      ttps: { techniques: ['T1078.004', 'T1098.001'] },
    },
  },
};

describe('loadReportHuntContext', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(respond([reportHit]));
  });

  it('keeps only the IOC kinds Tier 1 can search, with just type and value', async () => {
    const context = await loadReportHuntContext({ esClient, spaceId: 'hunt-a', reportId: 'rpt-1' });
    expect(context?.iocs).toEqual([
      { type: 'ip', value: '192.0.2.30' },
      { type: 'hash', value: 'a'.repeat(64) },
    ]);
  });

  it("carries the report's techniques", async () => {
    const context = await loadReportHuntContext({ esClient, spaceId: 'hunt-a', reportId: 'rpt-1' });
    expect(context?.techniques).toEqual(['T1078.004', 'T1098.001']);
  });

  it("carries the report's body text for Tier 2", async () => {
    const context = await loadReportHuntContext({ esClient, spaceId: 'hunt-a', reportId: 'rpt-1' });
    expect(context?.text).toEqual(expect.stringContaining('AssumeRole'));
  });

  it('clamps body text to the Tier 2 request maxLength', async () => {
    const oversized = 'x'.repeat(200_001);
    esClient.search.mockResolvedValue(
      respond([
        {
          ...reportHit,
          _source: {
            ...reportHit._source,
            content: { body_text: oversized },
          },
        },
      ])
    );
    const context = await loadReportHuntContext({ esClient, spaceId: 'hunt-a', reportId: 'rpt-1' });
    expect(context?.text).toHaveLength(200_000);
  });

  it('scopes the lookup to the acting space', async () => {
    await loadReportHuntContext({ esClient, spaceId: 'hunt-a', reportId: 'rpt-1' });
    const query = (esClient.search as unknown as jest.Mock).mock.calls[0][0].query;
    expect(query.bool.filter[0]).toEqual({
      terms: { space_id: expect.arrayContaining(['hunt-a']) },
    });
  });

  it('returns null when the report is not visible in the space', async () => {
    esClient.search.mockResolvedValue(respond([]));
    await expect(
      loadReportHuntContext({ esClient, spaceId: 'hunt-b', reportId: 'rpt-1' })
    ).resolves.toBeNull();
  });
});
