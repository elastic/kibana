/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractErrorMessage,
  defaultErrorMessage,
  buildMutedRulesFilter,
  buildEntityAlertsQuery,
  buildGenericEntityFlyoutPreviewQuery,
  buildMisconfigurationEntityFlyoutPreviewQuery,
  buildVulnerabilityEntityFlyoutPreviewQuery,
  getEnrichPolicyId,
  getEntitiesLatestIndexName,
} from './helpers';

const fallbackMessage = 'thisIsAFallBackMessage';

describe('test helper methods', () => {
  describe('extractErrorMessage Test', () => {
    it('should return error message if input is instance of Error', () => {
      const errorMessage = 'thisIsInstanceOfErrorMessage';
      const error = new Error(errorMessage);
      const extractedErrorMessage = extractErrorMessage(error, fallbackMessage);

      expect(extractedErrorMessage).toMatch(errorMessage);
    });

    it('should return string if input is string', () => {
      const error: string = 'thisIsAString';
      const extractedErrorMessage = extractErrorMessage(error, fallbackMessage);

      expect(extractedErrorMessage).toMatch(error);
    });

    it('should return fallbackMessage is input is not string nor instance of Error', () => {
      const error: number = 12345;
      const extractedErrorMessage = extractErrorMessage(error, fallbackMessage);

      expect(extractedErrorMessage).toMatch(fallbackMessage);
    });

    it('should return default message when input is not string nor instance of Error and fallbackMessage is not provided', () => {
      const error: number = 12345;
      const extractedErrorMessage = extractErrorMessage(error);

      expect(extractedErrorMessage).toMatch(defaultErrorMessage);
    });
  });

  describe('buildMutedRulesFilter Test', () => {
    it('should return an empty array if no rules are muted', () => {
      const rulesStates = {
        rule1: {
          muted: false,
          benchmark_id: '1',
          benchmark_version: '1.0',
          rule_number: '1',
          rule_id: '11',
        },
        rule2: {
          muted: false,
          benchmark_id: '2',
          benchmark_version: '1.0',
          rule_number: '2',
          rule_id: '22',
        },
      };

      expect(buildMutedRulesFilter(rulesStates)).toEqual([]);
    });

    it('should return the correct query for a single muted rule', () => {
      const rulesStates = {
        rule1: {
          muted: true,
          benchmark_id: '1',
          benchmark_version: '1.0',
          rule_number: '1',
          rule_id: '11',
        },
        rule2: {
          muted: false,
          benchmark_id: '2',
          benchmark_version: '1.0',
          rule_number: '2',
          rule_id: '22',
        },
      };

      const expectedQuery = [
        {
          bool: {
            must: [
              { term: { 'rule.benchmark.id': '1' } },
              { term: { 'rule.benchmark.version': '1.0' } },
              { term: { 'rule.benchmark.rule_number': '1' } },
            ],
          },
        },
      ];

      expect(buildMutedRulesFilter(rulesStates)).toEqual(expectedQuery);
    });

    it('should return the correct queries for multiple muted rules', () => {
      const rulesStates = {
        rule1: {
          muted: true,
          benchmark_id: '1',
          benchmark_version: '1.0',
          rule_number: '1',
          rule_id: '11',
        },
        rule2: {
          muted: true,
          benchmark_id: '2',
          benchmark_version: '1.0',
          rule_number: '2',
          rule_id: '22',
        },
      };

      const expectedQuery = [
        {
          bool: {
            must: [
              { term: { 'rule.benchmark.id': '1' } },
              { term: { 'rule.benchmark.version': '1.0' } },
              { term: { 'rule.benchmark.rule_number': '1' } },
            ],
          },
        },
        {
          bool: {
            must: [
              { term: { 'rule.benchmark.id': '2' } },
              { term: { 'rule.benchmark.version': '1.0' } },
              { term: { 'rule.benchmark.rule_number': '2' } },
            ],
          },
        },
      ];

      expect(buildMutedRulesFilter(rulesStates)).toEqual(expectedQuery);
    });
  });

  describe('buildGenericEntityFlyoutPreviewQuery', () => {
    it('should return the correct query when given field and query', () => {
      const field = 'host.name';
      const query = 'exampleHost';
      const expectedQuery = {
        bool: {
          filter: [
            {
              bool: {
                should: [{ term: { 'host.name': 'exampleHost' } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      };

      expect(buildGenericEntityFlyoutPreviewQuery(field, query)).toEqual(expectedQuery);
    });

    it('should return the correct query when given field and empty query and empty status', () => {
      const field = 'host.name';
      const expectedQuery = {
        bool: {
          filter: [
            {
              bool: {
                should: [{ term: { 'host.name': '' } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      };

      expect(buildGenericEntityFlyoutPreviewQuery(field)).toEqual(expectedQuery);
    });

    it('should return the correct query when given field and queryValue and status but empty queryField', () => {
      const field = 'host.name';
      const query = 'exampleHost';
      const status = 'pass';
      const expectedQuery = {
        bool: {
          filter: [
            {
              bool: {
                should: [{ term: { 'host.name': 'exampleHost' } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      };

      expect(buildGenericEntityFlyoutPreviewQuery(field, query, status)).toEqual(expectedQuery);
    });

    it('should return the correct query when given field and queryValue and queryField but empty status', () => {
      const field = 'host.name';
      const query = 'exampleHost';
      const emptyStatus = undefined;
      const queryField = 'some.field';
      const expectedQuery = {
        bool: {
          filter: [
            {
              bool: {
                should: [{ term: { 'host.name': 'exampleHost' } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      };

      expect(buildGenericEntityFlyoutPreviewQuery(field, query, emptyStatus, queryField)).toEqual(
        expectedQuery
      );
    });

    it('should return the correct query when given all the parameters', () => {
      const field = 'host.name';
      const query = 'exampleHost';
      const emptyStatus = 'some.status';
      const queryField = 'some.field';
      const expectedQuery = {
        bool: {
          filter: [
            {
              bool: {
                should: [{ term: { 'host.name': 'exampleHost' } }],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [
                  { term: { 'some.field': { value: 'some.status', case_insensitive: true } } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      };

      expect(buildGenericEntityFlyoutPreviewQuery(field, query, emptyStatus, queryField)).toEqual(
        expectedQuery
      );
    });
  });

  describe('buildMisconfigurationEntityFlyoutPreviewQuery', () => {
    it('should return the correct query when given field, queryValue, status and queryType Misconfiguration', () => {
      const field = 'host.name';
      const queryValue = 'exampleHost';
      const status = 'pass';
      const expectedQuery = {
        bool: {
          filter: [
            {
              bool: {
                should: [{ term: { 'host.name': 'exampleHost' } }],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [
                  { term: { 'result.evaluation': { value: 'pass', case_insensitive: true } } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      };

      expect(buildMisconfigurationEntityFlyoutPreviewQuery(field, queryValue, status)).toEqual(
        expectedQuery
      );
    });
  });
  describe('buildVulnerabilityEntityFlyoutPreviewQuery', () => {
    it('should return the correct query when given field, queryValue, status and queryType Vulnerability', () => {
      const field = 'host.name';
      const queryValue = 'exampleHost';
      const status = 'low';
      const expectedQuery = {
        bool: {
          filter: [
            {
              bool: {
                should: [{ term: { 'host.name': 'exampleHost' } }],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [
                  { term: { 'vulnerability.severity': { value: 'low', case_insensitive: true } } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      };

      expect(buildVulnerabilityEntityFlyoutPreviewQuery(field, queryValue, status)).toEqual(
        expectedQuery
      );
    });
  });

  describe('buildEntityAlertsQuery', () => {
    const field: 'host.name' | 'user.name' = 'host.name';
    const query = 'exampleHost';
    const to = 'Tomorrow';
    const from = 'Today';
    const getExpectedAlertsQuery = (
      size?: number,
      severity?: string,
      sortField?: string,
      sortDirection?: 'asc' | 'desc'
    ) => {
      return {
        sort: sortField ? [{ [sortField]: sortDirection }] : [],
        size: size || 0,
        // TODO: Asset Invnetory - remove temp runtime mapping
        runtime_mappings: {
          'related.entity': {
            type: 'keyword',
          },
        },
        _source: false,
        fields: [
          '_id',
          '_index',
          'kibana.alert.rule.uuid',
          'kibana.alert.severity',
          'kibana.alert.rule.name',
          'kibana.alert.workflow_status',
        ],
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      term: {
                        'host.name': 'exampleHost',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
              severity
                ? {
                    bool: {
                      should: [
                        {
                          term: {
                            'kibana.alert.severity': 'low',
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  }
                : undefined,
              {
                range: {
                  '@timestamp': {
                    gte: 'Today',
                    lte: 'Tomorrow',
                  },
                },
              },
              {
                terms: {
                  'kibana.alert.workflow_status': ['open', 'acknowledged'],
                },
              },
            ].filter(Boolean),
          },
        },
      };
    };

    it('should return the correct query when given all params', () => {
      const size = 100;
      const testObjectParams = {
        field,
        to,
        from,
        queryValue: query,
        size,
      };

      expect(buildEntityAlertsQuery(testObjectParams)).toEqual(getExpectedAlertsQuery(size));
    });

    it('should return the correct query when not given size', () => {
      const size = undefined;
      const testObjectParams = {
        field,
        to,
        from,
        queryValue: query,
        size,
      };

      expect(buildEntityAlertsQuery(testObjectParams)).toEqual(getExpectedAlertsQuery(size));
    });

    it('should return the correct query when given severity query', () => {
      const size = undefined;
      const severity = 'low';
      const testObjectParams = {
        field,
        to,
        from,
        queryValue: query,
        size,
        severity,
      };

      expect(buildEntityAlertsQuery(testObjectParams)).toEqual(getExpectedAlertsQuery(size, 'low'));
    });

    it('should return the correct query when given sort parameter', () => {
      const size = undefined;
      const severity = 'low';
      const sortField = 'sort.field';
      const sortDirection = 'asc';
      const testObjectParams = {
        field,
        to,
        from,
        queryValue: query,
        size,
        severity,
        sortField,
        sortDirection,
      };

      expect(buildEntityAlertsQuery(testObjectParams)).toEqual(
        getExpectedAlertsQuery(size, 'low', sortField, sortDirection)
      );
    });
  });

  describe('getEnrichPolicyId', () => {
    it('should return the default policy ID when no space is provided', () => {
      const policyId = getEnrichPolicyId();
      const expected = 'entity_store_field_retention_generic_default_v1.0.0';
      expect(policyId).toEqual(expected);
    });

    it('should return a policy ID with the provided space', () => {
      const space = 'test-space';
      const policyId = getEnrichPolicyId(space);
      const expected = 'entity_store_field_retention_generic_test-space_v1.0.0';
      expect(policyId).toEqual(expected);
    });

    it('should handle special characters in space IDs', () => {
      const space = 'special-chars_123';
      const policyId = getEnrichPolicyId(space);
      const expected = 'entity_store_field_retention_generic_special-chars_123_v1.0.0';
      expect(policyId).toEqual(expected);
    });

    it('should produce a different ID for each space', () => {
      const space1 = 'space1';
      const space2 = 'space2';
      const policyId1 = getEnrichPolicyId(space1);
      const policyId2 = getEnrichPolicyId(space2);
      expect(policyId1).not.toEqual(policyId2);
      expect(policyId1).toEqual('entity_store_field_retention_generic_space1_v1.0.0');
      expect(policyId2).toEqual('entity_store_field_retention_generic_space2_v1.0.0');
    });
  });

  describe('getEntitiesLatestIndexName', () => {
    it('should return the index name with the provided spaceId', () => {
      const indexName = getEntitiesLatestIndexName('default');
      const expected = '.entities.v2.latest.security_default';
      expect(indexName).toEqual(expected);
    });

    it('should return a index name with a custom space', () => {
      const space = 'test-space';
      const indexName = getEntitiesLatestIndexName(space);
      const expected = '.entities.v2.latest.security_test-space';
      expect(indexName).toEqual(expected);
    });

    it('should handle special characters in space IDs', () => {
      const space = 'special-chars_123';
      const indexName = getEntitiesLatestIndexName(space);
      const expected = '.entities.v2.latest.security_special-chars_123';
      expect(indexName).toEqual(expected);
    });

    it('should produce a different index name for each space', () => {
      const space1 = 'space1';
      const space2 = 'space2';
      const indexName1 = getEntitiesLatestIndexName(space1);
      const indexName2 = getEntitiesLatestIndexName(space2);
      expect(indexName1).not.toEqual(indexName2);
      expect(indexName1).toEqual('.entities.v2.latest.security_space1');
      expect(indexName2).toEqual('.entities.v2.latest.security_space2');
    });
  });
});
