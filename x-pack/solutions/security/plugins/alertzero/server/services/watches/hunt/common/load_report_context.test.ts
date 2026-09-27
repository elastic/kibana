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

  it('carries the descriptive facts the Investigation narratives cite', async () => {
    esClient.search.mockResolvedValue(
      respond([
        {
          ...reportHit,
          _source: {
            ...reportHit._source,
            '@timestamp': '2026-09-02T17:51:57.050Z',
            content: { ...reportHit._source.content, title: 'CloudTrail retrospective' },
            source: { name: 'AWS IAM privilege escalation feed' },
            severity: { level: 'medium', score: 40 },
          },
        },
      ])
    );
    const context = await loadReportHuntContext({ esClient, spaceId: 'hunt-a', reportId: 'rpt-1' });
    expect(context).toEqual(
      expect.objectContaining({
        title: 'CloudTrail retrospective',
        source_name: 'AWS IAM privilege escalation feed',
        published_at: '2026-09-02T17:51:57.050Z',
        severity: 'medium',
      })
    );
  });

  it('omits descriptive facts the report does not carry instead of writing empty strings', async () => {
    const context = await loadReportHuntContext({ esClient, spaceId: 'hunt-a', reportId: 'rpt-1' });
    expect(context).not.toHaveProperty('title');
    expect(context).not.toHaveProperty('source_name');
    expect(context).not.toHaveProperty('published_at');
    expect(context).not.toHaveProperty('severity');
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

  it('clamps IOC and technique counts to the request-schema maxItems', async () => {
    esClient.search.mockResolvedValue(
      respond([
        {
          ...reportHit,
          _source: {
            ...reportHit._source,
            extracted: {
              iocs: Array.from({ length: 150 }, (_, i) => ({ type: 'ip', value: `10.0.0.${i}` })),
              ttps: { techniques: Array.from({ length: 150 }, (_, i) => `T${1000 + i}`) },
            },
          },
        },
      ])
    );
    const context = await loadReportHuntContext({ esClient, spaceId: 'hunt-a', reportId: 'rpt-1' });
    expect(context?.iocs).toHaveLength(100);
    expect(context?.techniques).toHaveLength(100);
  });

  describe('reporting what the bounds dropped', () => {
    it('names the IOCs and techniques it could not carry', async () => {
      // Clamping silently is the failure mode: an IOC at position 101 reads exactly
      // like one that was searched and found nothing, so the run reports a clean
      // environment and the caller retires the report as hunted.
      esClient.search.mockResolvedValue(
        respond([
          {
            ...reportHit,
            _source: {
              ...reportHit._source,
              extracted: {
                iocs: Array.from({ length: 150 }, (_, i) => ({ type: 'ip', value: `10.0.0.${i}` })),
                ttps: { techniques: Array.from({ length: 130 }, (_, i) => `T${1000 + i}`) },
              },
            },
          },
        ])
      );

      const context = await loadReportHuntContext({
        esClient,
        spaceId: 'hunt-a',
        reportId: 'rpt-1',
      });

      expect(context?.truncated).toEqual({
        iocs: { kept: 100, dropped: 50 },
        techniques: { kept: 100, dropped: 30 },
      });
    });

    it('names the report text it could not carry', async () => {
      esClient.search.mockResolvedValue(
        respond([
          {
            ...reportHit,
            _source: { ...reportHit._source, content: { body_text: 'x'.repeat(200_050) } },
          },
        ])
      );

      const context = await loadReportHuntContext({
        esClient,
        spaceId: 'hunt-a',
        reportId: 'rpt-1',
      });

      expect(context?.truncated).toEqual({ text: { kept: 200_000, dropped: 50 } });
    });

    it('does not count an IOC kind Tier 1 cannot map as dropped coverage', async () => {
      // `user` IOCs are dropped by design, not by the bound, so counting them would
      // report a gap on every report carrying one.
      esClient.search.mockResolvedValue(
        respond([
          {
            ...reportHit,
            _source: {
              ...reportHit._source,
              extracted: {
                iocs: [
                  ...Array.from({ length: 100 }, (_, i) => ({ type: 'ip', value: `10.0.0.${i}` })),
                  { type: 'user', value: 'dev-user' },
                ],
                ttps: { techniques: ['T1078.004'] },
              },
            },
          },
        ])
      );

      const context = await loadReportHuntContext({
        esClient,
        spaceId: 'hunt-a',
        reportId: 'rpt-1',
      });

      expect(context?.iocs).toHaveLength(100);
      expect(context?.truncated).toBeUndefined();
    });

    it('omits the signal entirely when the whole report fitted', async () => {
      const context = await loadReportHuntContext({
        esClient,
        spaceId: 'hunt-a',
        reportId: 'rpt-1',
      });

      expect(context?.truncated).toBeUndefined();
    });
  });

  it('counts a supported IOC value that is too long as lost coverage', async () => {
    // The value-length bound and the unmappable-kind filter used to be one predicate, so an
    // overlength URL was discarded before the count was taken: a report with one short IOC
    // and one long one finished `complete` with the long one never hunted.
    esClient.search.mockResolvedValue(
      respond([
        {
          ...reportHit,
          _source: {
            ...reportHit._source,
            extracted: {
              iocs: [
                { type: 'url', value: 'https://example.test/' + 'a'.repeat(2048) },
                { type: 'ip', value: '192.0.2.30' },
              ],
              ttps: { techniques: ['T1078.004'] },
            },
          },
        },
      ])
    );

    const context = await loadReportHuntContext({ esClient, spaceId: 'hunt-a', reportId: 'rpt-1' });

    expect(context?.iocs).toEqual([{ type: 'ip', value: '192.0.2.30' }]);
    expect(context?.truncated).toEqual({ iocs: { kept: 1, dropped: 0, oversized: 1 } });
  });

  it('does not count an overlength technique id as lost coverage', async () => {
    // A real ATT&CK id is a third of the 32-character bound, so a longer string is malformed
    // input rather than coverage lost, and reporting a gap for it would cry wolf.
    esClient.search.mockResolvedValue(
      respond([
        {
          ...reportHit,
          _source: {
            ...reportHit._source,
            extracted: {
              iocs: [{ type: 'ip', value: '192.0.2.30' }],
              ttps: { techniques: ['T1078.004', 'T'.repeat(33), 42] },
            },
          },
        },
      ])
    );

    const context = await loadReportHuntContext({ esClient, spaceId: 'hunt-a', reportId: 'rpt-1' });

    expect(context?.techniques).toEqual(['T1078.004']);
    expect(context?.truncated).toBeUndefined();
  });

  it('reports both limits when a report hits the count bound and carries a long value', async () => {
    esClient.search.mockResolvedValue(
      respond([
        {
          ...reportHit,
          _source: {
            ...reportHit._source,
            extracted: {
              iocs: [
                ...Array.from({ length: 102 }, (_, i) => ({ type: 'ip', value: `10.0.0.${i}` })),
                { type: 'url', value: 'https://example.test/' + 'a'.repeat(2048) },
              ],
              ttps: { techniques: ['T1078.004'] },
            },
          },
        },
      ])
    );

    const context = await loadReportHuntContext({ esClient, spaceId: 'hunt-a', reportId: 'rpt-1' });

    expect(context?.truncated).toEqual({ iocs: { kept: 100, dropped: 2, oversized: 1 } });
  });

  it('does not count a blank IOC value, which is not coverage either way', async () => {
    esClient.search.mockResolvedValue(
      respond([
        {
          ...reportHit,
          _source: {
            ...reportHit._source,
            extracted: {
              iocs: [
                { type: 'ip', value: ' ' },
                { type: 'ip', value: '192.0.2.30' },
              ],
              ttps: { techniques: ['T1078.004'] },
            },
          },
        },
      ])
    );

    const context = await loadReportHuntContext({ esClient, spaceId: 'hunt-a', reportId: 'rpt-1' });

    expect(context?.iocs).toEqual([{ type: 'ip', value: '192.0.2.30' }]);
    expect(context?.truncated).toBeUndefined();
  });

  it('drops IOC values and technique ids longer than the request schema allows', async () => {
    esClient.search.mockResolvedValue(
      respond([
        {
          ...reportHit,
          _source: {
            ...reportHit._source,
            extracted: {
              iocs: [
                { type: 'url', value: 'https://example.test/' + 'a'.repeat(2048) },
                { type: 'ip', value: '192.0.2.30' },
              ],
              ttps: { techniques: ['T1078.004', 'T'.repeat(33), 42] },
            },
          },
        },
      ])
    );
    const context = await loadReportHuntContext({ esClient, spaceId: 'hunt-a', reportId: 'rpt-1' });
    expect(context?.iocs).toEqual([{ type: 'ip', value: '192.0.2.30' }]);
    expect(context?.techniques).toEqual(['T1078.004']);
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
