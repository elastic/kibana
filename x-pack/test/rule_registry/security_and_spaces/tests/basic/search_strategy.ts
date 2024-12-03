/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';

import type { RuleRegistrySearchResponse } from '@kbn/rule-registry-plugin/common';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  obsOnlySpacesAll,
  logsOnlySpacesAll,
  secOnlySpacesAllEsReadAll,
  stackAlertsOnlyAllSpacesAll,
  superUser,
} from '../../../common/lib/authentication/users';

type RuleRegistrySearchResponseWithErrors = RuleRegistrySearchResponse & {
  statusCode: number;
  message: string;
};

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const secureBsearch = getService('secureBsearch');
  const kbnClient = getService('kibanaServer');

  describe('ruleRegistryAlertsSearchStrategy', () => {
    let kibanaVersion: string;
    before(async () => {
      kibanaVersion = await kbnClient.version.get();
    });

    describe('logs', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
      });

      it('should return alerts from log rules', async () => {
        const result = await secureBsearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: logsOnlySpacesAll.username,
            password: logsOnlySpacesAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: ['logs.alert.document.count'],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
        });

        expect(result.rawResponse.hits.total).to.eql(5);

        validateRuleTypeIds(result, ['logs.alert.document.count']);
      });

      it('should support pagination and sorting', async () => {
        const result = await secureBsearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: logsOnlySpacesAll.username,
            password: logsOnlySpacesAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: ['logs.alert.document.count'],
            pagination: {
              pageSize: 2,
              pageIndex: 1,
            },
            sort: [
              {
                'kibana.alert.evaluation.value': {
                  order: 'desc',
                },
              },
            ],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
        });

        expect(result.rawResponse.hits.total).to.eql(5);
        expect(result.rawResponse.hits.hits.length).to.eql(2);

        const first = result.rawResponse.hits.hits[0].fields?.['kibana.alert.evaluation.value'];
        const second = result.rawResponse.hits.hits[1].fields?.['kibana.alert.evaluation.value'];

        expect(first > second).to.be(true);
      });
    });

    describe('siem', () => {
      const siemRuleTypeIds = [
        'siem.indicatorRule',
        'siem.thresholdRule',
        'siem.eqlRule',
        'siem.queryRule',
      ];

      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
        await esArchiver.load('x-pack/test/functional/es_archives/security_solution/alerts/8.1.0');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/alerts/8.1.0'
        );
      });

      it('should return alerts from siem rules', async () => {
        const result = await secureBsearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: secOnlySpacesAllEsReadAll.username,
            password: secOnlySpacesAllEsReadAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: siemRuleTypeIds,
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
        });

        expect(result.rawResponse.hits.total).to.eql(50);

        validateRuleTypeIds(result, siemRuleTypeIds);
      });

      it('should throw an error when trying to to search for more than just siem', async () => {
        const result = await secureBsearch.send<RuleRegistrySearchResponseWithErrors>({
          supertestWithoutAuth,
          auth: {
            username: secOnlySpacesAllEsReadAll.username,
            password: secOnlySpacesAllEsReadAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: ['siem.indicatorRule', 'logs.alert.document.count'],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
        });

        expect(result.statusCode).to.be(400);
        expect(result.message).to.be(
          'The privateRuleRegistryAlertsSearchStrategy search strategy is unable to accommodate requests containing multiple rule types with mixed authorization.'
        );
      });

      it('should be able to handle runtime fields on alerts from siem rules', async () => {
        const runtimeFieldValue = 'hello world';
        const runtimeFieldKey = 'hello_world';
        const result = await secureBsearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: secOnlySpacesAllEsReadAll.username,
            password: secOnlySpacesAllEsReadAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: siemRuleTypeIds,
            runtimeMappings: {
              [runtimeFieldKey]: {
                type: 'keyword',
                script: {
                  source: `emit('${runtimeFieldValue}')`,
                },
              },
            },
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
        });

        expect(result.rawResponse.hits.total).to.eql(50);

        const runtimeFields = result.rawResponse.hits.hits.map(
          (hit) => hit.fields?.[runtimeFieldKey]
        );

        expect(runtimeFields.every((field) => field === runtimeFieldValue));
      });
    });

    describe('apm', () => {
      const apmRuleTypeIds = ['apm.transaction_error_rate', 'apm.error_rate'];

      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
      });

      it('should return alerts from apm rules', async () => {
        const result = await secureBsearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: obsOnlySpacesAll.username,
            password: obsOnlySpacesAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: apmRuleTypeIds,
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
          space: 'default',
        });

        expect(result.rawResponse.hits.total).to.eql(9);

        validateRuleTypeIds(result, apmRuleTypeIds);
      });

      it('should return alerts from different rules', async () => {
        const ruleTypeIds = [...apmRuleTypeIds, 'logs.alert.document.count'];

        const result = await secureSearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: obsOnlySpacesAll.username,
            password: obsOnlySpacesAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds,
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
          space: 'default',
        });

        expect(result.rawResponse.hits.total).to.eql(14);

        validateRuleTypeIds(result, ruleTypeIds);
      });

      it('should filter alerts by rule type IDs with consumers', async () => {
        const result = await secureSearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: obsOnlySpacesAll.username,
            password: obsOnlySpacesAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: apmRuleTypeIds,
            consumers: ['alerts', 'logs'],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
          space: 'default',
        });

        expect(result.rawResponse.hits.total).to.eql(9);

        validateRuleTypeIds(result, apmRuleTypeIds);
      });

      it('should filter alerts by consumers with rule type IDs', async () => {
        const ruleTypeIds = [...apmRuleTypeIds, 'logs.alert.document.count'];

        const result = await secureSearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: obsOnlySpacesAll.username,
            password: obsOnlySpacesAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds,
            consumers: ['alerts'],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
          space: 'default',
        });

        /**
         *There are five documents of rule type logs.alert.document.count
         * The four have the consumer set to alerts
         * and the one has the consumer set to logs.
         * All apm rule types (nine in total) have consumer set to alerts.
         */
        expect(result.rawResponse.hits.total).to.eql(13);

        validateRuleTypeIds(result, ruleTypeIds);
      });

      it('should not by pass our RBAC authz filter with a should filter for rule type ids', async () => {
        const result = await secureSearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: obsOnlySpacesAll.username,
            password: obsOnlySpacesAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: apmRuleTypeIds,
            query: {
              bool: {
                filter: [],
                should: [
                  {
                    bool: {
                      should: [
                        {
                          match: {
                            'kibana.alert.rule.rule_type_id': 'metrics.alert.inventory.threshold',
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
                must: [],
                must_not: [],
              },
            },
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
          space: 'default',
        });

        expect(result.rawResponse.hits.total).to.eql(9);

        validateRuleTypeIds(result, apmRuleTypeIds);
      });

      it('should not by pass our RBAC authz filter with a should filter for consumers', async () => {
        const result = await secureSearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: obsOnlySpacesAll.username,
            password: obsOnlySpacesAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: apmRuleTypeIds,
            query: {
              bool: {
                filter: [],
                should: [
                  {
                    bool: {
                      should: [
                        {
                          match: {
                            'kibana.alert.rule.consumer': 'infrastructure',
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
                must: [],
                must_not: [],
              },
            },
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
          space: 'default',
        });

        expect(result.rawResponse.hits.total).to.eql(9);

        validateRuleTypeIds(result, apmRuleTypeIds);
      });

      it('should return an empty response with must filter and our RBAC authz filter for rule type ids', async () => {
        const result = await secureSearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: obsOnlySpacesAll.username,
            password: obsOnlySpacesAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: apmRuleTypeIds,
            query: {
              bool: {
                filter: [],
                must: [
                  {
                    bool: {
                      should: [
                        {
                          match: {
                            'kibana.alert.rule.rule_type_id': 'metrics.alert.inventory.threshold',
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
                should: [],
                must_not: [],
              },
            },
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
          space: 'default',
        });

        expect(result.rawResponse.hits.total).to.eql(0);
      });

      it('should return an empty response with must filter and our RBAC authz filter for consumers', async () => {
        const result = await secureSearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: obsOnlySpacesAll.username,
            password: obsOnlySpacesAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: apmRuleTypeIds,
            query: {
              bool: {
                filter: [],
                must: [
                  {
                    bool: {
                      should: [
                        {
                          match: {
                            'kibana.alert.rule.consumer': 'infrastructure',
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
                should: [],
                must_not: [],
              },
            },
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
          space: 'default',
        });

        expect(result.rawResponse.hits.total).to.eql(0);
      });

      it('should not by pass our RBAC authz filter with must_not filter for rule type ids', async () => {
        const result = await secureSearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: obsOnlySpacesAll.username,
            password: obsOnlySpacesAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: apmRuleTypeIds,
            query: {
              bool: {
                filter: [],
                must: [],
                must_not: [
                  {
                    bool: {
                      should: [
                        ...apmRuleTypeIds.map((apmRuleTypeId) => ({
                          match: {
                            'kibana.alert.rule.rule_type_id': apmRuleTypeId,
                          },
                        })),
                      ],
                      minimum_should_match: apmRuleTypeIds.length,
                    },
                  },
                ],
                should: [],
              },
            },
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
          space: 'default',
        });

        expect(result.rawResponse.hits.total).to.eql(9);

        validateRuleTypeIds(result, apmRuleTypeIds);
      });

      it('should not by pass our RBAC authz filter with must_not filter for consumers', async () => {
        const result = await secureSearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: obsOnlySpacesAll.username,
            password: obsOnlySpacesAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: apmRuleTypeIds,
            query: {
              bool: {
                filter: [],
                must: [],
                must_not: [
                  {
                    bool: {
                      should: [
                        {
                          match: {
                            'kibana.alert.rule.consumer': 'apm',
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
                should: [],
              },
            },
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
          space: 'default',
        });

        expect(result.rawResponse.hits.total).to.eql(9);

        validateRuleTypeIds(result, apmRuleTypeIds);
      });

      it('should not by pass our RBAC authz filter with the ruleTypeIds and consumers parameter', async () => {
        const ruleTypeIds = [
          ...apmRuleTypeIds,
          'metrics.alert.inventory.threshold',
          'metrics.alert.threshold',
          '.es-query',
        ];

        const result = await secureSearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            /**
             * obsOnlySpacesAll does not have access to the following pairs:
             *
             * Rule type ID: metrics.alert.inventory.threshold
             * Consumer: alerts
             *
             * Rule type ID: metrics.alert.threshold
             * Consumer: alerts
             *
             * Rule type ID: .es-query
             * Consumer: discover
             */
            username: obsOnlySpacesAll.username,
            password: obsOnlySpacesAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds,
            consumers: ['alerts', 'discover'],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
          space: 'default',
        });

        expect(result.rawResponse.hits.total).to.eql(9);

        validateRuleTypeIds(result, apmRuleTypeIds);
      });

      it('should not return any alerts if the user does not have access to any alerts', async () => {
        const result = await secureSearch.send<RuleRegistrySearchResponseWithErrors>({
          supertestWithoutAuth,
          auth: {
            username: obsOnlySpacesAll.username,
            password: obsOnlySpacesAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: ['metrics.alert.threshold', 'metrics.alert.inventory.threshold'],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
          space: 'default',
        });

        expect(result.rawResponse.hits.total).to.eql(0);
      });

      it('should not return alerts that the user does not have access to', async () => {
        const result = await secureSearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: obsOnlySpacesAll.username,
            password: obsOnlySpacesAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: ['metrics.alert.threshold', 'logs.alert.document.count'],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
          space: 'default',
        });

        expect(result.rawResponse.hits.total).to.eql(5);
        validateRuleTypeIds(result, ['logs.alert.document.count']);
      });

      it('should not return alerts if the user does not have access to using a filter', async () => {
        const result = await secureSearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: obsOnlySpacesAll.username,
            password: obsOnlySpacesAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: apmRuleTypeIds,
            query: {
              bool: {
                filter: [],
                should: [
                  {
                    bool: {
                      should: [
                        {
                          match: {
                            'kibana.alert.rule.rule_type_id': 'metrics.alert.inventory.threshold',
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
                must: [],
                must_not: [],
              },
            },
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
          space: 'default',
        });

        expect(result.rawResponse.hits.total).to.eql(9);

        validateRuleTypeIds(result, apmRuleTypeIds);
      });
    });

    describe('discover', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
      });

      it('should return alerts from .es-query rule type with consumer discover with access only to stack rules', async () => {
        const result = await secureBsearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: stackAlertsOnlyAllSpacesAll.username,
            password: stackAlertsOnlyAllSpacesAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: ['.es-query'],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
        });

        validateRuleTypeIds(result, ['.es-query']);

        expect(result.rawResponse.hits.total).to.eql(1);

        const consumers = result.rawResponse.hits.hits.map((hit) => {
          return hit.fields?.['kibana.alert.rule.consumer'];
        });

        expect(consumers.every((consumer) => consumer === 'discover'));
      });

      it('should return alerts from .es-query rule type with consumer discover as superuser', async () => {
        const result = await secureBsearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: superUser.username,
            password: superUser.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: ['.es-query'],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
        });

        validateRuleTypeIds(result, ['.es-query']);

        expect(result.rawResponse.hits.total).to.eql(1);

        const consumers = result.rawResponse.hits.hits.map((hit) => {
          return hit.fields?.['kibana.alert.rule.consumer'];
        });

        expect(consumers.every((consumer) => consumer === 'discover'));
      });

      it('should not return alerts from .es-query rule type with consumer discover without access to stack rules', async () => {
        const result = await secureBsearch.send<RuleRegistrySearchResponseWithErrors>({
          supertestWithoutAuth,
          auth: {
            username: logsOnlySpacesAll.username,
            password: logsOnlySpacesAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: ['.es-query'],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
        });

        expect(result.rawResponse.hits.total).to.eql(0);
      });
    });

    describe('empty response', () => {
      it('should return an empty response', async () => {
        const result = await secureBsearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: obsOnlySpacesAll.username,
            password: obsOnlySpacesAll.password,
          },
          referer: 'test',
          kibanaVersion,
          internalOrigin: 'Kibana',
          options: {
            ruleTypeIds: [],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
        });

        expect(result.rawResponse.hits.total).to.eql(0);
      });
    });
  });
};

const validateRuleTypeIds = (result: RuleRegistrySearchResponse, ruleTypeIdsToVerify: string[]) => {
  expect(result.rawResponse.hits.total).to.greaterThan(0);

  const ruleTypeIds = result.rawResponse.hits.hits
    .map((hit) => {
      return hit.fields?.['kibana.alert.rule.rule_type_id'];
    })
    .flat();

  expect(
    ruleTypeIds.every((ruleTypeId) =>
      ruleTypeIdsToVerify.some((ruleTypeIdToVerify) => ruleTypeIdToVerify === ruleTypeId)
    )
  ).to.eql(true);
};
