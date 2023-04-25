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
  createIndexConnector,
  fetchServiceInventoryAlertCounts,
  fetchServiceTabAlertCount,
} from './alerting_api_helper';
import { generateData } from './generate_data';
import { waitForRuleStatus, waitForDocumentInIndex } from './wait_for_rule_status';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const INDEX_PATTERN = 'duration_threshold';

  const supertest = getService('supertest');
  const es = getService('es');
  const apmApiClient = getService('apmApiClient');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  const synthtraceEsClient = getService('synthtraceEsClient');

  registry.when('duration threshold threshold alert', { config: 'basic', archives: [] }, () => {
    let ruleId: string;
    let actionId: string | undefined;

    before(async () => {
      await generateData({ synthtraceEsClient });
    });

    after(async () => {
      await synthtraceEsClient.clean();
      await supertest.delete(`/api/alerting/rule/${ruleId}`).set('kbn-xsrf', 'foo');
      await supertest.delete(`/api/actions/connector/${actionId}`).set('kbn-xsrf', 'foo');
      await esDeleteAllIndices(`${INDEX_PATTERN}*`);
      await es.deleteByQuery({ index: '.alerts*', query: { match_all: {} } });
      await es.deleteByQuery({
        index: '.kibana-event-log-*',
        query: { term: { 'kibana.alert.rule.consumer': 'apm' } },
      });
    });

    describe('Create alert with empty params', () => {
      const INDEX_NAME = `${INDEX_PATTERN}_empty_params`;

      before(async () => {
        actionId = await createIndexConnector({
          supertest,
          name: 'Duration threshold API test - empty params',
          indexName: INDEX_NAME,
        });

        const createdRule = await createApmRule({
          supertest,
          ruleTypeId: ApmRuleType.TransactionDuration,
          name: 'Apm duration threshold - with empty params',
          params: {
            environment: 'production',
            serviceName: '',
            aggregationType: AggregationType.Avg,
            transactionName: '',
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
          `Apm duration threshold - with empty params alert is firing because of the following conditions:

- Service name: opbeans-node
- Transaction type: request
- Transaction name: 
- Environment: production
- Latency threshold: 90ms
- Latency observed: 150 ms over the last 1 hr`
        );
      });

      it('shows the correct alert count for each service on service inventory', async () => {
        const serviceInventoryAlertCounts = await fetchServiceInventoryAlertCounts(apmApiClient);
        expect(serviceInventoryAlertCounts).to.eql({
          'opbeans-node': 1,
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
        expect(serviceTabAlertCount).to.be(1);
      });
    });

    describe('Create alert with transaction name filter', () => {
      const INDEX_NAME = `${INDEX_PATTERN}_transaction_name_filter`;

      before(async () => {
        actionId = await createIndexConnector({
          supertest,
          name: 'Duration threshold API test',
          indexName: INDEX_NAME,
        });

        const createdRule = await createApmRule({
          supertest,
          ruleTypeId: ApmRuleType.TransactionDuration,
          name: 'Apm duration threshold - with transaction name filter',
          params: {
            environment: 'production',
            serviceName: '',
            aggregationType: AggregationType.Avg,
            transactionName: 'tx-node-2',
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
          `Apm duration threshold - with transaction name filter alert is firing because of the following conditions:

- Service name: opbeans-node
- Transaction type: request
- Transaction name: tx-node-2
- Environment: production
- Latency threshold: 90ms
- Latency observed: 200 ms over the last 1 hr`
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
