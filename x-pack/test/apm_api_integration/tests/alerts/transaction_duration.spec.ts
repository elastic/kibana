/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationType, ApmRuleType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createApmRule,
  fetchServiceInventoryAlertCounts,
  fetchServiceTabAlertCount,
  deleteAlertsByRuleId,
  deleteRuleById,
  clearKibanaApmEventLog,
  ApmAlertFields,
} from './helpers/alerting_api_helper';
import { waitForAlertsForRule } from './helpers/wait_for_alerts_for_rule';
import { waitForRuleStatus } from './helpers/wait_for_rule_status';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertest = getService('supertest');
  const es = getService('es');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const ruleParams = {
    threshold: 3000,
    windowSize: 5,
    windowUnit: 'm',
    transactionType: 'request',
    serviceName: 'opbeans-java',
    environment: 'production',
    aggregationType: AggregationType.Avg,
    groupBy: ['service.name', 'service.environment', 'transaction.type', 'transaction.name'],
  };

  registry.when('transaction duration alert', { config: 'basic', archives: [] }, () => {
    before(async () => {
      const opbeansJava = apm
        .service({ name: 'opbeans-java', environment: 'production', agentName: 'java' })
        .instance('instance');
      const opbeansNode = apm
        .service({ name: 'opbeans-node', environment: 'production', agentName: 'node' })
        .instance('instance');
      const events = timerange('now-15m', 'now')
        .ratePerMinute(1)
        .generator((timestamp) => {
          return [
            opbeansJava
              .transaction({ transactionName: 'tx-java' })
              .timestamp(timestamp)
              .duration(5000)
              .success(),
            opbeansNode
              .transaction({ transactionName: 'tx-node' })
              .timestamp(timestamp)
              .duration(4000)
              .success(),
          ];
        });
      await synthtraceEsClient.index(events);
    });

    after(async () => {
      await synthtraceEsClient.clean();
      await clearKibanaApmEventLog(es);
    });

    describe('create rule for opbeans-java without kql filter', () => {
      let ruleId: string;
      let alerts: ApmAlertFields[];

      before(async () => {
        const createdRule = await createApmRule({
          supertest,
          ruleTypeId: ApmRuleType.TransactionDuration,
          name: 'Apm transaction duration without kql filter',
          params: {
            kqlFilter: '',
            ...ruleParams,
          },
          actions: [],
        });
        ruleId = createdRule.id;
        alerts = await waitForAlertsForRule({ es, ruleId });
      });

      after(async () => {
        await deleteAlertsByRuleId({ es, ruleId });
        await deleteRuleById({ supertest, ruleId });
      });

      it('checks if rule is active', async () => {
        const ruleStatus = await waitForRuleStatus({
          ruleId,
          expectedStatus: 'active',
          supertest,
        });
        expect(ruleStatus).to.be('active');
      });

      it('produces an alert for opbeans-java with the correct reason', async () => {
        expect(alerts[0]['kibana.alert.reason']).to.be(
          'Avg. latency is 5.0 s in the last 5 mins for service: opbeans-java, env: production, type: request, name: tx-java. Alert when > 3.0 s.'
        );
      });

      it('indexes alert document with all group-by fields', async () => {
        expect(alerts[0]).property('service.name', 'opbeans-java');
        expect(alerts[0]).property('service.environment', 'production');
        expect(alerts[0]).property('transaction.type', 'request');
        expect(alerts[0]).property('transaction.name', 'tx-java');
      });

      it('shows the correct alert count for each service on service inventory', async () => {
        const serviceInventoryAlertCounts = await fetchServiceInventoryAlertCounts(apmApiClient);
        expect(serviceInventoryAlertCounts).to.eql({
          'opbeans-node': 0,
          'opbeans-java': 1,
        });
      });

      it('shows the correct alert count in opbeans-java service', async () => {
        const serviceTabAlertCount = await fetchServiceTabAlertCount({
          apmApiClient,
          serviceName: 'opbeans-java',
        });
        expect(serviceTabAlertCount).to.be(1);
      });

      it('shows the correct alert count in opbeans-node service', async () => {
        const serviceTabAlertCount = await fetchServiceTabAlertCount({
          apmApiClient,
          serviceName: 'opbeans-node',
        });
        expect(serviceTabAlertCount).to.be(0);
      });
    });

    describe('create rule for opbeans-node using kql filter', () => {
      let ruleId: string;
      let alerts: ApmAlertFields[];

      before(async () => {
        const createdRule = await createApmRule({
          supertest,
          ruleTypeId: ApmRuleType.TransactionDuration,
          name: 'Apm transaction duration with kql filter',
          params: {
            kqlFilter:
              'service.name: opbeans-node and transaction.type: request and service.environment: production',
            ...ruleParams,
          },
          actions: [],
        });
        ruleId = createdRule.id;
        alerts = await waitForAlertsForRule({ es, ruleId });
      });

      after(async () => {
        await deleteAlertsByRuleId({ es, ruleId });
        await deleteRuleById({ supertest, ruleId });
      });

      it('checks if rule is active', async () => {
        const ruleStatus = await waitForRuleStatus({
          ruleId,
          expectedStatus: 'active',
          supertest,
        });
        expect(ruleStatus).to.be('active');
      });

      it('produces an alert for opbeans-node with the correct reason', async () => {
        expect(alerts[0]['kibana.alert.reason']).to.be(
          'Avg. latency is 4.0 s in the last 5 mins for service: opbeans-node, env: production, type: request, name: tx-node. Alert when > 3.0 s.'
        );
      });

      it('indexes alert document with all group-by fields', async () => {
        expect(alerts[0]).property('service.name', 'opbeans-node');
        expect(alerts[0]).property('service.environment', 'production');
        expect(alerts[0]).property('transaction.type', 'request');
        expect(alerts[0]).property('transaction.name', 'tx-node');
      });

      it('shows alert count=1 for opbeans-node on service inventory', async () => {
        const serviceInventoryAlertCounts = await fetchServiceInventoryAlertCounts(apmApiClient);
        expect(serviceInventoryAlertCounts).to.eql({
          'opbeans-node': 1,
          'opbeans-java': 0,
        });
      });

      it('shows alert count=0 in opbeans-java service', async () => {
        const serviceTabAlertCount = await fetchServiceTabAlertCount({
          apmApiClient,
          serviceName: 'opbeans-java',
        });
        expect(serviceTabAlertCount).to.be(0);
      });

      it('shows alert count=1 in opbeans-node service', async () => {
        const serviceTabAlertCount = await fetchServiceTabAlertCount({
          apmApiClient,
          serviceName: 'opbeans-node',
        });
        expect(serviceTabAlertCount).to.be(1);
      });
    });
  });
}
