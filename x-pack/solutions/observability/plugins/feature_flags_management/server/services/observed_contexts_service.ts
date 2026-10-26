/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsStringTermsAggregate,
  AggregationsStringTermsBucket,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  ListObservedContextsResponse,
  ObservedAttributesResponse,
  ObservedContext,
  ObservedValuesResponse,
} from '../../common/schemas/observed_contexts';
import { OBSERVED_CONTEXTS_INDEX } from '../storage/indices';

/** Stored by Fleet Server; see the observed contexts index in `storage/indices.ts`. */
export interface ObservedContextDocument {
  app: string;
  environment: string;
  context_key: string;
  context: Record<string, unknown>;
  attributes: string[];
  attribute_types: Record<string, string>;
  first_seen?: string;
  last_seen?: string;
}

interface Scope {
  app: string;
  environment: string;
}

/** Terms `include` takes a Lucene regular expression, so the prefix must be escaped. */
export const prefixToIncludePattern = (prefix: string): string =>
  `${prefix.replace(/[.?+*|{}[\]()"\\#@&<>~]/g, (char) => `\\${char}`)}.*`;

const MAX_TYPES_PER_ATTRIBUTE = 5;

interface ObservedContextsServiceDeps {
  esClient: ElasticsearchClient;
  ensureReady: () => Promise<void>;
}

type TermsAggregations = Record<string, AggregationsStringTermsAggregate>;

const bucketsOf = (aggregate: AggregationsStringTermsAggregate | undefined) =>
  (Array.isArray(aggregate?.buckets) ? aggregate?.buckets : []) as AggregationsStringTermsBucket[];

/** Read-only queries over the contexts that Fleet Server reports, for autocomplete. */
export class ObservedContextsService {
  constructor(private readonly deps: ObservedContextsServiceDeps) {}

  public async attributes({
    app,
    environment,
    prefix,
    size,
  }: Scope & { prefix?: string; size: number }): Promise<ObservedAttributesResponse> {
    // Attribute names come from `attributes`: the keys of a `flattened` field can't be aggregated.
    const names = await this.terms({ app, environment }, 'attributes', prefix, size);
    if (names.length === 0) {
      return { items: [] };
    }

    const types = await this.aggregate({ app, environment }, (aggs) =>
      names.forEach(({ key }, index) => {
        aggs[`types_${index}`] = {
          terms: { field: `attribute_types.${key}`, size: MAX_TYPES_PER_ATTRIBUTE },
        };
      })
    );

    return {
      items: names.map(({ key, doc_count: count }, index) => ({
        name: String(key),
        count,
        types: bucketsOf(types[`types_${index}`]).map((bucket) => String(bucket.key)),
      })),
    };
  }

  public async values({
    app,
    environment,
    attribute,
    prefix,
    size,
  }: Scope & {
    attribute: string;
    prefix?: string;
    size: number;
  }): Promise<ObservedValuesResponse> {
    const buckets = await this.terms({ app, environment }, `context.${attribute}`, prefix, size);
    return {
      items: buckets.map(({ key, doc_count: count }) => ({ value: String(key), count })),
    };
  }

  public async list({
    app,
    environment,
    contextKey,
    page,
    perPage,
  }: Scope & {
    contextKey?: string;
    page: number;
    perPage: number;
  }): Promise<ListObservedContextsResponse> {
    await this.deps.ensureReady();
    const result = await this.deps.esClient.search<ObservedContextDocument>({
      index: OBSERVED_CONTEXTS_INDEX,
      ignore_unavailable: true,
      query: this.scopeQuery(
        { app, environment },
        contextKey ? [{ term: { context_key: contextKey } }] : []
      ),
      sort: [{ last_seen: { order: 'desc', unmapped_type: 'date' } }],
      from: (page - 1) * perPage,
      size: perPage,
      track_total_hits: true,
    });
    const { total } = result.hits;
    return {
      items: result.hits.hits.flatMap((hit): ObservedContext[] =>
        hit._id && hit._source ? [{ id: hit._id, ...hit._source }] : []
      ),
      total: typeof total === 'number' ? total : total?.value ?? 0,
      page,
      per_page: perPage,
    };
  }

  private async terms(scope: Scope, field: string, prefix: string | undefined, size: number) {
    const aggregations = await this.aggregate(scope, (aggs) => {
      aggs.terms = {
        terms: {
          field,
          size,
          ...(prefix ? { include: prefixToIncludePattern(prefix) } : {}),
        },
      };
    });
    return bucketsOf(aggregations.terms);
  }

  private async aggregate(
    scope: Scope,
    build: (
      aggs: Record<string, { terms: { field: string; size: number; include?: string } }>
    ) => void
  ): Promise<TermsAggregations> {
    await this.deps.ensureReady();
    const aggs: Record<string, { terms: { field: string; size: number; include?: string } }> = {};
    build(aggs);
    const result = await this.deps.esClient.search<ObservedContextDocument, TermsAggregations>({
      index: OBSERVED_CONTEXTS_INDEX,
      ignore_unavailable: true,
      size: 0,
      query: this.scopeQuery(scope),
      aggs,
    });
    return result.aggregations ?? {};
  }

  private scopeQuery(
    { app, environment }: Scope,
    extra: QueryDslQueryContainer[] = []
  ): QueryDslQueryContainer {
    return {
      bool: { filter: [{ term: { app } }, { term: { environment } }, ...extra] },
    };
  }
}
