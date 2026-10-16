/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CompactFeature,
  CompactKnowledgeIndicator,
  CompactKnowledgeIndicatorFeature,
  CompactKnowledgeIndicatorQuery,
  KISearchOutput,
} from '../../agent_builder/tools/search_knowledge_indicators/handler';
import { buildDiscoveryContext } from './discovery_context';

const queryKi = ({
  ruleId,
  featureIds = [],
  sourceId = 'logs',
}: {
  ruleId: string;
  featureIds?: string[];
  sourceId?: string;
}): CompactKnowledgeIndicatorQuery => ({
  kind: 'query',
  query: {
    id: `query-${ruleId}`,
    title: 'title',
    description: 'description',
    type: 'match',
    esql: { query: 'FROM $.logs | WHERE x' },
    features: featureIds.map((id) => ({ id })),
  },
  rule: { backed: true, id: ruleId },
  source_id: sourceId,
});

const featureKi = (id: string): CompactKnowledgeIndicatorFeature => ({
  kind: 'feature',
  feature: {
    id,
    source_id: 'logs',
    type: 'entity',
    subtype: 'service',
    description: 'a service',
    properties: {},
  } as CompactFeature,
});

const source = (slug: string) => ({ slug, title: slug, view_name: `$.nightshift.${slug}` });

const page = ({
  items,
  hasMore = false,
  nextPage = null,
  sources = [],
}: {
  items: CompactKnowledgeIndicator[];
  hasMore?: boolean;
  nextPage?: number | null;
  sources?: KISearchOutput['sources'];
}): KISearchOutput => ({
  view: 'compact',
  page: 1,
  per_page: 50,
  returned: items.length,
  total: items.length,
  has_more: hasMore,
  next_page: nextPage,
  sources,
  knowledge_indicators: items,
});

