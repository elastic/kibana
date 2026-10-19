/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildConfirmationQuery } from './confirmation_query';

const VIEW = '$.nightshift.sources.default.logs';
const WINDOW = 'WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend';

describe('buildConfirmationQuery', () => {
  it("runs the stored predicate over the source's view, newest first, five rows", () => {
    expect(
      buildConfirmationQuery({
        esqlQuery: 'FROM logs, logs.* METADATA _id, _source | WHERE MATCH_PHRASE(body.text, "x y")',
        viewName: VIEW,
      })
    ).toBe(
      `FROM ${VIEW} | ${WINDOW} | WHERE MATCH_PHRASE(body.text, "x y") | SORT @timestamp DESC | LIMIT 5`
    );
  });

  it('keeps every WHERE of the stored query, in order and as the same conditions', () => {
    expect(
      buildConfirmationQuery({
        esqlQuery:
          'FROM logs | WHERE service.name == "a" AND body.text : "z"\n| WHERE NOT body.text : "ok"',
        viewName: VIEW,
      })
    ).toBe(
      `FROM ${VIEW} | ${WINDOW} | WHERE service.name == "a" AND (body.text : "z") | WHERE NOT (body.text : "ok") | SORT @timestamp DESC | LIMIT 5`
    );
  });

  it('keeps a stored $. view as the target, without its METADATA', () => {
    expect(
      buildConfirmationQuery({
        esqlQuery: 'FROM $.nightshift.sources.other.logs METADATA _id | WHERE body.text : "z"',
      })
    ).toBe(
      `FROM $.nightshift.sources.other.logs | ${WINDOW} | WHERE body.text : "z" | SORT @timestamp DESC | LIMIT 5`
    );
  });

  it.each([
    ['an aggregating query', 'FROM logs | WHERE x == 1 | STATS c = COUNT(*)'],
    ['a query with a projection', 'FROM logs | WHERE x == 1 | KEEP body.text'],
    ['a query with no WHERE', 'FROM logs'],
    ['a query that does not parse', 'FROM logs | WHERE'],
  ])('builds nothing for %s', (_name, esqlQuery) => {
    expect(buildConfirmationQuery({ esqlQuery, viewName: VIEW })).toBeUndefined();
  });

  it('builds nothing when the target is not a stored view and the source has none', () => {
    expect(buildConfirmationQuery({ esqlQuery: 'FROM logs | WHERE x == 1' })).toBeUndefined();
  });
});
