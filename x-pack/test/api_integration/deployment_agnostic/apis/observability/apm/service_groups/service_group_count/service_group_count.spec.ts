/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { AggregationType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';
import {
  createServiceGroupApi,
  deleteAllServiceGroups,
  getServiceGroupCounts,
} from '../service_groups_api_methods';
import { generateData } from './generate_data';
import { APM_ACTION_VARIABLE_INDEX, APM_ALERTS_INDEX } from '../../alerts/helpers/alerting_helper';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const synthtrace = getService('synthtrace');
  const apmApiClient = getService('apmApi');
  const alertingApi = getService('alertingApi');
  const samlAuth = getService('samlAuth');

  const start = Date.now() - 24 * 60 * 60 * 1000;
  const end = Date.now();

  describe('Service group counts', () => {
    let synthbeansServiceGroupId: string;
    let opbeansServiceGroupId: string;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    let roleAuthc: RoleCredentials;

    before(async () => {
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

      const [, { body: synthbeansServiceGroup }, { body: opbeansServiceGroup }] = await Promise.all(
        [
          generateData({ start, end, apmSynthtraceEsClient }),
          createServiceGroupApi({
            apmApiClient,
            groupName: 'synthbeans',
            kuery: 'service.name: synth*',
          }),
          createServiceGroupApi({
            apmApiClient,
            groupName: 'opbeans',
            kuery: 'service.name: opbeans*',
          }),
        ]
      );
      synthbeansServiceGroupId = synthbeansServiceGroup.id;
      opbeansServiceGroupId = opbeansServiceGroup.id;
    });

    after(async () => {
      await deleteAllServiceGroups(apmApiClient);
      await apmSynthtraceEsClient.clean();
    });

    it('returns the correct number of services', async () => {
      const response = await getServiceGroupCounts(apmApiClient);
      expect(response.status).to.be(200);
      expect(Object.keys(response.body).length).to.be(2);
      expect(response.body[synthbeansServiceGroupId]).to.have.property('services', 2);
      expect(response.body[opbeansServiceGroupId]).to.have.property('services', 1);
    });

    describe('with alerts', () => {
      let ruleId: string;

      before(async () => {
        roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
        const createdRule = await alertingApi.createRule({
          name: 'Latency threshold | synth-go',
          params: {
            serviceName: 'synth-go',
            transactionType: undefined,
            windowSize: 5,
            windowUnit: 'h',
            threshold: 100,
            aggregationType: AggregationType.Avg,
            environment: 'testing',
          },
          ruleTypeId: ApmRuleType.TransactionDuration,
          consumer: 'apm',
          roleAuthc,
        });

        ruleId = createdRule.id;
        await alertingApi.waitForAlertInIndex({ ruleId, indexName: APM_ALERTS_INDEX });
      });

      after(async () => {
        await alertingApi.cleanUpAlerts({
          roleAuthc,
          ruleId,
          alertIndexName: APM_ALERTS_INDEX,
          connectorIndexName: APM_ACTION_VARIABLE_INDEX,
          consumer: 'apm',
        });
        await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      });

      it('returns the correct number of alerts', async () => {
        const response = await getServiceGroupCounts(apmApiClient);
        expect(response.status).to.be(200);
        expect(Object.keys(response.body).length).to.be(2);
        expect(response.body[synthbeansServiceGroupId]).to.have.property('alerts', 1);
        expect(response.body[opbeansServiceGroupId]).to.have.property('alerts', 0);
      });
    });
  });
}
