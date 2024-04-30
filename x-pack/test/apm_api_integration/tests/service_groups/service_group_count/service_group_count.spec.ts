/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AggregationType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import { ApmRuleType } from '@kbn/rule-data-utils';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { createApmRule } from '../../alerts/helpers/alerting_api_helper';
import { cleanupRuleAndAlertState } from '../../alerts/helpers/cleanup_rule_and_alert_state';
import { waitForActiveApmAlert } from '../../alerts/helpers/wait_for_active_apm_alerts';
import {
  createServiceGroupApi,
  deleteAllServiceGroups,
  getServiceGroupCounts,
} from '../service_groups_api_methods';
import { generateData } from './generate_data';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const supertest = getService('supertest');
  const synthtraceEsClient = getService('synthtraceEsClient');
  const es = getService('es');
  const log = getService('log');
  const start = Date.now() - 24 * 60 * 60 * 1000;
  const end = Date.now();

  function createRule() {
    return createApmRule({
      supertest,
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
    });
  }

  // FLAKY: https://github.com/elastic/kibana/issues/177655
  registry.when('Service group counts', { config: 'basic', archives: [] }, () => {
    let synthbeansServiceGroupId: string;
    let opbeansServiceGroupId: string;
    before(async () => {
      const [, { body: synthbeansServiceGroup }, { body: opbeansServiceGroup }] = await Promise.all(
        [
          generateData({ start, end, synthtraceEsClient }),
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
      await synthtraceEsClient.clean();
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
        const createdRule = await createRule();
        ruleId = createdRule.id;
        await waitForActiveApmAlert({ ruleId, esClient: es, log });
      });

      after(async () => {
        await cleanupRuleAndAlertState({ es, supertest, logger: log });
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
