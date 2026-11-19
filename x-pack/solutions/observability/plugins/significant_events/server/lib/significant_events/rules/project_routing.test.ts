/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { appendLimitToQuery, getProjectRoutingFromEsqlQuery } from '@kbn/esql-utils';
import { PROJECT_ROUTING_ALL } from '@kbn/cps-server-utils';
import { withAllProjectsRouting } from './project_routing';

const BREACH_QUERY = 'FROM logs-*\n| WHERE level == "error"';

describe('withAllProjectsRouting', () => {
  it('prefixes the query with a SET directive routing across all linked projects', () => {
    expect(withAllProjectsRouting(BREACH_QUERY)).toBe(
      `SET project_routing="${PROJECT_ROUTING_ALL}";\n${BREACH_QUERY}`
    );
  });

  it('produces a query that parses cleanly', () => {
    // `Parser.parseErrors` is what alerting_v2's `validateEsqlQuery` runs on the rule body.
    expect(Parser.parseErrors(withAllProjectsRouting(BREACH_QUERY))).toEqual([]);
  });

  it('sets a routing expression readable back off the query', () => {
    expect(getProjectRoutingFromEsqlQuery(withAllProjectsRouting(BREACH_QUERY))).toBe(
      PROJECT_ROUTING_ALL
    );
  });

  it('survives the LIMIT that the alerting v2 executor appends to breach queries', () => {
    // ExecuteRuleQueryStep runs `appendLimitToQuery` on the stored breach query before
    // execution. If that ever stopped preserving the header, rules would silently fall back
    // to the space routing expression, so pin the invariant here.
    const bounded = appendLimitToQuery(withAllProjectsRouting(BREACH_QUERY), 10000);

    expect(getProjectRoutingFromEsqlQuery(bounded)).toBe(PROJECT_ROUTING_ALL);
    expect(Parser.parseErrors(bounded)).toEqual([]);
  });
});
