/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { huntForThreat } from './hunt_for_threat';
import type { HuntForThreatParams } from './types';

const scope: HuntForThreatParams['scope'] = {
  search_patterns: ['logs-*', 'filebeat-*', 'winlogbeat-*', '-*elastic-cloud-logs-*'],
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

  describe('a value that normalises to nothing', () => {
    it.each([
      ['a whitespace-only technique', { techniques: [' '] }],
      ['a whitespace-only IOC value', { iocs: [{ type: 'ip' as const, value: '  ' }] }],
      [
        'a blank entry alongside no other searchable input',
        { iocs: [{ type: 'domain' as const, value: '' }], techniques: ['\t'] },
      ],
    ])(
      'reports no_searchable_terms for %s rather than a clean environment',
      async (_label, input) => {
        const esClient = buildEsClient(emptySearchResponse);

        const result = await huntForThreat(esClient, { scope, ...input });

        // A clause built from a blank value matches nothing but still counts towards the
        // guard, so without dropping it the run reads as searched-and-clean.
        expect(result.status).toBe('no_searchable_terms');
        expect(esClient.search).not.toHaveBeenCalled();
      }
    );

    it('drops the blank entry and still searches the real one', async () => {
      const esClient = buildEsClient(emptySearchResponse);

      await huntForThreat(esClient, {
        scope,
        iocs: [
          { type: 'ip', value: ' ' },
          { type: 'ip', value: '10.0.0.1' },
        ],
        techniques: [' ', 't1078.004'],
      });

      const [[searchBody]] = (esClient.search as jest.Mock).mock.calls;
      const serialized = JSON.stringify(searchBody.query.bool.should);
      expect(serialized).toContain('10.0.0.1');
      expect(serialized).toContain('T1078.004');
      expect(serialized).not.toContain('" "');
      expect(serialized).not.toContain('""');
    });

    it('searches a padded value trimmed, not verbatim', async () => {
      // Testing the trimmed length and then searching the raw value is the whole bug: a
      // keyword `term` on `" example.com "` matches no document holding `example.com`, so
      // the run reports clean for a search that could not have matched.
      const esClient = buildEsClient(emptySearchResponse);

      await huntForThreat(esClient, { scope, iocs: [{ type: 'domain', value: ' example.com ' }] });

      const [[searchBody]] = (esClient.search as jest.Mock).mock.calls;
      expect(searchBody.query.bool.should).toEqual(
        expect.arrayContaining([
          { term: { 'dns.question.name': { value: 'example.com', case_insensitive: true } } },
        ])
      );
      expect(JSON.stringify(searchBody.query)).not.toContain(' example.com ');
    });

    it('attributes a hit to the padded IOC once the value is trimmed', async () => {
      const esClient = buildEsClient({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _index: 'logs-aws.cloudtrail-default',
              _id: 'abc',
              _source: {
                '@timestamp': '2026-09-01T00:00:00.000Z',
                dns: { question: { name: 'example.com' } },
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
        iocs: [{ type: 'domain', value: ' example.com ' }],
      });

      // Attribution compares against the same value the query used, so trimming at the
      // source keeps a found hit explainable.
      expect(result.hits[0].matched).toEqual({
        ioc: { type: 'domain', value: 'example.com' },
        field: 'dns.question.name',
      });
      expect(result.has_confirmed_hit).toBe(true);
    });

    it('echoes only what it actually searched for', async () => {
      const esClient = buildEsClient(emptySearchResponse);

      const result = await huntForThreat(esClient, {
        scope,
        iocs: [
          { type: 'ip', value: ' ' },
          { type: 'ip', value: '10.0.0.1' },
        ],
        techniques: [' ', 't1078.004'],
      });

      expect(result.resolved_iocs).toEqual([{ type: 'ip', value: '10.0.0.1' }]);
      expect(result.resolved_techniques).toEqual(['T1078.004']);
      expect(result.searched_iocs).toBe(1);
      expect(result.searched_techniques).toBe(1);
    });
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

  it('sets has_confirmed_hit when hits.total is greater than zero', async () => {
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

  it('reports every per_index bucket as required with no confirming field', async () => {
    const esClient = buildEsClient({
      hits: {
        total: { value: 2 },
        hits: [],
      },
      aggregations: {
        per_index: {
          buckets: [
            { key: 'logs-aws.cloudtrail-default', doc_count: 1 },
            { key: 'logs-endpoint.events.process-default', doc_count: 1 },
          ],
        },
        affected_hosts: { buckets: [] },
        affected_users: { buckets: [] },
      },
    });

    const result = await huntForThreat(esClient, {
      scope,
      iocs: [{ type: 'ip', value: '10.0.0.1' }],
    });

    expect(result.per_index).toEqual([
      { index: 'logs-aws.cloudtrail-default', hit_count: 1, required: true },
      { index: 'logs-endpoint.events.process-default', hit_count: 1, required: true },
    ]);
    expect(result.per_index.every((entry) => !('confirming' in entry))).toBe(true);
  });

  it('reports a data-stream backing index under its concrete .ds- name', async () => {
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

    expect(result.per_index).toEqual([{ index: backingIndex, hit_count: 1, required: true }]);
    expect(result.has_confirmed_hit).toBe(true);
  });

  it('reports a beats-style .ds- backing index under its concrete name', async () => {
    const backingIndex = '.ds-winlogbeat-8.15.0-2026.09.01-000001';
    const esClient = buildEsClient({
      hits: {
        total: { value: 1 },
        hits: [
          {
            _index: backingIndex,
            _id: 'abc',
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

    expect(result.per_index).toEqual([{ index: backingIndex, hit_count: 1, required: true }]);
  });

  it('searches exactly scope.search_patterns, including exclusions, with ignore_unavailable', async () => {
    const esClient = buildEsClient(emptySearchResponse);

    await huntForThreat(esClient, { scope, iocs: [{ type: 'ip', value: '10.0.0.1' }] });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: scope.search_patterns,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: scope.row_limit,
      })
    );
    expect(scope.search_patterns).toContain('-*elastic-cloud-logs-*');
  });

  it('never calls esClient.count', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(emptySearchResponse),
      count: jest.fn(),
    } as unknown as ElasticsearchClient;

    await huntForThreat(esClient, { scope, iocs: [{ type: 'ip', value: '10.0.0.1' }] });

    expect(esClient.count).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty list', []],
    ['exclusions only', ['-*elastic-cloud-logs-*', '-logs-elastic_agent*']],
  ])('returns scope_blocked without searching for %s', async (_label, search_patterns) => {
    const esClient = buildEsClient(emptySearchResponse);

    const result = await huntForThreat(esClient, {
      scope: { ...scope, search_patterns },
      iocs: [{ type: 'ip', value: '10.0.0.1' }],
    });

    expect(result.status).toBe('scope_blocked');
    expect(result.has_confirmed_hit).toBe(false);
    expect(esClient.search).not.toHaveBeenCalled();
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

  describe('hash IOC casing', () => {
    const UPPER_SHA256 = 'A'.repeat(64);

    it('folds an uppercase digest to lowercase, matching how integrations index it', async () => {
      const esClient = buildEsClient(emptySearchResponse);

      await huntForThreat(esClient, { scope, iocs: [{ type: 'hash', value: UPPER_SHA256 }] });

      const [[searchBody]] = (esClient.search as jest.Mock).mock.calls;
      expect(searchBody.query.bool.should).toEqual(
        expect.arrayContaining([{ term: { 'file.hash.sha256': UPPER_SHA256.toLowerCase() } }])
      );
      expect(JSON.stringify(searchBody.query)).not.toContain(UPPER_SHA256);
    });

    it('still attributes the hit when the report and the document disagree on case', async () => {
      const esClient = buildEsClient({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _index: 'logs-aws.cloudtrail-default',
              _id: 'abc',
              _source: {
                '@timestamp': '2026-09-01T00:00:00.000Z',
                file: { hash: { sha256: UPPER_SHA256.toLowerCase() } },
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
        iocs: [{ type: 'hash', value: UPPER_SHA256 }],
      });

      // The echoed value stays as the caller wrote it; only the comparison folds.
      expect(result.hits[0].matched).toEqual({
        ioc: { type: 'hash', value: UPPER_SHA256 },
        field: 'file.hash.sha256',
      });
    });
  });

  describe('domain IOC casing', () => {
    it('matches a domain case-insensitively, since DNS names are', async () => {
      const esClient = buildEsClient(emptySearchResponse);

      await huntForThreat(esClient, { scope, iocs: [{ type: 'domain', value: 'Example.COM' }] });

      const [[searchBody]] = (esClient.search as jest.Mock).mock.calls;
      // Folding the report's value would not be enough: the document is just as
      // likely to be the side carrying the mixed case.
      expect(searchBody.query.bool.should).toEqual(
        expect.arrayContaining([
          { term: { 'dns.question.name': { value: 'Example.COM', case_insensitive: true } } },
        ])
      );
    });

    it('leaves a case-sensitive type on a plain term clause', async () => {
      const esClient = buildEsClient(emptySearchResponse);

      await huntForThreat(esClient, { scope, iocs: [{ type: 'ip', value: '10.0.0.1' }] });

      const [[searchBody]] = (esClient.search as jest.Mock).mock.calls;
      expect(searchBody.query.bool.should).toEqual(
        expect.arrayContaining([{ term: { 'source.ip': '10.0.0.1' } }])
      );
      expect(JSON.stringify(searchBody.query)).not.toContain('case_insensitive');
    });

    it('still attributes the hit when the report and the document disagree on case', async () => {
      const esClient = buildEsClient({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _index: 'logs-aws.cloudtrail-default',
              _id: 'abc',
              _source: {
                '@timestamp': '2026-09-01T00:00:00.000Z',
                dns: { question: { name: 'example.com' } },
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
        iocs: [{ type: 'domain', value: 'Example.COM' }],
      });

      // A hit the search found but attribution cannot explain is worse than either
      // behaviour alone, so both sides fold.
      expect(result.hits[0].matched).toEqual({
        ioc: { type: 'domain', value: 'Example.COM' },
        field: 'dns.question.name',
      });
    });
  });

  describe('the _source projection', () => {
    it.each([
      ['ip', '10.0.0.1', ['related.ip', 'kubernetes.audit.sourceIPs']],
      ['email', 'a@b.com', ['user.email', 'related.user']],
      ['domain', 'evil.test', ['dns.question.name', 'url.domain']],
      ['url', 'https://evil.test/a', ['url.original']],
      ['hash', 'f'.repeat(64), ['file.hash.sha256', 'process.hash.sha256']],
    ] as const)(
      'requests the %s fields it searches, so attribution can name the matching IOC',
      async (type, value, expectedFields) => {
        const esClient = buildEsClient(emptySearchResponse);

        await huntForThreat(esClient, { scope, iocs: [{ type, value }] });

        const [[searchBody]] = (esClient.search as jest.Mock).mock.calls;
        expect(searchBody._source).toEqual(expect.arrayContaining([...expectedFields]));
      }
    );

    it('keeps the display fields and skips IOC fields for types that were not searched', async () => {
      const esClient = buildEsClient(emptySearchResponse);

      await huntForThreat(esClient, { scope, iocs: [{ type: 'ip', value: '10.0.0.1' }] });

      const [[searchBody]] = (esClient.search as jest.Mock).mock.calls;
      expect(searchBody._source).toEqual(
        expect.arrayContaining(['@timestamp', 'kibana.alert.rule.threat'])
      );
      expect(searchBody._source).not.toContain('file.hash.sha256');
    });
  });

  describe('an empty window', () => {
    it.each([
      ['reversed absolute dates', '2026-09-18T00:00:00.000Z', '2026-09-01T00:00:00.000Z'],
      ['reversed date math', 'now', 'now-30d'],
      ['an equal pair, since `to` is exclusive', 'now-1d', 'now-1d'],
    ])('rejects %s before searching', async (_label, from, to) => {
      const esClient = buildEsClient(emptySearchResponse);

      await expect(
        huntForThreat(esClient, {
          scope,
          iocs: [{ type: 'ip', value: '10.0.0.1' }],
          time_range: { from, to },
        })
      ).rejects.toThrow('Hunt window is empty');
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('accepts date math that resolves in order', async () => {
      const esClient = buildEsClient(emptySearchResponse);

      await expect(
        huntForThreat(esClient, {
          scope,
          iocs: [{ type: 'ip', value: '10.0.0.1' }],
          time_range: { from: 'now-30d', to: 'now' },
        })
      ).resolves.toEqual(expect.objectContaining({ status: 'no_environment_hits' }));
    });
  });

  describe('coverage gaps', () => {
    const buildPartialEsClient = (searchOverrides: Record<string, unknown>): ElasticsearchClient =>
      ({
        search: jest.fn().mockResolvedValue({ ...emptySearchResponse, ...searchOverrides }),
      } as unknown as ElasticsearchClient);

    it('reports a timed-out scope search as a retryable gap instead of a quiet environment', async () => {
      const esClient = buildPartialEsClient({ timed_out: true });

      const result = await huntForThreat(esClient, {
        scope,
        iocs: [{ type: 'ip', value: '10.0.0.1' }],
      });

      expect(result.status).toBe('no_environment_hits');
      expect(result.incomplete).toEqual([expect.objectContaining({ reason: 'search_partial' })]);
    });

    it('reports failed shards on the scope search as a retryable gap', async () => {
      const esClient = buildPartialEsClient({
        _shards: { total: 10, successful: 7, failed: 3, skipped: 0 },
      });

      const result = await huntForThreat(esClient, {
        scope,
        iocs: [{ type: 'ip', value: '10.0.0.1' }],
      });

      expect(result.incomplete).toEqual([
        expect.objectContaining({
          reason: 'search_partial',
          detail: expect.stringContaining('3 of 10'),
        }),
      ]);
    });

    it('reports zero shards answering as index_unavailable', async () => {
      const esClient = buildPartialEsClient({
        _shards: { total: 0, successful: 0, failed: 0, skipped: 0 },
      });

      const result = await huntForThreat(esClient, {
        scope,
        iocs: [{ type: 'ip', value: '10.0.0.1' }],
      });

      expect(result.has_confirmed_hit).toBe(false);
      expect(result.incomplete).toEqual([
        expect.objectContaining({
          reason: 'index_unavailable',
          detail: expect.stringContaining('No index backed the searched patterns'),
        }),
      ]);
    });

    it('omits `incomplete` entirely when every shard answered', async () => {
      const esClient = buildPartialEsClient({
        timed_out: false,
        _shards: { total: 10, successful: 10, failed: 0, skipped: 0 },
      });

      const result = await huntForThreat(esClient, {
        scope,
        iocs: [{ type: 'ip', value: '10.0.0.1' }],
      });

      expect(result.incomplete).toBeUndefined();
    });
  });
});
