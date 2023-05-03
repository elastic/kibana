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
import { fetchServiceInventoryAlertCounts, fetchServiceTabAlertCount } from './alerting_api_helper';
import { AlertTestHelper } from './helpers/alert_test_helper';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');

  const supertest = getService('supertest');
  const esClient = getService('es');
  const apmApiClient = getService('apmApiClient');

  const alertTestHelper = new AlertTestHelper({ esClient, supertest });

  const synthtraceEsClient = getService('synthtraceEsClient');

  registry.when('transaction duration alert', { config: 'basic', archives: [] }, () => {
    let ruleId: string;
    let actionId: string | undefined;

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
      await supertest.delete(`/api/alerting/rule/${ruleId}`).set('kbn-xsrf', 'foo');
      await supertest.delete(`/api/actions/connector/${actionId}`).set('kbn-xsrf', 'foo');
      await alertTestHelper.cleanAll();
    });

    describe('create alert with transaction.name group by', () => {
      it('checks if rule is active', async () => {
        actionId = await alertTestHelper.createIndexConnector({
          name: 'Transation duration API test',
        });

        const createdRule = await alertTestHelper.createApmRule({
          ruleTypeId: ApmRuleType.TransactionDuration,
          name: 'Apm transaction duration',
          params: {
            threshold: 3000,
            windowSize: 5,
            windowUnit: 'm',
            transactionType: 'request',
            serviceName: 'opbeans-java',
            environment: 'production',
            aggregationType: AggregationType.Avg,
            groupBy: [
              'service.name',
              'service.environment',
              'transaction.type',
              'transaction.name',
            ],
          },
          actions: [
            {
              group: 'threshold_met',
              id: actionId,
              params: {
                documents: [
                  { message: 'Transaction Name: {{context.transactionName}}', id: actionId },
                ],
              },
              frequency: {
                notify_when: 'onActionGroupChange',
                summary: false,
              },
            },
          ],
        });

        expect(createdRule.id).to.not.eql(undefined);

        ruleId = createdRule.id;

        const executionStatus = await alertTestHelper.waitForRuleStatus({
          id: ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus.status).to.be('active');
      });

      it('returns correct message', async () => {
        const message = await alertTestHelper.waitForConnectorActionMessage({
          messageId: actionId,
        });
        expect(message).eql(`Transaction Name: tx-java`);
      });

      it('indexes alert document with all group-by fields', async () => {
        const resp = await alertTestHelper.waitForActiveAlert({ ruleId });

        expect(resp._source).property('service.name', 'opbeans-java');
        expect(resp._source).property('service.environment', 'production');
        expect(resp._source).property('transaction.type', 'request');
        expect(resp._source).property('transaction.name', 'tx-java');
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
  });
}
