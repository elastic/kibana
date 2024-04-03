/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { AlertConsumers } from '@kbn/rule-data-utils';

import { RuleRegistrySearchResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  obsOnlySpacesAll,
  logsOnlySpacesAll,
  secOnlySpacesAllEsReadAll,
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
            featureIds: [AlertConsumers.LOGS],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
        });
        expect(result.rawResponse.hits.total).to.eql(5);
        const consumers = result.rawResponse.hits.hits.map((hit) => {
          return hit.fields?.['kibana.alert.rule.consumer'];
        });
        expect(consumers.every((consumer) => consumer === AlertConsumers.LOGS));
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
            featureIds: [AlertConsumers.LOGS],
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
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
        await esArchiver.load('x-pack/test/functional/es_archives/security_solution/alerts/8.1.0');
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/alerts/8.1.0'
        );
        await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
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
            featureIds: [AlertConsumers.SIEM],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
        });
        expect(result.rawResponse.hits.total).to.eql(50);
        const consumers = result.rawResponse.hits.hits.map(
          (hit) => hit.fields?.['kibana.alert.rule.consumer']
        );
        expect(consumers.every((consumer) => consumer === AlertConsumers.SIEM));
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
            featureIds: [AlertConsumers.SIEM, AlertConsumers.LOGS],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
        });
        expect(result.statusCode).to.be(500);
        expect(result.message).to.be(
          `The privateRuleRegistryAlertsSearchStrategy search strategy is unable to accommodate requests containing multiple feature IDs and one of those IDs is SIEM.`
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
            featureIds: [AlertConsumers.SIEM],
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
            featureIds: [AlertConsumers.APM],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
          space: 'default',
        });
        expect(result.rawResponse.hits.total).to.eql(9);
        const consumers = result.rawResponse.hits.hits.map(
          (hit) => hit.fields?.['kibana.alert.rule.consumer']
        );
        expect(consumers.every((consumer) => consumer === AlertConsumers.APM));
      });

      it('should not by pass our RBAC authz filter with a should filter', async () => {
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
            featureIds: [AlertConsumers.APM],
            query: {
              bool: {
                filter: [],
                should: [
                  {
                    bool: {
                      should: [
                        {
                          match: {
                            'kibana.alert.rule.consumer': 'logs',
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
        const consumers = result.rawResponse.hits.hits.map(
          (hit) => hit.fields?.['kibana.alert.rule.consumer']
        );
        expect(consumers.every((consumer) => consumer === AlertConsumers.APM));
      });

      it('should return an empty response with must filter and our RBAC authz filter', async () => {
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
            featureIds: [AlertConsumers.APM],
            query: {
              bool: {
                filter: [],
                must: [
                  {
                    bool: {
                      should: [
                        {
                          match: {
                            'kibana.alert.rule.consumer': 'logs',
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

      it('should not by pass our RBAC authz filter with must_not filter', async () => {
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
            featureIds: [AlertConsumers.APM],
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
        const consumers = result.rawResponse.hits.hits.map(
          (hit) => hit.fields?.['kibana.alert.rule.consumer']
        );
        expect(consumers.every((consumer) => consumer === AlertConsumers.APM));
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
            featureIds: [],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
        });
        expect(result.rawResponse).to.eql({});
      });
    });
  });
};
