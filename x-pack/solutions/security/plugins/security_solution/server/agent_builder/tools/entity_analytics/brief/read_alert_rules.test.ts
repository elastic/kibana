/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toAlertsByCandidateId } from './read_alert_rules';

const bucket = (count: number, rules: Array<[string, number]>) => ({
  doc_count: count,
  rules: { buckets: rules.map(([key, docCount]) => ({ key, doc_count: docCount })) },
});

describe('toAlertsByCandidateId', () => {
  it.each([
    ['no aggregations, as when the alerts index is missing', undefined, {}],
    [
      'the rules of each candidate, and no entry for a candidate without alerts',
      {
        byCandidate: {
          buckets: {
            'user:a': bucket(3, [
              ['Credential Dump', 2],
              ['Odd Logon', 1],
            ]),
            'host:b': bucket(0, []),
          },
        },
      },
      {
        'user:a': {
          count: 3,
          rules: [
            { name: 'Credential Dump', count: 2 },
            { name: 'Odd Logon', count: 1 },
          ],
        },
      },
    ],
    [
      'a long rule name cut short',
      { byCandidate: { buckets: { 'user:a': bucket(1, [['x'.repeat(300), 1]]) } } },
      { 'user:a': { count: 1, rules: [{ name: `${'x'.repeat(97)}...`, count: 1 }] } },
    ],
  ])('returns %s', (_description, aggregations, expected) => {
    expect(toAlertsByCandidateId(aggregations)).toEqual(expected);
  });
});
