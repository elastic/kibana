/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildAnyFieldExistsFilter,
  buildIndexFilters,
  filterAlertsFromIndexPatterns,
  getDetailsPageFilter,
  getIndexFilters,
  getNetworkDetailsPageFilter,
  getRequestsAndResponses,
  hostNameExistsFilter,
  parseVisualizationData,
  userNameExistsFilter,
} from './utils';
import { mockRequests } from './__mocks__/utils';

describe('filterAlertsFromIndexPatterns', () => {
  test('removes the exact alerts-backing index pattern', () => {
    const input = [
      'logs-*',
      '.alerts-security.alerts-default',
      'auditbeat-*',
      '.alerts-security.alerts-custom-space',
    ];
    expect(filterAlertsFromIndexPatterns(input)).toEqual(['logs-*', 'auditbeat-*']);
  });

  test('removes the wildcard alerts pattern', () => {
    expect(filterAlertsFromIndexPatterns(['.alerts-security.alerts-*'])).toEqual([]);
  });

  test('preserves patterns that merely contain the alerts prefix substring', () => {
    // Only entries that START with `.alerts-security.alerts` are removed.
    // Patterns like `metrics-*` are kept even though they contain unrelated substrings.
    expect(filterAlertsFromIndexPatterns(['metrics-*', 'logs-*'])).toEqual(['metrics-*', 'logs-*']);
  });

  test('preserves remote cluster–prefixed event patterns for CPS', () => {
    const input = ['cluster-a:logs-*', 'cluster-a:auditbeat-*', '.alerts-security.alerts-default'];
    expect(filterAlertsFromIndexPatterns(input)).toEqual([
      'cluster-a:logs-*',
      'cluster-a:auditbeat-*',
    ]);
  });

  test('returns an empty array when all patterns are alert patterns', () => {
    expect(
      filterAlertsFromIndexPatterns([
        '.alerts-security.alerts-default',
        '.alerts-security.alerts-*',
      ])
    ).toEqual([]);
  });

  test('returns the original array reference when nothing is filtered', () => {
    const input = ['logs-*', 'auditbeat-*'];
    const output = filterAlertsFromIndexPatterns(input);
    // All entries kept — no mutation, just a fresh array without alert patterns
    expect(output).toEqual(input);
  });
});

describe('buildIndexFilters', () => {
  const selectedPatterns = ['logs-*', '.alerts-security.alerts-default'];
  const overridePatterns = ['logs-*'];

  test('returns [] when hasAdHocDataViews is true regardless of patterns', () => {
    expect(buildIndexFilters({ hasAdHocDataViews: true, selectedPatterns })).toEqual([]);
    expect(buildIndexFilters({ hasAdHocDataViews: true, selectedPatterns, overridePatterns })).toEqual([]);
  });

  test('returns getIndexFilters(selectedPatterns) when no overridePatterns', () => {
    expect(buildIndexFilters({ hasAdHocDataViews: false, selectedPatterns })).toEqual(
      getIndexFilters(selectedPatterns)
    );
  });

  test('returns getIndexFilters(selectedPatterns) when signalIndexName is present (overridePatterns ignored)', () => {
    expect(
      buildIndexFilters({
        hasAdHocDataViews: false,
        selectedPatterns,
        overridePatterns,
        signalIndexName: '.alerts-security.alerts-default',
      })
    ).toEqual(getIndexFilters(selectedPatterns));
  });

  test('returns negated exclusion filters for removed patterns when overridePatterns is provided', () => {
    const result = buildIndexFilters({ hasAdHocDataViews: false, selectedPatterns, overridePatterns });
    const expected = getIndexFilters(['.alerts-security.alerts-default']).map((f) => ({
      ...f,
      meta: { ...f.meta, negate: true },
    }));
    expect(result).toEqual(expected);
  });

  test('returns [] when overridePatterns equals selectedPatterns (nothing excluded)', () => {
    expect(
      buildIndexFilters({ hasAdHocDataViews: false, selectedPatterns, overridePatterns: selectedPatterns })
    ).toEqual([]);
  });
});

