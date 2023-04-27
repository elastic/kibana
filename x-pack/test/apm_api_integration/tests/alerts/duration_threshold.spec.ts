/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationType, ApmRuleType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import { transactionDurationMessage } from '@kbn/apm-plugin/common/rules/default_action_message';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createApmRule,
  updateApmRule,
  createIndexConnector,
  fetchServiceInventoryAlertCounts,
  fetchServiceTabAlertCount,
} from './alerting_api_helper';
import { generateData } from './generate_data';
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

  registry.when.skip('transaction duration alert', { config: 'basic', archives: [] }, () => {
    let ruleId: string;
    let actionId: string | undefined;

    const APM_ALERTS_INDEX = '.alerts-observability.apm.alerts-default';
    const ALERT_ACTION_PATTERN = 'alert-action-';

    before(async () => {
      await generateData({ synthtraceEsClient });
    });

    after(async () => {
      await synthtraceEsClient.clean();
      await supertest.delete(`/api/alerting/rule/${ruleId}`).set('kbn-xsrf', 'foo');
      await supertest.delete(`/api/actions/connector/${actionId}`).set('kbn-xsrf', 'foo');
      await esDeleteAllIndices([ALERT_ACTION_PATTERN]);

      // TODO add them as helpers
      await es.deleteByQuery({
        index: APM_ALERTS_INDEX,
        query: { term: { 'kibana.alert.rule.uuid': ruleId } },
      });

      // can we clean them all? delete only the data we created,
      // think about wrapping the delete in one function
      await es.deleteByQuery({
        index: '.kibana-event-log-*',
        query: { term: { 'kibana.alert.rule.consumer': 'apm' } },
      });
    });

    describe('create alert with transaction.name group by', () => {
      const ALERT_ACTION_INDEX_NAME = `${ALERT_ACTION_PATTERN}-transaction-group-by`;

      before(async () => {
        actionId = await createIndexConnector({
          supertest,
          name: 'Transation duration API test',
          indexName: ALERT_ACTION_INDEX_NAME,
        });
        const createdRule = await createApmRule({
          supertest,
          ruleTypeId: ApmRuleType.TransactionDuration,
          name: 'Apm transaction duration group by transaction name',
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
                documents: [{ message: transactionDurationMessage, id: actionId }],
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
        ruleId = createdRule.id;
      });

      it('checks if rule is active', async () => {
        const executionStatus = await waitForRuleStatus({
          id: ruleId,
          expectedStatus: 'active',
          supertest,
        });
        expect(executionStatus.status).to.be('active');
      });

      it('returns correct message', async () => {
        const resp = await waitForDocumentInIndex<{ message: string }>({
          es,
          indexName: ALERT_ACTION_INDEX_NAME,
        });

        expect(resp.hits.hits[0]._source?.message).eql(`Transaction Name: tx-java`);
      });

      it('indexes alert document with all group-by fields', async () => {
        const resp = await waitForAlertInIndex({
          es,
          indexName: APM_ALERTS_INDEX,
          ruleId,
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

    describe('Update an existing rule to add transaction name filter', () => {
      const INDEX_NAME = `${INDEX_PATTERN}_update_rule`;

      before(async () => {
        actionId = await createIndexConnector({
          supertest,
          name: 'Duration threshold API test',
          indexName: INDEX_NAME,
        });

        const createdRule = await createApmRule({
          supertest,
          ruleTypeId: ApmRuleType.TransactionDuration,
          name: 'Apm duration threshold - update rule',
          params: {
            environment: 'production',
            serviceName: '',
            aggregationType: AggregationType.Avg,
            threshold: 90,
            windowSize: 1,
            windowUnit: 'h',
          },
          actions: [
            {
              group: 'threshold_met',
              id: actionId,
              params: {
                documents: [{ message: transactionDurationMessage }],
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
        ruleId = createdRule.id;
      });

      it('checks if alert is active', async () => {
        const executionStatus = await waitForRuleStatus({
          id: ruleId,
          expectedStatus: 'active',
          supertest,
        });

        expect(executionStatus.status).to.be('active');
      });

      it('returns correct message', async () => {
        const resp = await waitForDocumentInIndex<{ message: string }>({
          es,
          indexName: INDEX_NAME,
        });

        expect(resp.hits.hits[0]._source?.message).eql(
          `Apm duration threshold - update rule alert is firing because of the following condition:

- Service name: opbeans-node
- Transaction type: request
- Transaction name:
- Environment: production
- Latency threshold: 90ms
- Latency observed: 200 ms over the last 1 hr`
        );
      });

      it('returns correct message', async () => {
        const resp = await waitForDocumentInIndex<{ message: string }>({
          es,
          indexName: INDEX_NAME,
        });

        expect(resp.hits.hits[0]._source?.message).eql(
          `Apm duration threshold - update rule filter alert is firing because of the following conditions:

- Service name: opbeans-node
- Transaction type: request
- Transaction name:
- Environment: production
- Latency threshold: 90ms
- Latency observed: 150 ms over the last 1 hr`
        );
      });

      it('updates the rule', async () => {
        const updatedRule = await updateApmRule({
          supertest,
          ruleId,
          ruleTypeId: ApmRuleType.TransactionDuration,
          name: 'Apm duration threshold - update rule',
          params: {
            environment: 'production',
            serviceName: '',
            transactionName: 'tx-node-2',
            aggregationType: AggregationType.Avg,
            threshold: 90,
            windowSize: 1,
            windowUnit: 'h',
          },
          actions: [
            {
              group: 'threshold_met',
              id: actionId,
              params: {
                documents: [{ message: transactionDurationMessage }],
              },
              frequency: {
                notify_when: 'onActionGroupChange',
                throttle: null,
                summary: false,
              },
            },
          ],
        });

        console.log('====updatedRule', updatedRule);
        expect(updatedRule.id).to.not.eql(undefined);
      });

      it('checks if updated alert is active', async () => {
        const executionStatus = await waitForRuleStatus({
          id: ruleId,
          expectedStatus: 'active',
          supertest,
        });

        expect(executionStatus.status).to.be('active');
      });

      it('returns correct message for the updated rule ', async () => {
        const resp = await waitForDocumentInIndex<{ message: string }>({
          es,
          indexName: INDEX_NAME,
        });

        expect(resp.hits.hits[0]._source?.message).eql(
          `Apm duration threshold - update rule filter alert is firing because of the following conditions:

- Service name: opbeans-node
- Transaction type: request
- Transaction name: tx-node-2
- Environment: production
- Latency threshold: 90ms
- Latency observed: 150 ms over the last 1 hr`
        );
      });

      it('shows the correct alert count for each service on service inventory', async () => {
        const serviceInventoryAlertCounts = await fetchServiceInventoryAlertCounts(apmApiClient);
        expect(serviceInventoryAlertCounts).to.eql({
          'opbeans-node': 2,
          'opbeans-java': 0,
        });
      });

      it('shows the correct alert count in opbeans-node service', async () => {
        const serviceTabAlertCount = await fetchServiceTabAlertCount({
          apmApiClient,
          serviceName: 'opbeans-java',
        });
        expect(serviceTabAlertCount).to.be(0);
      });

      it('shows the correct alert count in opbeans-node service', async () => {
        const serviceTabAlertCount = await fetchServiceTabAlertCount({
          apmApiClient,
          serviceName: 'opbeans-node',
        });
        expect(serviceTabAlertCount).to.be(2);
      });
    });
  });
}
