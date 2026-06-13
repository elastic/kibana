/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import {
  buildIdentityLinkExtractionEsql,
  extractIdentityLinkClues,
  isSafeFieldName,
  stripIdentityFieldConditions,
} from './extract_identity_links';
import type { IdentityLinkRule } from './load_identity_link_rules';

const logger = { debug: jest.fn(), warn: jest.fn() } as unknown as Logger;

const makeRule = (overrides: Partial<IdentityLinkRule> = {}): IdentityLinkRule => ({
  userNameField: 'user.name',
  userEmailField: 'github.external_identity_nameid',
  namespaceHint: 'okta',
  featureUuid: 'uuid-1',
  streamName: 'logs-github.audit-default',
  confidence: 95,
  ...overrides,
});

const makeReader = (
  indexPatterns: string[] = ['logs-github.audit-default']
): StreamsKnowledgeIndicatorsReader => ({
  listEntityFeatures: jest.fn(async () => []),
  listDependencyFeatures: jest.fn(async () => []),
  listSchemaFeatures: jest.fn(async () => []),
  resolveIndexPatterns: jest.fn(async () => indexPatterns),
});

interface FakeEsOpts {
  fields?: Record<string, unknown>;
  columns?: Array<{ name: string; type: string }>;
  values?: unknown[][];
  fieldCapsThrows?: boolean;
  esqlThrows?: boolean;
}

const defaultColumns = [
  { name: 'doc_count', type: 'long' },
  { name: 'user_name', type: 'keyword' },
  { name: 'user_email', type: 'keyword' },
];

const makeEsClient = (opts: FakeEsOpts = {}): ElasticsearchClient => {
  const fieldCaps = jest.fn(async () => {
    if (opts.fieldCapsThrows) {
      throw new Error('field_caps boom');
    }
    return {
      fields: opts.fields ?? {
        'user.name': { keyword: {} },
        'github.external_identity_nameid': { keyword: {} },
      },
    };
  });
  const query = jest.fn(async () => {
    if (opts.esqlThrows) {
      throw new Error('esql boom');
    }
    return { columns: opts.columns ?? defaultColumns, values: opts.values ?? [] };
  });
  return { fieldCaps, esql: { query } } as unknown as ElasticsearchClient;
};

describe('isSafeFieldName', () => {
  it('accepts plain dotted ECS field paths', () => {
    expect(isSafeFieldName('user.name')).toBe(true);
    expect(isSafeFieldName('github.external_identity_nameid')).toBe(true);
    expect(isSafeFieldName('user.target.email-1')).toBe(true);
  });

  it('rejects field names with ES|QL syntax / injection characters', () => {
    expect(isSafeFieldName('user.name)')).toBe(false);
    expect(isSafeFieldName('TO_STRING(x')).toBe(false);
    expect(isSafeFieldName('a"b')).toBe(false);
    expect(isSafeFieldName('a b')).toBe(false);
    expect(isSafeFieldName('')).toBe(false);
  });
});

describe('buildIdentityLinkExtractionEsql', () => {
  it('builds FROM / WHERE not-null / STATS BY / LIMIT', () => {
    const esql = buildIdentityLinkExtractionEsql(makeRule({ namespaceHint: undefined }), [
      'logs-github.audit-default',
    ]);
    expect(esql).toContain('FROM logs-github.audit-default');
    expect(esql).toContain('TO_STRING(user.name) IS NOT NULL');
    expect(esql).toContain('TO_STRING(github.external_identity_nameid) IS NOT NULL');
    expect(esql).toContain(
      'STATS doc_count = COUNT(*) BY user_name = TO_STRING(user.name), user_email = TO_STRING(github.external_identity_nameid)'
    );
    expect(esql).toContain('LIMIT 10000');
  });

  it('includes the scope filter when present', () => {
    const esql = buildIdentityLinkExtractionEsql(
      makeRule({ filter: { field: 'event.category', eq: 'iam' } }),
      ['logs-github.audit-default']
    );
    expect(esql).toContain('(TO_STRING(event.category) == "iam")');
  });

  it('strips a per-user identity pin from the filter, keeping the stream-wide scope', () => {
    const esql = buildIdentityLinkExtractionEsql(
      makeRule({
        filter: {
          and: [
            { field: 'data_stream.dataset', eq: 'github.audit' },
            { field: 'user.name', eq: 'opauloh' },
          ],
        },
      }),
      ['logs-github.audit-default']
    );
    expect(esql).toContain('(TO_STRING(data_stream.dataset) == "github.audit")');
    // The per-user pin must NOT scope the WHERE clause (only the IS NOT NULL guard remains).
    expect(esql).not.toContain('== "opauloh"');
  });

  it('drops the filter entirely when it only pins the identity', () => {
    const esql = buildIdentityLinkExtractionEsql(
      makeRule({ filter: { field: 'user.name', eq: 'opauloh' } }),
      ['logs-github.audit-default']
    );
    expect(esql).not.toContain('== "opauloh"');
    expect(esql).toContain('| WHERE TO_STRING(user.name) IS NOT NULL');
  });

  it('throws on unsafe field names', () => {
    expect(() =>
      buildIdentityLinkExtractionEsql(makeRule({ userNameField: 'x")' }), ['logs-x'])
    ).toThrow(/unsafe field name/);
  });
});