describe('buildAnyFieldExistsFilter', () => {
  test('meta.value serializes the same bool query as query', () => {
    const [filter] = buildAnyFieldExistsFilter(['host.name', 'host.id']);
    expect(filter.meta.value).toBe(JSON.stringify({ query: filter.query }));
  });

  test('hostNameExistsFilter includes EUID-related host fields and entity.id', () => {
    const [filter] = hostNameExistsFilter;
    const should = (filter.query as { bool: { filter: Array<{ bool: { should: unknown[] } }> } })
      .bool.filter[0].bool.should;
    const fields = should.map((clause) => (clause as { exists: { field: string } }).exists.field);
    expect(fields).toEqual([
      'host.entity.id',
      'host.id',
      'host.name',
      'host.hostname',
      'entity.id',
    ]);
  });

  test('userNameExistsFilter includes EUID-related user fields and entity.id', () => {
    const [filter] = userNameExistsFilter;
    const should = (filter.query as { bool: { filter: Array<{ bool: { should: unknown[] } }> } })
      .bool.filter[0].bool.should;
    const fields = should.map((clause) => (clause as { exists: { field: string } }).exists.field);
    expect(fields).toEqual(['user.entity.id', 'user.name', 'user.id', 'user.email', 'entity.id']);
  });
});

describe('getDetailsPageFilter', () => {
  test('should render host details filter', () => {
    expect(getDetailsPageFilter('hosts', 'mockHost')).toMatchInlineSnapshot(`
      Array [
        Object {
          "meta": Object {
            "alias": null,
            "disabled": false,
            "key": "host.name",
            "negate": false,
            "params": Object {
              "query": "mockHost",
            },
            "type": "phrase",
          },
          "query": Object {
            "match_phrase": Object {
              "host.name": "mockHost",
            },
          },
        },
      ]
    `);
  });

  test('should render user details filter', () => {
    expect(getDetailsPageFilter('users', 'elastic')).toMatchInlineSnapshot(`
      Array [
        Object {
          "meta": Object {
            "alias": null,
            "disabled": false,
            "key": "user.name",
            "negate": false,
            "params": Object {
              "query": "elastic",
            },
            "type": "phrase",
          },
          "query": Object {
            "match_phrase": Object {
              "user.name": "elastic",
            },
          },
        },
      ]
    `);
  });

  test('should render an emptry array if no field name mapped', () => {
    expect(getDetailsPageFilter('xxx')).toMatchInlineSnapshot(`Array []`);
  });
});

describe('getNetworkDetailsPageFilter', () => {
  test('should render network details filter', () => {
    expect(getNetworkDetailsPageFilter('192.168.1.1')).toMatchInlineSnapshot(`
      Array [
        Object {
          "meta": Object {
            "alias": null,
            "disabled": false,
            "key": "source.ip",
            "negate": false,
            "params": Object {
              "query": "192.168.1.1",
            },
            "type": "phrase",
          },
          "query": Object {
            "bool": Object {
              "minimum_should_match": 1,
              "should": Array [
                Object {
                  "match_phrase": Object {
                    "source.ip": "192.168.1.1",
                  },
                },
                Object {
                  "match_phrase": Object {
                    "destination.ip": "192.168.1.1",
                  },
                },
              ],
            },
          },
        },
      ]
    `);
  });
});

describe('getIndexFilters', () => {
  test('should render index filter', () => {
    expect(['auditbeat-*']).toMatchInlineSnapshot(`
      Array [
        "auditbeat-*",
      ]
    `);
  });
});

describe('getRequestsAndResponses', () => {
  test('should parse requests and responses', () => {
    expect(getRequestsAndResponses(mockRequests)).toMatchSnapshot();
  });
});

describe('parseVisualizationData', () => {
  const data = [
    '{\n  "took": 4,\n  "timed_out": false,\n  "_shards": {\n    "total": 3,\n    "successful": 3,\n    "skipped": 2,\n    "failed": 0\n  },\n  "hits": {\n    "total": 21300,\n    "max_score": null,\n    "hits": []\n  },\n  "aggregations": {\n    "0": {\n      "buckets": {\n        "Critical": {\n          "doc_count": 0\n        },\n        "High": {\n          "doc_count": 0\n        },\n        "Low": {\n          "doc_count": 21300\n        },\n        "Medium": {\n          "doc_count": 0\n        }\n      }\n    }\n  }\n}',
  ];
  test('should parse data', () => {
    expect(parseVisualizationData(data)).toMatchInlineSnapshot(`
      Array [
        Object {
          "_shards": Object {
            "failed": 0,
            "skipped": 2,
            "successful": 3,
            "total": 3,
          },
          "aggregations": Object {
            "0": Object {
              "buckets": Object {
                "Critical": Object {
                  "doc_count": 0,
                },
                "High": Object {
                  "doc_count": 0,
                },
                "Low": Object {
                  "doc_count": 21300,
                },
                "Medium": Object {
                  "doc_count": 0,
                },
              },
            },
          },
          "hits": Object {
            "hits": Array [],
            "max_score": null,
            "total": 21300,
          },
          "timed_out": false,
          "took": 4,
        },
      ]
    `);
  });
});
