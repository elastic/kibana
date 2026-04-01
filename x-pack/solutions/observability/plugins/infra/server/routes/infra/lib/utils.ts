/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';

interface BoolQuery {
  bool: estypes.QueryDslBoolQuery;
}

const isValidFilter = (query: any): query is BoolQuery => {
  const boolClause = (query as estypes.QueryDslQueryContainer)?.bool;

  if (!boolClause || Object.keys(boolClause).length === 0) {
    return false;
  }

  return [boolClause.filter, boolClause.must, boolClause.must_not, boolClause.should]
    .filter(Boolean)
    .every((clause) => Array.isArray(clause) || clause === undefined);
};

export const assertQueryStructure: (query?: any) => asserts query is BoolQuery = (query) => {
  if (!!query && !isValidFilter(query)) {
    throw Boom.badRequest('Invalid query');
  }
};

const METADATA_FIELDS = new Set(['cloud.provider', 'host.os.name', 'host.ip']);

/**
 * Extracts excluded field/value pairs from must_not clauses in the query,
 * limited to fields that getAllHosts enriches as host metadata.
 * Used for post-enrichment filtering: hosts whose enriched metadata matches
 * an excluded value are removed from the final results.
 */
export const extractExcludedMetadataValues = (
  query?: estypes.QueryDslQueryContainer
): Map<string, Set<string>> => {
  const excluded = new Map<string, Set<string>>();
  if (!query?.bool?.must_not) return excluded;

  const mustNot = Array.isArray(query.bool.must_not) ? query.bool.must_not : [query.bool.must_not];

  const addExcludedValue = (field: string, value: string) => {
    if (!METADATA_FIELDS.has(field)) return;
    if (!excluded.has(field)) excluded.set(field, new Set());
    excluded.get(field)!.add(value);
  };

  const extractFromClause = (clause: estypes.QueryDslQueryContainer) => {
    if (clause?.match_phrase) {
      for (const [field, val] of Object.entries(clause.match_phrase)) {
        const str = typeof val === 'string' ? val : (val as { query: string })?.query;
        if (str) addExcludedValue(field, str);
      }
    }

    if (clause?.match) {
      for (const [field, val] of Object.entries(clause.match)) {
        const str = typeof val === 'string' ? val : (val as { query: string })?.query;
        if (str) addExcludedValue(field, String(str));
      }
    }

    if (clause?.term) {
      for (const [field, val] of Object.entries(clause.term)) {
        const str =
          typeof val === 'object' && val !== null ? (val as { value: unknown }).value : val;
        if (str != null) addExcludedValue(field, String(str));
      }
    }

    if (clause?.terms) {
      for (const [field, values] of Object.entries(clause.terms)) {
        if (Array.isArray(values)) {
          for (const v of values) addExcludedValue(field, String(v));
        }
      }
    }

    if (clause?.bool?.should) {
      const { minimum_should_match: msm, must, filter } = clause.bool;
      const hasMustOrFilter =
        (Array.isArray(must) ? must.length > 0 : !!must) ||
        (Array.isArray(filter) ? filter.length > 0 : !!filter);
      // ES defaults minimum_should_match to 0 when must/filter are present,
      // making should clauses optional. Only extract when should is required.
      const shouldIsRequired = msm === 1 || msm === '1' || (msm === undefined && !hasMustOrFilter);
      if (shouldIsRequired) {
        const shouldClauses = Array.isArray(clause.bool.should)
          ? clause.bool.should
          : [clause.bool.should];
        for (const shouldClause of shouldClauses) {
          extractFromClause(shouldClause as estypes.QueryDslQueryContainer);
        }
      }
    }
  };

  for (const clause of mustNot) {
    extractFromClause(clause as estypes.QueryDslQueryContainer);
  }

  return excluded;
};