describe('stripIdentityFieldConditions', () => {
  const fields = new Set(['user.name', 'github.external_identity_nameid']);

  it('returns undefined for a lone identity-field leaf', () => {
    expect(
      stripIdentityFieldConditions({ field: 'user.name', eq: 'opauloh' }, fields)
    ).toBeUndefined();
  });

  it('keeps a non-identity leaf untouched', () => {
    const cond = { field: 'event.category', eq: 'iam' };
    expect(stripIdentityFieldConditions(cond, fields)).toEqual(cond);
  });

  it('collapses an AND down to its non-identity members', () => {
    expect(
      stripIdentityFieldConditions(
        {
          and: [
            { field: 'data_stream.dataset', eq: 'github.audit' },
            { field: 'user.name', eq: 'opauloh' },
          ],
        },
        fields
      )
    ).toEqual({ field: 'data_stream.dataset', eq: 'github.audit' });
  });

  it('preserves an AND with multiple non-identity members', () => {
    expect(
      stripIdentityFieldConditions(
        {
          and: [
            { field: 'data_stream.dataset', eq: 'github.audit' },
            { field: 'event.category', eq: 'iam' },
            { field: 'github.external_identity_nameid', eq: 'x@y.com' },
          ],
        },
        fields
      )
    ).toEqual({
      and: [
        { field: 'data_stream.dataset', eq: 'github.audit' },
        { field: 'event.category', eq: 'iam' },
      ],
    });
  });

  it('drops a NOT wrapping only an identity condition', () => {
    expect(
      stripIdentityFieldConditions({ not: { field: 'user.name', eq: 'svc' } }, fields)
    ).toBeUndefined();
  });
});

describe('extractIdentityLinkClues', () => {
  beforeEach(() => jest.clearAllMocks());

  const run = (rules: IdentityLinkRule[], esClient: ElasticsearchClient, reader = makeReader()) =>
    extractIdentityLinkClues({
      esClient,
      reader,
      rules,
      logger,
      abortController: new AbortController(),
    });

  it('materializes a clue per (user_name, user_email) pair, normalized', async () => {
    const esClient = makeEsClient({
      values: [
        [3, 'opauloh', 'paulo.henriquedasilva@elastic.co'],
        [1, 'OtherUser', 'Other.User@elastic.co'],
      ],
    });
    const clues = await run([makeRule()], esClient);
    expect(clues).toHaveLength(2);
    expect(clues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userName: 'opauloh',
          userEmail: 'paulo.henriquedasilva@elastic.co',
          namespaceHint: 'okta',
          streamName: 'logs-github.audit-default',
          confidence: 95,
        }),
        expect.objectContaining({ userName: 'otheruser', userEmail: 'other.user@elastic.co' }),
      ])
    );
  });

  it('drops rows whose email lacks an @ and rows with blank names', async () => {
    const esClient = makeEsClient({
      values: [
        [1, 'opauloh', 'not-an-email'],
        [1, '', 'paulo@elastic.co'],
      ],
    });
    const clues = await run([makeRule()], esClient);
    expect(clues).toHaveLength(0);
  });

  it('expands multivalue cells into the cross product of pairs', async () => {
    const esClient = makeEsClient({
      values: [[2, 'opauloh', ['paulo@elastic.co', 'p.silva@elastic.co']]],
    });
    const clues = await run([makeRule()], esClient);
    expect(new Set(clues.map((c) => c.userEmail))).toEqual(
      new Set(['paulo@elastic.co', 'p.silva@elastic.co'])
    );
  });

  it('skips a rule whose fields are missing from the mapping (stale rule)', async () => {
    const esClient = makeEsClient({ fields: { 'user.name': { keyword: {} } } });
    const clues = await run([makeRule()], esClient);
    expect(clues).toHaveLength(0);
    expect(esClient.esql.query as jest.Mock).not.toHaveBeenCalled();
  });

  it('skips a rule whose stream has no backing index', async () => {
    const esClient = makeEsClient({ values: [[1, 'opauloh', 'paulo@elastic.co']] });
    const clues = await run([makeRule()], esClient, makeReader([]));
    expect(clues).toHaveLength(0);
    expect(esClient.fieldCaps as jest.Mock).not.toHaveBeenCalled();
  });

  it('skips a rule with unsafe field names without querying', async () => {
    const esClient = makeEsClient();
    const clues = await run([makeRule({ userEmailField: 'email")' })], esClient);
    expect(clues).toHaveLength(0);
    expect(esClient.fieldCaps as jest.Mock).not.toHaveBeenCalled();
  });

  it('continues when the extraction query throws', async () => {
    const esClient = makeEsClient({ esqlThrows: true });
    const clues = await run([makeRule()], esClient);
    expect(clues).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('deduplicates identical pairs across rules, keeping the highest confidence', async () => {
    const esClient = makeEsClient({ values: [[1, 'opauloh', 'paulo@elastic.co']] });
    const clues = await run(
      [
        makeRule({ featureUuid: 'low', confidence: 80 }),
        makeRule({ featureUuid: 'high', confidence: 99 }),
      ],
      esClient
    );
    expect(clues).toHaveLength(1);
    expect(clues[0]).toMatchObject({ featureUuid: 'high', confidence: 99 });
  });
});
