/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DataProvider } from '../../../../common/types/timeline';
import { DataProviderTypeEnum } from '../../../../common/api/timeline';
import { convertToBuildEsQuery, buildGlobalQuery, combineQueries } from '.';
import { mockDataViewSpec } from '../../mock';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

describe('convertToBuildEsQuery', () => {
  /**
   * All the fields in this query, except for `@timestamp`,
   * are nested fields https://www.elastic.co/guide/en/elasticsearch/reference/current/nested.html
   *
   * This mix of nested and non-nested fields will be used to verify that:
   * ✅ Nested fields are converted to use the `nested` query syntax
   * ✅ The `nested` query syntax includes the `ignore_unmapped` option
   * ✅ Non-nested fields are NOT converted to the `nested` query syntax
   * ✅ Non-nested fields do NOT include the `ignore_unmapped` option
   */
  const queryWithNestedFields = [
    {
      query:
        '((threat.enrichments: { matched.atomic: a4f87cbcd2a4241da77b6bf0c5d9e8553fec991f } and threat.enrichments: { matched.type: indicator_match_rule } and threat.enrichments: { matched.field: file.hash.md5 }) and (@timestamp : *))',
      language: 'kuery',
    },
  ];

  /** A search bar filter (displayed below the KQL / Lucene search bar ) */
  const filters = [
    {
      meta: {
        alias: null,
        negate: false,
        disabled: false,
        type: 'exists',
        key: '_id',
        value: 'exists',
      },
      query: {
        exists: {
          field: '_id',
        },
      },
    },
  ];

  const config = {
    allowLeadingWildcards: true,
    queryStringOptions: {
      analyze_wildcard: true,
    },
    ignoreFilterIfFieldNotInIndex: false,
    dateFormatTZ: 'Browser',
  };

  it('should, by default, build a query where the `nested` fields syntax includes the `"ignore_unmapped":true` option', () => {
    const [converted, _] = convertToBuildEsQuery({
      config,
      dataView: createStubDataView({ spec: {} }),
      queries: queryWithNestedFields,
      dataViewSpec: mockDataViewSpec,
      filters,
    });

    expect(JSON.parse(converted ?? '')).to.eql({
      bool: {
        must: [],
        filter: [
          {
            bool: {
              filter: [
                {
                  bool: {
                    filter: [
                      {
                        // ✅ Nested fields are converted to use the `nested` query syntax
                        nested: {
                          path: 'threat.enrichments',
                          query: {
                            bool: {
                              should: [
                                {
                                  match: {
                                    'threat.enrichments.matched.atomic':
                                      'a4f87cbcd2a4241da77b6bf0c5d9e8553fec991f',
                                  },
                                },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                          score_mode: 'none',
                          // ✅ The `nested` query syntax includes the `ignore_unmapped` option
                          ignore_unmapped: true,
                        },
                      },
                      {
                        nested: {
                          path: 'threat.enrichments',
                          query: {
                            bool: {
                              should: [
                                {
                                  match: {
                                    'threat.enrichments.matched.type': 'indicator_match_rule',
                                  },
                                },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                          score_mode: 'none',
                          ignore_unmapped: true,
                        },
                      },
                      {
                        nested: {
                          path: 'threat.enrichments',
                          query: {
                            bool: {
                              should: [
                                {
                                  match: {
                                    'threat.enrichments.matched.field': 'file.hash.md5',
                                  },
                                },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                          score_mode: 'none',
                          ignore_unmapped: true,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        exists: {
                          // ✅ Non-nested fields are NOT converted to the `nested` query syntax
                          // ✅ Non-nested fields do NOT include the `ignore_unmapped` option
                          field: '@timestamp',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
          {
            exists: {
              field: '_id',
            },
          },
        ],
        should: [],
        must_not: [],
      },
    });
  });

  it('should, when the default is overridden, build a query where `nested` fields include the `"ignore_unmapped":false` option', () => {
    const configWithOverride = {
      ...config,
      nestedIgnoreUnmapped: false, // <-- override the default
    };

    const [converted, _] = convertToBuildEsQuery({
      config: configWithOverride,
      dataView: createStubDataView({ spec: {} }),
      queries: queryWithNestedFields,
      dataViewSpec: mockDataViewSpec,
      filters,
    });

    expect(JSON.parse(converted ?? '')).to.eql({
      bool: {
        must: [],
        filter: [
          {
            bool: {
              filter: [
                {
                  bool: {
                    filter: [
                      {
                        nested: {
                          path: 'threat.enrichments',
                          query: {
                            bool: {
                              should: [
                                {
                                  match: {
                                    'threat.enrichments.matched.atomic':
                                      'a4f87cbcd2a4241da77b6bf0c5d9e8553fec991f',
                                  },
                                },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                          score_mode: 'none',
                          ignore_unmapped: false, // <-- overridden by the config to be false
                        },
                      },
                      {
                        nested: {
                          path: 'threat.enrichments',
                          query: {
                            bool: {
                              should: [
                                {
                                  match: {
                                    'threat.enrichments.matched.type': 'indicator_match_rule',
                                  },
                                },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                          score_mode: 'none',
                          ignore_unmapped: false,
                        },
                      },
                      {
                        nested: {
                          path: 'threat.enrichments',
                          query: {
                            bool: {
                              should: [
                                {
                                  match: {
                                    'threat.enrichments.matched.field': 'file.hash.md5',
                                  },
                                },
                              ],
                              minimum_should_match: 1,
                            },
                          },
                          score_mode: 'none',
                          ignore_unmapped: false,
                        },
                      },
                    ],
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        exists: {
                          field: '@timestamp',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
          {
            exists: {
              field: '_id',
            },
          },
        ],
        should: [],
        must_not: [],
      },
    });
  });
});

describe('buildGlobalQuery', () => {
  it('should generate correct kql query when provided value is an array', () => {
    const providers = [
      {
        and: [],
        enabled: true,
        id: 'event-details-value-default-draggable-plain-column-renderer-formatted-field-value-timeline-1-Imhtx44Bu3sCtYk3xxsO-host_name-p1',
        name: 'p1',
        excluded: false,
        kqlQuery: '',
        queryMatch: {
          field: 'host.name',
          value: ['p1', 'p2'],
          operator: 'includes',
          displayField: 'host.name',
          displayValue: '( p1 OR p2 )',
        },
      } as DataProvider,
    ];

    const query = buildGlobalQuery(providers, {});

    expect(query).to.equal('host.name : (p1 OR p2)');
  });
});

describe('combineQueries', () => {
  const config = {
    allowLeadingWildcards: true,
    queryStringOptions: {
      analyze_wildcard: true,
    },
    ignoreFilterIfFieldNotInIndex: false,
    dateFormatTZ: 'Browser',
  };

  const browserFields = {};

  describe('AND mode (filter)', () => {
    it('should combine KQL data provider with KQL search query using AND', () => {
      const dataProviders: DataProvider[] = [
        {
          and: [],
          enabled: true,
          id: 'test-id',
          name: 'test',
          excluded: false,
          kqlQuery: '',
          type: DataProviderTypeEnum.default,
          queryMatch: {
            field: 'event.action',
            value: 'start',
            operator: ':',
            displayField: 'event.action',
            displayValue: 'start',
          },
        },
      ];

      const result = combineQueries({
        config,
        dataProviders,
        dataView: createStubDataView({ spec: {} }),
        dataViewSpec: mockDataViewSpec,
        browserFields,
        filters: [],
        kqlQuery: { query: 'event.action : stop', language: 'kuery' },
        kqlMode: 'filter',
      });

      expect(result).not.to.be(null);
      expect(result?.baseKqlQuery.query).to.equal(
        '(event.action : "start") AND (event.action : stop)'
      );
      expect(result?.filterQuery).to.be.a('string');
      expect(result?.kqlError).to.be(undefined);
    });

    it('should combine KQL data provider with Lucene search query using AND', () => {
      const dataProviders: DataProvider[] = [
        {
          and: [],
          enabled: true,
          id: 'test-id',
          name: 'test',
          excluded: false,
          kqlQuery: '',
          type: DataProviderTypeEnum.default,
          queryMatch: {
            field: 'event.action',
            value: 'start',
            operator: ':',
            displayField: 'event.action',
            displayValue: 'start',
          },
        },
      ];

      const result = combineQueries({
        config,
        dataProviders,
        dataView: createStubDataView({ spec: {} }),
        dataViewSpec: mockDataViewSpec,
        browserFields,
        filters: [],
        kqlQuery: { query: 'event.action: start OR rename', language: 'lucene' },
        kqlMode: 'filter',
      });

      expect(result).not.to.be(null);
      expect(result?.baseKqlQuery.query).to.equal(
        '(event.action : "start") AND (event.action: start OR rename)'
      );
      expect(result?.baseKqlQuery.language).to.equal('lucene');
      expect(result?.filterQuery).to.be.a('string');
      expect(result?.kqlError).to.be(undefined);
    });
  });

  describe('OR mode (search)', () => {
    it('should combine KQL data provider with KQL search query using OR', () => {
      const dataProviders: DataProvider[] = [
        {
          and: [],
          enabled: true,
          id: 'test-id',
          name: 'test',
          excluded: false,
          kqlQuery: '',
          type: DataProviderTypeEnum.default,
          queryMatch: {
            field: 'event.action',
            value: 'start',
            operator: ':',
            displayField: 'event.action',
            displayValue: 'start',
          },
        },
      ];

      const result = combineQueries({
        config,
        dataProviders,
        dataView: createStubDataView({ spec: {} }),
        dataViewSpec: mockDataViewSpec,
        browserFields,
        filters: [],
        kqlQuery: { query: 'event.action : stop', language: 'kuery' },
        kqlMode: 'search',
      });

      expect(result).not.to.be(null);
      expect(result?.baseKqlQuery.query).to.equal(
        '(event.action : "start") OR (event.action : stop)'
      );
      expect(result?.filterQuery).to.be.a('string');

      // Verify the ES query has OR structure
      const esQuery = JSON.parse(result?.filterQuery || '{}');
      expect(esQuery.bool).to.have.property('should');
      expect(esQuery.bool.should).to.be.an('array');
      expect(esQuery.bool.minimum_should_match).to.equal(1);
    });

    it('should combine KQL data provider with Lucene search query using OR', () => {
      const dataProviders: DataProvider[] = [
        {
          and: [],
          enabled: true,
          id: 'test-id',
          name: 'test',
          excluded: false,
          kqlQuery: '',
          type: DataProviderTypeEnum.default,
          queryMatch: {
            field: 'event.action',
            value: 'start',
            operator: ':',
            displayField: 'event.action',
            displayValue: 'start',
          },
        },
      ];

      const result = combineQueries({
        config,
        dataProviders,
        dataView: createStubDataView({ spec: {} }),
        dataViewSpec: mockDataViewSpec,
        browserFields,
        filters: [],
        kqlQuery: { query: 'event.action: start OR rename', language: 'lucene' },
        kqlMode: 'search',
      });

      expect(result).not.to.be(null);
      expect(result?.baseKqlQuery.query).to.equal(
        '(event.action : "start") OR (event.action: start OR rename)'
      );
      expect(result?.baseKqlQuery.language).to.equal('lucene');
      expect(result?.filterQuery).to.be.a('string');

      // Verify the ES query has OR structure
      const esQuery = JSON.parse(result?.filterQuery || '{}');
      expect(esQuery.bool).to.have.property('should');
      expect(esQuery.bool.should).to.be.an('array');
      expect(esQuery.bool.minimum_should_match).to.equal(1);
    });

    it('should apply filters with AND logic on top of OR queries', () => {
      const dataProviders: DataProvider[] = [
        {
          and: [],
          enabled: true,
          id: 'test-id',
          name: 'test',
          excluded: false,
          kqlQuery: '',
          type: DataProviderTypeEnum.default,
          queryMatch: {
            field: 'event.action',
            value: 'start',
            operator: ':',
            displayField: 'event.action',
            displayValue: 'start',
          },
        },
      ];

      const filters = [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'exists',
            key: '_id',
            value: 'exists',
          },
          query: {
            exists: {
              field: '_id',
            },
          },
        },
      ];

      const result = combineQueries({
        config,
        dataProviders,
        dataView: createStubDataView({ spec: {} }),
        dataViewSpec: mockDataViewSpec,
        browserFields,
        filters,
        kqlQuery: { query: 'event.action : stop', language: 'kuery' },
        kqlMode: 'search',
      });

      expect(result).not.to.be(null);
      expect(result?.filterQuery).to.be.a('string');

      // Verify filters are applied with AND logic
      const esQuery = JSON.parse(result?.filterQuery || '{}');
      expect(esQuery.bool).to.have.property('must');
      expect(esQuery.bool.must).to.be.an('array');
      // The structure has changed - filters are in the must array, and the OR queries are in a nested structure
      expect(esQuery.bool.must[0]).to.be.an('object');
      expect(esQuery.bool.must[1]).to.be.an('object');
    });
  });

  describe('edge cases', () => {
    it('should return null when all inputs are empty', () => {
      const result = combineQueries({
        config,
        dataProviders: [],
        dataView: createStubDataView({ spec: {} }),
        dataViewSpec: mockDataViewSpec,
        browserFields,
        filters: [],
        kqlQuery: { query: '', language: 'kuery' },
        kqlMode: 'filter',
      });

      expect(result).to.be(null);
    });

    it('should handle only filters (no data providers or search query)', () => {
      const filters = [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'exists',
            key: '_id',
            value: 'exists',
          },
          query: {
            exists: {
              field: '_id',
            },
          },
        },
      ];

      const result = combineQueries({
        config,
        dataProviders: [],
        dataView: createStubDataView({ spec: {} }),
        dataViewSpec: mockDataViewSpec,
        browserFields,
        filters,
        kqlQuery: { query: '', language: 'kuery' },
        kqlMode: 'filter',
      });

      expect(result).not.to.be(null);
      expect(result?.baseKqlQuery.query).to.equal('');
      expect(result?.filterQuery).to.be.a('string');
    });

    it('should handle only data providers (no search query)', () => {
      const dataProviders: DataProvider[] = [
        {
          and: [],
          enabled: true,
          id: 'test-id',
          name: 'test',
          excluded: false,
          kqlQuery: '',
          type: DataProviderTypeEnum.default,
          queryMatch: {
            field: 'event.action',
            value: 'start',
            operator: ':',
            displayField: 'event.action',
            displayValue: 'start',
          },
        },
      ];

      const result = combineQueries({
        config,
        dataProviders,
        dataView: createStubDataView({ spec: {} }),
        dataViewSpec: mockDataViewSpec,
        browserFields,
        filters: [],
        kqlQuery: { query: '', language: 'kuery' },
        kqlMode: 'filter',
      });

      expect(result).not.to.be(null);
      expect(result?.baseKqlQuery.query).to.equal('(event.action : "start")');
      expect(result?.filterQuery).to.be.a('string');
    });

    it('should handle only search query (no data providers)', () => {
      const result = combineQueries({
        config,
        dataProviders: [],
        dataView: createStubDataView({ spec: {} }),
        dataViewSpec: mockDataViewSpec,
        browserFields,
        filters: [],
        kqlQuery: { query: 'event.action : stop', language: 'kuery' },
        kqlMode: 'filter',
      });

      expect(result).not.to.be(null);
      expect(result?.baseKqlQuery.query).to.equal('(event.action : stop)');
      expect(result?.filterQuery).to.be.a('string');
    });

    it('should handle disabled data providers', () => {
      const dataProviders: DataProvider[] = [
        {
          and: [],
          enabled: false,
          id: 'test-id',
          name: 'test',
          excluded: false,
          kqlQuery: '',
          type: DataProviderTypeEnum.default,
          queryMatch: {
            field: 'event.action',
            value: 'start',
            operator: ':',
            displayField: 'event.action',
            displayValue: 'start',
          },
        },
      ];

      const result = combineQueries({
        config,
        dataProviders,
        dataView: createStubDataView({ spec: {} }),
        dataViewSpec: mockDataViewSpec,
        browserFields,
        filters: [],
        kqlQuery: { query: 'event.action : stop', language: 'kuery' },
        kqlMode: 'filter',
      });

      expect(result).not.to.be(null);
      // Should only have the search query since data provider is disabled
      expect(result?.baseKqlQuery.query).to.equal('(event.action : stop)');
    });
  });
});
