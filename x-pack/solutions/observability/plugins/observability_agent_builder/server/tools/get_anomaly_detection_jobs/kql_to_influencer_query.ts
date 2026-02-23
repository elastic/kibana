/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { isEmpty } from 'lodash';

/**
 * Converts a KQL string into a nested Elasticsearch query targeting
 * influencer fields in ML anomaly records.
 *
 * ML anomaly records store influencer data as nested objects
 * (`influencers.influencer_field_name` / `influencers.influencer_field_values`),
 * so standard KQL-to-ES conversion doesn't work directly. This function
 * uses the standard KQL→DSL pipeline, then rewrites leaf field queries
 * into the nested influencer structure while preserving bool logic.
 */
export function kqlToInfluencerQuery(
  influencerFilter?: string
): QueryDslQueryContainer | undefined {
  if (isEmpty(influencerFilter?.trim())) {
    return undefined;
  }

  const dsl = toElasticsearchQuery(fromKueryExpression(influencerFilter!));
  return rewriteDslToInfluencerQuery(dsl);
}

/**
 * Walks a DSL query tree produced by `toElasticsearchQuery`. Bool compounds
 * are recursed into (preserving structure), and leaf queries (match,
 * match_phrase, term, exists, wildcard, query_string) are rewritten to
 * target the nested `influencers` path.
 */
function rewriteDslToInfluencerQuery(dsl: QueryDslQueryContainer): QueryDslQueryContainer {
  if (dsl.bool) {
    const rewritten: QueryDslQueryContainer = { bool: {} };
    if (dsl.bool.filter) {
      rewritten.bool!.filter = toArray(dsl.bool.filter).map(rewriteDslToInfluencerQuery);
    }
    if (dsl.bool.must) {
      rewritten.bool!.must = toArray(dsl.bool.must).map(rewriteDslToInfluencerQuery);
    }
    if (dsl.bool.should) {
      rewritten.bool!.should = toArray(dsl.bool.should).map(rewriteDslToInfluencerQuery);
      rewritten.bool!.minimum_should_match = dsl.bool.minimum_should_match;
    }
    if (dsl.bool.must_not) {
      rewritten.bool!.must_not = toArray(dsl.bool.must_not).map(rewriteDslToInfluencerQuery);
    }
    return rewritten;
  }

  const extracted = extractFieldAndValue(dsl);
  if (!extracted) {
    return dsl;
  }

  const valueFilter: QueryDslQueryContainer[] = [];
  if (extracted.value !== undefined) {
    valueFilter.push(
      extracted.isWildcard
        ? { wildcard: { 'influencers.influencer_field_values': extracted.value } }
        : { term: { 'influencers.influencer_field_values': extracted.value } }
    );
  }

  return {
    nested: {
      path: 'influencers',
      query: {
        bool: {
          filter: [
            { term: { 'influencers.influencer_field_name': extracted.field } },
            ...valueFilter,
          ],
        },
      },
    },
  };
}

function extractFieldAndValue(
  dsl: QueryDslQueryContainer
): { field: string; value?: string; isWildcard?: boolean } | undefined {
  if (dsl.match) {
    const [field] = Object.keys(dsl.match);
    const clause = (dsl.match as Record<string, unknown>)[field];
    return { field, value: String(typeof clause === 'object' ? (clause as any).query : clause) };
  }
  if (dsl.match_phrase) {
    const [field] = Object.keys(dsl.match_phrase);
    const clause = (dsl.match_phrase as Record<string, unknown>)[field];
    return { field, value: String(typeof clause === 'object' ? (clause as any).query : clause) };
  }
  if (dsl.term) {
    const [field] = Object.keys(dsl.term);
    const clause = (dsl.term as Record<string, unknown>)[field];
    return { field, value: String(typeof clause === 'object' ? (clause as any).value : clause) };
  }
  if (dsl.exists) {
    return { field: dsl.exists.field as string };
  }
  if (dsl.wildcard) {
    const [field] = Object.keys(dsl.wildcard);
    const clause = (dsl.wildcard as Record<string, unknown>)[field];
    return {
      field,
      value: String(typeof clause === 'object' ? (clause as any).value : clause),
      isWildcard: true,
    };
  }
  if (dsl.query_string) {
    const qs = dsl.query_string;
    const field = Array.isArray(qs.fields) ? qs.fields[0] : undefined;
    if (field && qs.query) {
      return { field, value: String(qs.query), isWildcard: true };
    }
  }
  return undefined;
}

function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}
