/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildProfileQueries } from './profile_queries';

const VIEW = '$.nightshift.sources.default.logs';
const HEAD = `FROM ${VIEW} | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend`;

describe('buildProfileQueries', () => {
  it('builds the three no-scope profile queries from a text-match predicate', () => {
    const queries = buildProfileQueries({
      esqlQuery: 'FROM logs | WHERE (body.text : "SQLState") AND (body.text : "08001")',
      viewName: VIEW,
    });

    expect(queries?.spread).toEqual({
      query: `${HEAD} | WHERE (body.text : "SQLState") AND (body.text : "08001") | STATS affected = COUNT(*) BY service.name | STATS failed = SUM(affected), services_hit = COUNT(*), top_failed = MAX(affected), top_names = TOP(affected, 5, "desc", service.name)`,
      lookbackMinutes: 60,
    });
    expect(queries?.trendBuckets).toEqual({
      query: `${HEAD} | WHERE (body.text : "SQLState") AND (body.text : "08001") | STATS count = COUNT(*) BY bucket = BUCKET(@timestamp, 50, ?_tstart, ?_tend) | SORT bucket ASC`,
      lookbackMinutes: 1440,
    });
    expect(queries?.trendEdges).toEqual({
      query: `${HEAD} | WHERE (body.text : "SQLState") AND (body.text : "08001") | STATS earliest = MIN(@timestamp), latest = MAX(@timestamp)`,
      lookbackMinutes: 20160,
    });
  });

  it('never keeps a total in the spread, so it cannot report a share that is true by construction', () => {
    const spread = buildProfileQueries({
      esqlQuery: 'FROM logs | WHERE MATCH_PHRASE(body.text, "Error submitting payment")',
      viewName: VIEW,
    })?.spread.query;

    expect(spread).not.toContain('total');
  });

  it.each([
    ['a keyword equality', 'FROM logs | WHERE service.name == "a" AND body.text : "z"'],
    ['an IN list', 'FROM logs | WHERE service.name IN ("a", "b") AND body.text : "z"'],
    ['an equality inside an OR', 'FROM logs | WHERE body.text : "z" OR http.route == "/pay"'],
    [
      'an equality in a later WHERE',
      'FROM logs | WHERE body.text : "z"\n| WHERE service.name == "a"',
    ],
  ])('leaves %s to the agent, which has to split scope from failure', (_name, esqlQuery) => {
    expect(buildProfileQueries({ esqlQuery, viewName: VIEW })).toBeUndefined();
  });

  it.each([
    ['an aggregating query', 'FROM logs | WHERE body.text : "z" | STATS c = COUNT(*)'],
    ['a query that does not parse', 'FROM logs | WHERE'],
  ])('builds nothing for %s', (_name, esqlQuery) => {
    expect(buildProfileQueries({ esqlQuery, viewName: VIEW })).toBeUndefined();
  });

  it('builds nothing when the source has no view', () => {
    expect(buildProfileQueries({ esqlQuery: 'FROM logs | WHERE body.text : "z"' })).toBeUndefined();
  });
});
