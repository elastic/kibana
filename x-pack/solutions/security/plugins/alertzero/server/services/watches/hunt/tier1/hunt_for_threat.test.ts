/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { huntForThreat } from './hunt_for_threat';
import type { ResolvedIndexScope } from '@kbn/alertzero-common';

const scope: ResolvedIndexScope = {
  technology: 'aws_iam',
  status: 'ok',
  required: ['logs-aws.*'],
  optional: ['logs-endpoint.events.*', '.alerts-security.alerts-default'],
  missing: [],
  window: { from: '2026-08-19T00:00:00.000Z', to: '2026-09-18T00:00:00.000Z' },
  row_limit: 25,
};

const buildEsClient = (searchResponse: unknown): ElasticsearchClient =>
  ({
    search: jest.fn().mockResolvedValue(searchResponse),
  } as unknown as ElasticsearchClient);

const emptySearchResponse = {
  hits: { total: { value: 0 }, hits: [] },
  aggregations: {
    per_index: { buckets: [] },
    affected_hosts: { buckets: [] },
    affected_users: { buckets: [] },
  },
};

describe('huntForThreat', () => {
  it('returns no_searchable_terms without querying ES when no IOC/technique maps to an ECS field', async () => {
    const esClient = buildEsClient(emptySearchResponse);

    const result = await huntForThreat(esClient, {
      scope,
      iocs: [{ type: 'hash', value: 'too-short-to-map' }],
    });

    expect(result.status).toBe('no_searchable_terms');
    expect(result.has_confirmed_hit).toBe(false);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it.each([
    ['the scope window', undefined, scope.window],
    [
      'an explicit time_range',
      { from: '2026-09-01T00:00:00.000Z', to: '2026-09-02T00:00:00.000Z' },
      { from: '2026-09-01T00:00:00.000Z', to: '2026-09-02T00:00:00.000Z' },
    ],
  ])(
    'bounds the search by %s with an exclusive upper bound, so a boundary event is not confirmed twice',
    async (_label, time_range, expected) => {
      const esClient = buildEsClient(emptySearchResponse);

      await huntForThreat(esClient, {
        scope,
        iocs: [{ type: 'ip', value: '10.0.0.1' }],
        time_range,
      });

      const [[searchBody]] = (esClient.search as jest.Mock).mock.calls;
      expect(searchBody.query.bool.filter).toEqual([
        { range: { '@timestamp': { gte: expected.from, lt: expected.to } } },
      ]);
    }
  );

  it('returns no_environment_hits when the search finds nothing', async () => {
    const esClient = buildEsClient(emptySearchResponse);

    const result = await huntForThreat(esClient, {
      scope,
      iocs: [{ type: 'ip', value: '10.0.0.1' }],
    });

    expect(result.status).toBe('no_environment_hits');
    expect(result.has_confirmed_hit).toBe(false);
    expect(result.counts.total_hits).toBe(0);
  });

  it('sets has_confirmed_hit when a hit lands in a required index', async () => {
    const esClient = buildEsClient({
      hits: {
        total: { value: 1 },
        hits: [
          {
            _index: 'logs-aws.cloudtrail-default',
            _id: 'abc',
            _score: 1.2,
            _source: { '@timestamp': '2026-09-01T00:00:00.000Z', 'source.ip': '10.0.0.1' },
          },
        ],
      },
      aggregations: {
        per_index: { buckets: [{ key: 'logs-aws.cloudtrail-default', doc_count: 1 }] },
        affected_hosts: { buckets: [] },
        affected_users: { buckets: [] },
      },
    });

    const result = await huntForThreat(esClient, {
      scope,
      iocs: [{ type: 'ip', value: '10.0.0.1' }],
    });

    expect(result.status).toBe('environment_hits_found');
    expect(result.has_confirmed_hit).toBe(true);
    expect(result.hits).toHaveLength(1);
  });

  it('returns a slim hit with matched attribution and no source fields', async () => {
    const esClient = buildEsClient({
      hits: {
        total: { value: 1 },
        hits: [
          {
            _index: 'logs-aws.cloudtrail-default',
            _id: 'abc',
            _score: 1.2,
            _source: {
              '@timestamp': '2026-09-01T00:00:00.000Z',
              'source.ip': '10.0.0.1',
              'event.action': 'AssumeRole',
            },
          },
        ],
      },
      aggregations: {
        per_index: { buckets: [{ key: 'logs-aws.cloudtrail-default', doc_count: 1 }] },
        affected_hosts: { buckets: [] },
        affected_users: { buckets: [] },
      },
    });

    const result = await huntForThreat(esClient, {
      scope,
      iocs: [{ type: 'ip', value: '10.0.0.1' }],
    });

    expect(result.hits[0]).toEqual({
      id: 'abc',
      index: 'logs-aws.cloudtrail-default',
      timestamp: '2026-09-01T00:00:00.000Z',
      matched: {
        ioc: { type: 'ip', value: '10.0.0.1' },
        field: 'source.ip',
      },
    });
  });

  it('returns sample_event_summaries from source before hits are slimmed', async () => {
    const esClient = buildEsClient({
      hits: {
        total: { value: 1 },
        hits: [
          {
            _index: 'logs-aws.cloudtrail-default',
            _id: 'abc',
            _score: 1.2,
            _source: {
              '@timestamp': '2026-09-01T00:00:00.000Z',
              'source.ip': '10.0.0.1',
              'event.action': 'AssumeRole',
            },
          },
        ],
      },
      aggregations: {
        per_index: { buckets: [{ key: 'logs-aws.cloudtrail-default', doc_count: 1 }] },
        affected_hosts: { buckets: [] },
        affected_users: { buckets: [] },
      },
    });

    const result = await huntForThreat(esClient, {
      scope,
      iocs: [{ type: 'ip', value: '10.0.0.1' }],
    });

    expect(result.sample_event_summaries?.[0]).toContain('action=AssumeRole');
  });

  it('counts a hit in a data stream backing index toward the required pattern', async () => {
    const backingIndex = '.ds-logs-aws.cloudtrail-default-2026.09.01-000001';
    const esClient = buildEsClient({
      hits: {
        total: { value: 1 },
        hits: [
          {
            _index: backingIndex,
            _id: 'abc',
            _score: 1.2,
            _source: { '@timestamp': '2026-09-01T00:00:00.000Z', 'source.ip': '10.0.0.1' },
          },
        ],
      },
      aggregations: {
        per_index: { buckets: [{ key: backingIndex, doc_count: 1 }] },
        affected_hosts: { buckets: [] },
        affected_users: { buckets: [] },
      },
    });

    const result = await huntForThreat(esClient, {
      scope,
      iocs: [{ type: 'ip', value: '10.0.0.1' }],
    });

    expect(result.has_confirmed_hit).toBe(true);
  });

  it('does NOT set has_confirmed_hit when the only hit is in an optional index', async () => {
    const esClient = buildEsClient({
      hits: {
        total: { value: 1 },
        hits: [
          {
            _index: 'logs-endpoint.events.process-default',
            _id: 'def',
            _score: 0.9,
            _source: { '@timestamp': '2026-09-01T00:00:00.000Z' },
          },
        ],
      },
      aggregations: {
        per_index: { buckets: [{ key: 'logs-endpoint.events.process-default', doc_count: 1 }] },
        affected_hosts: { buckets: [] },
        affected_users: { buckets: [] },
      },
    });

    const result = await huntForThreat(esClient, {
      scope,
      iocs: [{ type: 'ip', value: '10.0.0.1' }],
    });

    expect(result.status).toBe('environment_hits_found');
    expect(result.has_confirmed_hit).toBe(false);
  });

  it('searches both required and optional patterns together with ignore_unavailable', async () => {
    const esClient = buildEsClient(emptySearchResponse);

    await huntForThreat(esClient, { scope, iocs: [{ type: 'ip', value: '10.0.0.1' }] });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: [...scope.required, ...scope.optional],
        ignore_unavailable: true,
        allow_no_indices: true,
        size: scope.row_limit,
      })
    );
  });

  it('honors a caller-supplied time_range and size override', async () => {
    const esClient = buildEsClient(emptySearchResponse);
    const timeRange = { from: '2026-09-17T00:00:00.000Z', to: '2026-09-18T00:00:00.000Z' };

    const result = await huntForThreat(esClient, {
      scope,
      iocs: [{ type: 'ip', value: '10.0.0.1' }],
      time_range: timeRange,
      size: 100,
    });

    expect(result.time_range).toEqual(timeRange);
    expect(esClient.search).toHaveBeenCalledWith(expect.objectContaining({ size: 100 }));
  });

  it('maps technique IDs to both the technique.id and subtechnique.id terms clauses', async () => {
    const esClient = buildEsClient(emptySearchResponse);

    await huntForThreat(esClient, { scope, techniques: ['T1078.004'] });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            should: expect.arrayContaining([
              { terms: { 'kibana.alert.rule.threat.technique.id': ['T1078.004'] } },
              { terms: { 'kibana.alert.rule.threat.technique.subtechnique.id': ['T1078.004'] } },
            ]),
          }),
        }),
      })
    );
  });

  it('upper-cases technique ids before the case-sensitive terms clauses, matching how attribution compares them', async () => {
    const esClient = buildEsClient(emptySearchResponse);

    const result = await huntForThreat(esClient, { scope, techniques: [' t1078.004 '] });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            should: expect.arrayContaining([
              { terms: { 'kibana.alert.rule.threat.technique.id': ['T1078.004'] } },
            ]),
          }),
        }),
      })
    );
    expect(result.resolved_techniques).toEqual(['T1078.004']);
  });

  it('requests the stored threat key, not a path inside it, so alert hits carry their ATT&CK ids', async () => {
    const esClient = buildEsClient(emptySearchResponse);

    await huntForThreat(esClient, { scope, techniques: ['T1078'] });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        _source: expect.arrayContaining(['kibana.alert.rule.threat', 'event.action']),
      })
    );
  });

  it('classifies affected_users buckets into users vs. services by majority non-human identity type', async () => {
    const esClient = buildEsClient({
      hits: { total: { value: 0 }, hits: [] },
      aggregations: {
        per_index: { buckets: [] },
        affected_hosts: { buckets: [] },
        affected_users: {
          buckets: [
            { key: 'dev-user', doc_count: 4, non_human_identity: { doc_count: 0 } },
            { key: 'escalated-role', doc_count: 6, non_human_identity: { doc_count: 6 } },
            // A stray non-human doc does not flip a mostly-human identity.
            { key: 'mixed-user', doc_count: 5, non_human_identity: { doc_count: 2 } },
            // No sub-aggregation at all (field unmapped for this source) stays a user.
            { key: 'legacy-service-account', doc_count: 2 },
          ],
        },
      },
    });

    const result = await huntForThreat(esClient, {
      scope,
      iocs: [{ type: 'ip', value: '10.0.0.1' }],
    });

    expect(result.affected_assets.users).toEqual([
      { name: 'dev-user', hit_count: 4 },
      { name: 'mixed-user', hit_count: 5 },
      { name: 'legacy-service-account', hit_count: 2 },
    ]);
    expect(result.affected_assets.services).toEqual([{ name: 'escalated-role', hit_count: 6 }]);
  });

  it('counts non-human identities with match queries on the base field, so it works on keyword and dynamic text mappings alike', async () => {
    const esClient = buildEsClient(emptySearchResponse);

    await huntForThreat(esClient, { scope, iocs: [{ type: 'ip', value: '10.0.0.1' }] });

    const [{ aggs }] = (esClient.search as jest.Mock).mock.calls[0];
    expect(aggs.affected_users.aggs.non_human_identity).toEqual({
      filter: {
        bool: {
          should: expect.arrayContaining([
            { match: { 'aws.cloudtrail.user_identity.type': 'AssumedRole' } },
            { match: { 'aws.cloudtrail.user_identity.type': 'AWSService' } },
          ]),
          minimum_should_match: 1,
        },
      },
    });
    expect(JSON.stringify(aggs)).not.toContain('.keyword');
  });
});
