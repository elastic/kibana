/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOriginalRuleSummary } from './get_original_rule_summary';

describe('getOriginalRuleSummary', () => {
  it('extracts an ES|QL query, time field, and time window', () => {
    expect(
      getOriginalRuleSummary({
        searchType: 'esqlQuery',
        esqlQuery: { esql: 'FROM logs-* | STATS count = COUNT(*)' },
        timeField: '@timestamp',
        timeWindowSize: 15,
        timeWindowUnit: 'm',
      })
    ).toEqual({
      query: { language: 'esql', query: 'FROM logs-* | STATS count = COUNT(*)' },
      timeField: '@timestamp',
      timeWindow: '15m',
    });
  });

  it('extracts a Query DSL query', () => {
    expect(
      getOriginalRuleSummary({ searchType: 'esQuery', esQuery: '{"query":{"match_all":{}}}' }).query
    ).toEqual({ language: 'dsl', query: '{"query":{"match_all":{}}}' });
  });

  it('treats a missing searchType with esQuery as Query DSL', () => {
    expect(getOriginalRuleSummary({ esQuery: '{}' }).query).toEqual({
      language: 'dsl',
      query: '{}',
    });
  });

  it('extracts a KQL query from the search source', () => {
    expect(
      getOriginalRuleSummary({
        searchType: 'searchSource',
        searchConfiguration: { query: { query: 'host.name: "a"', language: 'kuery' } },
      }).query
    ).toEqual({ language: 'kql', query: 'host.name: "a"' });
  });

  it('extracts a Lucene query from the search source', () => {
    expect(
      getOriginalRuleSummary({
        searchType: 'searchSource',
        searchConfiguration: { query: { query: 'host.name:a', language: 'lucene' } },
      }).query
    ).toEqual({ language: 'lucene', query: 'host.name:a' });
  });

  it('omits fields that are missing or malformed', () => {
    expect(
      getOriginalRuleSummary({
        searchType: 'esqlQuery',
        esqlQuery: { esql: 42 },
        timeField: 1,
        timeWindowSize: '15',
        timeWindowUnit: 'm',
      })
    ).toEqual({ query: undefined, timeField: undefined, timeWindow: undefined });
  });
});