describe('buildDiscoveryContext', () => {
  it('searches query KIs by rule, then the features they reference in their own sources', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce(
        page({
          items: [
            queryKi({ ruleId: 'rule-A', featureIds: ['f1', 'f2'], sourceId: 'logs' }),
            queryKi({ ruleId: 'rule-B', featureIds: ['f2'], sourceId: 'traces' }),
          ],
        })
      )
      .mockResolvedValueOnce(page({ items: [featureKi('f1'), featureKi('f2')] }));

    const context = await buildDiscoveryContext({
      ruleUuids: ['rule-A', 'rule-B'],
      sourceIds: ['source-id'],
      search,
    });

    expect(search).toHaveBeenNthCalledWith(1, {
      kind: ['query'],
      rule_ids: ['rule-A', 'rule-B'],
      query_types: ['match'],
      rule_backed: true,
      page: 1,
      per_page: 50,
      view: 'compact',
    });
    expect(search).toHaveBeenNthCalledWith(2, {
      kind: ['feature'],
      feature_types: ['dependency', 'entity', 'infrastructure'],
      feature_ids: ['f1', 'f2'],
      slugs: ['logs', 'traces'],
      page: 1,
      per_page: 50,
      view: 'compact',
    });
    expect(context.query_kis).toHaveLength(2);
    expect(context.feature_kis).toHaveLength(2);
    expect(context.unmatched_rule_uuids).toEqual([]);
    expect(context.truncated).toBe(false);
  });

  it('falls back to the batch sources when no query references a feature', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce(page({ items: [queryKi({ ruleId: 'rule-A' })] }))
      .mockResolvedValueOnce(page({ items: [featureKi('f1')] }));

    await buildDiscoveryContext({ ruleUuids: ['rule-A'], sourceIds: ['s1', 's2'], search });

    const featureSearch = search.mock.calls[1][0];
    expect(featureSearch.slugs).toEqual(['s1', 's2']);
    expect(featureSearch).not.toHaveProperty('feature_ids');
  });

  it('returns the sources of both searches once each, as they carry the view to query', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce(
        page({ items: [queryKi({ ruleId: 'rule-A' })], sources: [source('logs')] })
      )
      .mockResolvedValueOnce(
        page({ items: [featureKi('f1')], sources: [source('logs'), source('traces')] })
      );

    const context = await buildDiscoveryContext({ ruleUuids: ['rule-A'], sourceIds: [], search });

    expect(context.sources).toEqual([source('logs'), source('traces')]);
  });

  it('puts the view to query on each query KI, so the agent need not join it from the sources', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce(
        page({
          items: [
            queryKi({ ruleId: 'rule-A', sourceId: 'logs' }),
            queryKi({ ruleId: 'rule-B', sourceId: 'unknown' }),
          ],
          sources: [source('logs')],
        })
      )
      .mockResolvedValueOnce(page({ items: [] }));

    const context = await buildDiscoveryContext({
      ruleUuids: ['rule-A', 'rule-B'],
      sourceIds: [],
      search,
    });

    expect(context.query_kis.map(({ view_name: view }) => view)).toEqual([
      '$.nightshift.logs',
      undefined,
    ]);
  });

  it('lists the sources before the knowledge indicators, so the agent reads them first', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce(page({ items: [] }))
      .mockResolvedValueOnce(page({ items: [] }));

    const context = await buildDiscoveryContext({ ruleUuids: ['rule-A'], sourceIds: [], search });

    expect(Object.keys(context)).toEqual([
      'sources',
      'unmatched_rule_uuids',
      'truncated',
      'query_kis',
      'feature_kis',
    ]);
  });

  it('lists the rules no backed query KI matched, and drops KIs of other rules', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce(
        page({ items: [queryKi({ ruleId: 'rule-A' }), queryKi({ ruleId: 'other-rule' })] })
      )
      .mockResolvedValueOnce(page({ items: [] }));

    const context = await buildDiscoveryContext({
      ruleUuids: ['rule-A', 'rule-B'],
      sourceIds: [],
      search,
    });

    expect(context.unmatched_rule_uuids).toEqual(['rule-B']);
    expect(context.query_kis.map(({ rule }) => rule.id)).toEqual(['rule-A']);
    expect(search.mock.calls[1][0]).not.toHaveProperty('slugs');
  });

  it('reads one more feature page only while referenced ids are missing', async () => {
    const referencing = page({ items: [queryKi({ ruleId: 'rule-A', featureIds: ['f1', 'f2'] })] });
    const search = jest
      .fn()
      .mockResolvedValueOnce(referencing)
      .mockResolvedValueOnce(page({ items: [featureKi('f1')], hasMore: true, nextPage: 2 }))
      .mockResolvedValueOnce(page({ items: [featureKi('f2')] }));

    const context = await buildDiscoveryContext({ ruleUuids: ['rule-A'], sourceIds: [], search });

    expect(search).toHaveBeenCalledTimes(3);
    expect(search.mock.calls[2][0]).toMatchObject({ page: 2, feature_ids: ['f1', 'f2'] });
    expect(context.feature_kis.map(({ feature }) => feature.id)).toEqual(['f1', 'f2']);
  });

  it('does not page on when every referenced id was returned, or for the fallback search', async () => {
    const complete = jest
      .fn()
      .mockResolvedValueOnce(page({ items: [queryKi({ ruleId: 'rule-A', featureIds: ['f1'] })] }))
      .mockResolvedValueOnce(page({ items: [featureKi('f1')], hasMore: true, nextPage: 2 }));
    await buildDiscoveryContext({ ruleUuids: ['rule-A'], sourceIds: [], search: complete });
    expect(complete).toHaveBeenCalledTimes(2);

    const fallback = jest
      .fn()
      .mockResolvedValueOnce(page({ items: [] }))
      .mockResolvedValueOnce(page({ items: [featureKi('f1')], hasMore: true, nextPage: 2 }));
    await buildDiscoveryContext({ ruleUuids: ['rule-A'], sourceIds: ['s1'], search: fallback });
    expect(fallback).toHaveBeenCalledTimes(2);
  });

  it('reports a query search that held more than one page', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce(page({ items: [queryKi({ ruleId: 'rule-A' })], hasMore: true }))
      .mockResolvedValueOnce(page({ items: [] }));

    expect(
      (await buildDiscoveryContext({ ruleUuids: ['rule-A'], sourceIds: [], search })).truncated
    ).toBe(true);
  });
});
