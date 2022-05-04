/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { AlertConsumers } from '@kbn/rule-data-utils';

import { RuleRegistrySearchResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import { QueryCreateSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  deleteSignalsIndex,
  createSignalsIndex,
  deleteAllAlerts,
  getRuleForSignalTesting,
  createRule,
  waitForSignalsToBePresent,
  waitForRuleSuccessOrStatus,
} from '../../../../detection_engine_api_integration/utils';
import { ID } from '../../../../detection_engine_api_integration/security_and_spaces/tests/generating_signals';
import {
  obsOnlySpacesAllEsRead,
  obsOnlySpacesAll,
  logsOnlySpacesAll,
} from '../../../common/lib/authentication/users';

type RuleRegistrySearchResponseWithErrors = RuleRegistrySearchResponse & {
  statusCode: number;
  message: string;
};

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const secureBsearch = getService('secureBsearch');
  const log = getService('log');
  const kbnClient = getService('kibanaServer');

  const SPACE1 = 'space1';

  // Failing: See https://github.com/elastic/kibana/issues/129219
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

      it('should reject public requests', async () => {
        const result = await secureBsearch.send<RuleRegistrySearchResponseWithErrors>({
          supertestWithoutAuth,
          auth: {
            username: logsOnlySpacesAll.username,
            password: logsOnlySpacesAll.password,
          },
          options: {
            featureIds: [AlertConsumers.LOGS],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
        });
        expect(result.statusCode).to.be(500);
        expect(result.message).to.be(
          `The privateRuleRegistryAlertsSearchStrategy search strategy is currently only available for internal use.`
        );
      });
    });

    describe('siem', () => {
      before(async () => {
        await createSignalsIndex(supertest, log);
        await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts');
        await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');

        const rule: QueryCreateSchema = {
          ...getRuleForSignalTesting(['auditbeat-*']),
          query: `_id:${ID}`,
        };
        const { id: createdId } = await createRule(supertest, log, rule);
        await waitForRuleSuccessOrStatus(supertest, log, createdId);
        await waitForSignalsToBePresent(supertest, log, 1, [createdId]);
      });

      after(async () => {
        await deleteSignalsIndex(supertest, log);
        await deleteAllAlerts(supertest, log);
        await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts');
        await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
      });

      it('should return alerts from siem rules', async () => {
        const result = await secureBsearch.send<RuleRegistrySearchResponse>({
          supertestWithoutAuth,
          auth: {
            username: obsOnlySpacesAllEsRead.username,
            password: obsOnlySpacesAllEsRead.password,
          },
          referer: 'test',
          kibanaVersion,
          options: {
            featureIds: [AlertConsumers.SIEM],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
        });
        expect(result.rawResponse.hits.total).to.eql(1);
        const consumers = result.rawResponse.hits.hits.map(
          (hit) => hit.fields?.['kibana.alert.rule.consumer']
        );
        expect(consumers.every((consumer) => consumer === AlertConsumers.SIEM));
      });

      it('should throw an error when trying to to search for more than just siem', async () => {
        const result = await secureBsearch.send<RuleRegistrySearchResponseWithErrors>({
          supertestWithoutAuth,
          auth: {
            username: obsOnlySpacesAllEsRead.username,
            password: obsOnlySpacesAllEsRead.password,
          },
          referer: 'test',
          kibanaVersion,
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
    });

    describe('apm', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/rule_registry/alerts');
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/rule_registry/alerts');
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
          options: {
            featureIds: [AlertConsumers.APM],
          },
          strategy: 'privateRuleRegistryAlertsSearchStrategy',
          space: SPACE1,
        });
        expect(result.rawResponse.hits.total).to.eql(2);
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
