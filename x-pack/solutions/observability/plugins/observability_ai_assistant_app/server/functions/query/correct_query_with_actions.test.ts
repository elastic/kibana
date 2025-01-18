/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { correctQueryWithActions } from './correct_query_with_actions';

describe('correctQueryWithActions', () => {
  it(`fixes errors correctly for a query with one syntax error for stats`, async () => {
    const fixedQuery = await correctQueryWithActions('from logstash-* | stats aveg(bytes)');
    expect(fixedQuery).toBe('from logstash-* | stats avg(bytes)');
  });

  it(`fixes errors correctly for a query with 2 syntax errors for stats`, async () => {
    const fixedQuery = await correctQueryWithActions(
      'from logstash-* | stats aveg(bytes), max2(bytes)'
    );
    expect(fixedQuery).toBe('from logstash-* | stats avg(bytes), max(bytes)');
  });

  it(`fixes errors correctly for a query with one syntax error for eval`, async () => {
    const fixedQuery = await correctQueryWithActions(
      'from logstash-* | stats var0 = max(bytes) | eval ab(var0) | limit 1'
    );
    expect(fixedQuery).toBe('from logstash-* | stats var0 = max(bytes) | eval abs(var0) | limit 1');
  });

  it(`fixes errors correctly for a query with two syntax error for eval`, async () => {
    const fixedQuery = await correctQueryWithActions(
      'from logstash-* | stats var0 = max2(bytes) | eval ab(var0) | limit 1'
    );
    expect(fixedQuery).toBe('from logstash-* | stats var0 = max(bytes) | eval abs(var0) | limit 1');
  });

  it(`doesnt complain for @timestamp column`, async () => {
    const queryWithTimestamp = `FROM logstash-*
    | WHERE @timestamp >= NOW() - 15 minutes
    | EVAL bucket = DATE_TRUNC(1 minute, @timestamp)
    | STATS avg_cpu = AVG(system.cpu.total.norm.pct) BY service.name, bucket
    | SORT avg_cpu DESC
    | LIMIT 10`;
    const fixedQuery = await correctQueryWithActions(queryWithTimestamp);
    expect(fixedQuery).toBe(queryWithTimestamp);
  });
});
