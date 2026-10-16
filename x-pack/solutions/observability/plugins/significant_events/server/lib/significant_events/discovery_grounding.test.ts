/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { DiscoveryContext, DiscoveryContextQuery } from './discovery_context';
import { buildConfirmationQuery } from './confirmation_query';
import { runDiscoveryGrounding } from './discovery_grounding';

const NOW = Date.parse('2026-10-16T12:00:00.000Z');
const VIEW = '$.nightshift.sources.default.logs';

const queryKi = (ruleId: string, esqlQuery: string): DiscoveryContextQuery => ({
  kind: 'query',
  query: {
    id: `query-${ruleId}`,
    title: 'title',
    description: 'description',
    type: 'match',
    esql: { query: esqlQuery },
  },
  rule: { backed: true, id: ruleId },
  source_id: 'logs',
  view_name: VIEW,
  confirmation_query: buildConfirmationQuery({ esqlQuery, viewName: VIEW }),
});

const contextOf = (...query_kis: DiscoveryContextQuery[]): DiscoveryContext => ({
  sources: [],
  unmatched_rule_uuids: [],
  truncated: false,
  query_kis,
  feature_kis: [],
});

const fakeEs = (
  respond: (query: string) => { columns?: string[]; values: unknown[][] } | Error
) => {
  const query = jest.fn(async ({ query: text }: { query: string }) => {
    const result = respond(text);
    if (result instanceof Error) throw result;
    return { columns: (result.columns ?? []).map((name) => ({ name })), values: result.values };
  });
  return { esClient: { esql: { query } } as unknown as ElasticsearchClient, query };
};

const run = (params: {
  context: DiscoveryContext;
  esClient: ElasticsearchClient;
  detectedAt?: Array<[string, string]>;
}) =>
  runDiscoveryGrounding({
    context: params.context,
    detectedAt: new Map(params.detectedAt ?? []),
    esClient: params.esClient,
    now: NOW,
    abortSignal: new AbortController().signal,
  });

describe('runDiscoveryGrounding', () => {
  it('samples a rule from 15 minutes before its detection until now, then profiles it', async () => {
    const { esClient, query } = fakeEs((text) =>
      text.includes('SORT @timestamp DESC')
        ? {
            columns: ['body.text', 'service.name'],
            values: [['SQLState 08001', 'transactionhistory']],
          }
        : { columns: ['n'], values: [[375]] }
    );

    const [grounding] = await run({
      context: contextOf(queryKi('rule-A', 'FROM logs | WHERE body.text : "08001"')),
      esClient,
      detectedAt: [['rule-A', '2026-10-16T11:40:00.000Z']],
    });

    expect(grounding.confirmation).toMatchObject({
      status: 'ok',
      columns: [{ name: 'body.text' }, { name: 'service.name' }],
      values: [['SQLState 08001', 'transactionhistory']],
      time_range: { from: '2026-10-16T11:25:00.000Z', to: '2026-10-16T12:00:00.000Z' },
    });
    expect(grounding.profile?.group_by).toBe('service.name');
    expect(grounding.profile?.spread.time_range).toEqual({
      from: '2026-10-16T11:00:00.000Z',
      to: '2026-10-16T12:00:00.000Z',
    });
    expect(grounding.profile?.trend_buckets.time_range.from).toBe('2026-10-15T12:00:00.000Z');
    expect(grounding.profile?.trend_edges.time_range.from).toBe('2026-10-02T12:00:00.000Z');
    expect(query).toHaveBeenCalledTimes(4);
  });

  it('groups the spread by the first allowed field the sample has, or by none', async () => {
    const withHost = fakeEs((text) =>
      text.includes('SORT @timestamp DESC')
        ? { columns: ['body.text', 'host.name'], values: [['x', 'h1']] }
        : { values: [[1]] }
    );
    const withNone = fakeEs((text) =>
      text.includes('SORT @timestamp DESC')
        ? { columns: ['body.text'], values: [['x']] }
        : { values: [[1]] }
    );
    const context = contextOf(queryKi('rule-A', 'FROM logs | WHERE body.text : "z"'));

    const [host] = await run({ context, esClient: withHost.esClient });
    const [none] = await run({ context, esClient: withNone.esClient });

    expect(host.profile?.group_by).toBe('host.name');
    expect(host.profile?.spread.query).toContain('BY host.name');
    expect(none.profile?.group_by).toBeNull();
    expect(none.profile?.spread.query).toContain('STATS failed = COUNT(*)');
    expect(none.profile?.spread.query).not.toContain('BY');
  });

  it('does not profile a rule whose sample returned no rows', async () => {
    const { esClient, query } = fakeEs(() => ({ values: [] }));

    const [grounding] = await run({
      context: contextOf(queryKi('rule-A', 'FROM logs | WHERE body.text : "z"')),
      esClient,
    });

    expect(grounding.confirmation.status).toBe('ok');
    expect(grounding.profile).toBeUndefined();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('leaves the profile to the agent when the predicate may select an operation', async () => {
    const { esClient, query } = fakeEs(() => ({ values: [['row']] }));

    const [grounding] = await run({
      context: contextOf(
        queryKi('rule-A', 'FROM logs | WHERE service.name == "a" AND body.text : "z"')
      ),
      esClient,
    });

    expect(grounding.confirmation.values).toEqual([['row']]);
    expect(grounding.profile).toBeUndefined();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('skips a KI that has no confirmation query', async () => {
    const { esClient, query } = fakeEs(() => ({ values: [['row']] }));
    const withoutQuery = {
      ...queryKi('rule-A', 'FROM logs | WHERE x'),
      confirmation_query: undefined,
    };

    expect(await run({ context: contextOf(withoutQuery), esClient })).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });

  it('reports a failing query as an error without rows, and does not profile it', async () => {
    const { esClient } = fakeEs(() => new Error('Unknown index'));

    const [grounding] = await run({
      context: contextOf(queryKi('rule-A', 'FROM logs | WHERE body.text : "z"')),
      esClient,
    });

    expect(grounding.confirmation).toMatchObject({ status: 'error', values: [] });
    expect(grounding.profile).toBeUndefined();
  });

  it('clips very long text cells', async () => {
    const { esClient } = fakeEs(() => ({ values: [['x'.repeat(5_000)]] }));

    const [grounding] = await run({
      context: contextOf(queryKi('rule-A', 'FROM logs | WHERE service.name == "a"')),
      esClient,
    });

    expect(String(grounding.confirmation.values[0][0])).toHaveLength(2_001);
  });
});
