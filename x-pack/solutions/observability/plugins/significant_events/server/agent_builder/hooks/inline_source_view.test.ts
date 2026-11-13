/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inlineSourceView } from './inline_source_view';

const VIEW = '$.nightshift.sources.default.traces-iam-service';
const sources = [
  {
    view_name: VIEW,
    esql: 'FROM "metrics-us-east-1:traces-*" | WHERE service.name IN ("a$1", "b")',
  },
];
const TAIL = '| WHERE @timestamp >= ?_tstart | STATS c = COUNT(*)';

describe('inlineSourceView', () => {
  it('replaces the view with the source query', () => {
    expect(inlineSourceView(`FROM ${VIEW} ${TAIL}`, sources)).toBe(`${sources[0].esql}\n${TAIL}`);
  });

  it.each([
    ['an unknown view', `FROM ${VIEW}-2 ${TAIL}`],
    ['METADATA on the view', `FROM ${VIEW} METADATA _id ${TAIL}`],
  ])('leaves a query with %s unchanged', (_, query) => {
    expect(inlineSourceView(query, sources)).toBe(query);
  });
});
