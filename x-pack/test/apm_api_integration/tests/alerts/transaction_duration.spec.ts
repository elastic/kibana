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
  createIndexConnector,
  fetchServiceInventoryAlertCounts,
  fetchServiceTabAlertCount,
} from './alerting_api_helper';
import {
  waitForRuleStatus,
  waitForDocumentInIndex,
  waitForAlertInIndex,
} from './wait_for_rule_status';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');

  const supertest = getService('supertest');
  const es = getService('es');
  const apmApiClient = getService('apmApiClient');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  const synthtraceEsClient = getService('synthtraceEsClient');

  registry.when('transaction duration alert', { config: 'basic', archives: [] }, () => {
    let ruleId1: string;
    let actionId1: string | undefined;
    let ruleId2: string;
    let actionId2: string | undefined;
    const APM_ALERTS_INDEX = '.alerts-observability.apm.alerts-default';
    const ALERT_ACTION_INDEX_NAME1 = 'alert-action-transaction-duration1';
    const ALERT_ACTION_INDEX_NAME2 = 'alert-action-transaction-duration2';

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
      await supertest.delete(`/api/alerting/rule/${ruleId1}`).set('kbn-xsrf', 'foo');
      await supertest.delete(`/api/actions/connector/${actionId1}`).set('kbn-xsrf', 'foo');
      await supertest.delete(`/api/alerting/rule/${ruleId2}`).set('kbn-xsrf', 'foo');
      await supertest.delete(`/api/actions/connector/${actionId2}`).set('kbn-xsrf', 'foo');
      await esDeleteAllIndices([ALERT_ACTION_INDEX_NAME1, ALERT_ACTION_INDEX_NAME2]);
      await es.deleteByQuery({
        index: APM_ALERTS_INDEX,
        query: { term: { 'kibana.alert.rule.uuid': ruleId1 } },
      });
      await es.deleteByQuery({
        index: APM_ALERTS_INDEX,
        query: { term: { 'kibana.alert.rule.uuid': ruleId2 } },
      });
      await es.deleteByQuery({
        index: '.kibana-event-log-*',
        query: { term: { 'kibana.alert.rule.consumer': 'apm' } },
      });
    });

    describe('create rule without filter query', () => {
      before(async () => {
        actionId1 = await createIndexConnector({
          supertest,
          name: 'Transation duration without filter query',
          indexName: ALERT_ACTION_INDEX_NAME1,
        });
        const createdRule = await createApmRule({
          supertest,
          ruleTypeId: ApmRuleType.TransactionDuration,
          name: 'Apm transaction duration without filter query',
          params: {
            threshold: 3000,
            windowSize: 5,
            windowUnit: 'm',
            transactionType: 'request',
            serviceName: 'opbeans-java',
            environment: 'production',
            aggregationType: AggregationType.Avg,
            kqlFilter: '',
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
              id: actionId1,
              params: {
                documents: [{ message: 'Transaction Name: {{context.transactionName}}' }],
              },
              frequency: {
                notify_when: 'onActionGroupChange',
                throttle: null,
                summary: false,
              },
            },
          ],
        });
        expect(createdRule.id).to.not.eql(undefined);
        ruleId1 = createdRule.id;
      });

      it('checks if rule is active', async () => {
        const executionStatus = await waitForRuleStatus({
          id: ruleId1,
          expectedStatus: 'active',
          supertest,
        });
        expect(executionStatus.status).to.be('active');
      });

      it('returns correct message', async () => {
        const resp = await waitForDocumentInIndex<{ message: string }>({
          es,
          indexName: ALERT_ACTION_INDEX_NAME1,
        });

        expect(resp.hits.hits[0]._source?.message).eql(`Transaction Name: tx-java`);
      });

      it('indexes alert document with all group-by fields', async () => {
        const resp = await waitForAlertInIndex({
          es,
          indexName: APM_ALERTS_INDEX,
          ruleId: ruleId1,
        });

        expect(resp.hits.hits[0]._source).property('service.name', 'opbeans-java');
        expect(resp.hits.hits[0]._source).property('service.environment', 'production');
        expect(resp.hits.hits[0]._source).property('transaction.type', 'request');
        expect(resp.hits.hits[0]._source).property('transaction.name', 'tx-java');
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

    describe('create rule with filter query', () => {
      before(async () => {
        actionId2 = await createIndexConnector({
          supertest,
          name: 'Transation duration with filter query',
          indexName: ALERT_ACTION_INDEX_NAME2,
        });
        const createdRule = await createApmRule({
          supertest,
          ruleTypeId: ApmRuleType.TransactionDuration,
          name: 'Apm transaction duration with filter query',
          params: {
            threshold: 3000,
            windowSize: 5,
            windowUnit: 'm',
            transactionType: undefined,
            serviceName: undefined,
            environment: 'ENVIRONMENT_ALL',
            aggregationType: AggregationType.Avg,
            kqlFilter:
              'service.name: opbeans-node and transaction.type: request and service.environment: production',
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
              id: actionId2,
              params: {
                documents: [{ message: 'Transaction Name: {{context.transactionName}}' }],
              },
              frequency: {
                notify_when: 'onActionGroupChange',
                throttle: null,
                summary: false,
              },
            },
          ],
        });
        expect(createdRule.id).to.not.eql(undefined);
        ruleId2 = createdRule.id;
      });

      it('checks if rule is active', async () => {
        const executionStatus = await waitForRuleStatus({
          id: ruleId2,
          expectedStatus: 'active',
          supertest,
        });
        expect(executionStatus.status).to.be('active');
      });

      it('returns correct message', async () => {
        const resp = await waitForDocumentInIndex<{ message: string }>({
          es,
          indexName: ALERT_ACTION_INDEX_NAME2,
        });

        expect(resp.hits.hits[0]._source?.message).eql(`Transaction Name: tx-node`);
      });

      it('indexes alert document with all group-by fields', async () => {
        const resp = await waitForAlertInIndex({
          es,
          indexName: APM_ALERTS_INDEX,
          ruleId: ruleId2,
        });

        expect(resp.hits.hits[0]._source).property('service.name', 'opbeans-node');
        expect(resp.hits.hits[0]._source).property('service.environment', 'production');
        expect(resp.hits.hits[0]._source).property('transaction.type', 'request');
        expect(resp.hits.hits[0]._source).property('transaction.name', 'tx-node');
      });

      it('shows the correct alert count for each service on service inventory', async () => {
        const serviceInventoryAlertCounts = await fetchServiceInventoryAlertCounts(apmApiClient);
        expect(serviceInventoryAlertCounts).to.eql({
          'opbeans-node': 1,
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
        expect(serviceTabAlertCount).to.be(1);
      });
    });
  });
}
