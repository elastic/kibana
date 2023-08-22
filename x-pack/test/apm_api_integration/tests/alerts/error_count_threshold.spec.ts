/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { ApmRuleType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import { errorCountMessage } from '@kbn/apm-plugin/common/rules/default_action_message';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { getErrorGroupingKey } from '@kbn/apm-synthtrace-client/src/lib/apm/instance';
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

  registry.when('error count threshold alert', { config: 'basic', archives: [] }, () => {
    let ruleId1: string;
    let ruleId2: string;
    let alertId: string;
    let startedAt: string;
    let actionId1: string | undefined;
    let actionId2: string | undefined;

    const APM_ALERTS_INDEX = '.alerts-observability.apm.alerts-default';
    const ALERT_ACTION_INDEX_NAME1 = 'alert-action-error-count1';
    const ALERT_ACTION_INDEX_NAME2 = 'alert-action-error-count2';

    const errorMessage = '[ResponseError] index_not_found_exception';
    const errorGroupingKey = getErrorGroupingKey(errorMessage);

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
              .duration(100)
              .failure()
              .errors(opbeansJava.error({ message: errorMessage }).timestamp(timestamp + 50)),
            opbeansNode
              .transaction({ transactionName: 'tx-node' })
              .timestamp(timestamp)
              .duration(100)
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

    describe('create alert without filter query', () => {
      before(async () => {
        actionId1 = await createIndexConnector({
          supertest,
          name: 'Error count without filter query',
          indexName: ALERT_ACTION_INDEX_NAME1,
        });
        const createdRule = await createApmRule({
          supertest,
          ruleTypeId: ApmRuleType.ErrorCount,
          name: 'Apm error count without filter query',
          params: {
            environment: 'production',
            threshold: 1,
            windowSize: 1,
            windowUnit: 'h',
            kqlFilter: '',
            groupBy: [
              'service.name',
              'service.environment',
              'transaction.name',
              'error.grouping_key',
              'error.grouping_name',
            ],
          },
          actions: [
            {
              group: 'threshold_met',
              id: actionId1,
              params: {
                documents: [
                  {
                    message: `${errorCountMessage}
- Transaction name: {{context.transactionName}}
- Error grouping key: {{context.errorGroupingKey}}
- Error grouping name: {{context.errorGroupingName}}`,
                  },
                ],
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

      it('indexes alert document with all group-by fields', async () => {
        const resp = await waitForAlertInIndex({
          es,
          indexName: APM_ALERTS_INDEX,
          ruleId: ruleId1,
        });
        alertId = (resp.hits.hits[0]._source as any)['kibana.alert.uuid'];
        startedAt = (resp.hits.hits[0]._source as any)['kibana.alert.start'];

        expect(resp.hits.hits[0]._source).property('service.name', 'opbeans-java');
        expect(resp.hits.hits[0]._source).property('service.environment', 'production');
        expect(resp.hits.hits[0]._source).property('transaction.name', 'tx-java');
        expect(resp.hits.hits[0]._source).property('error.grouping_key', errorGroupingKey);
        expect(resp.hits.hits[0]._source).property('error.grouping_name', errorMessage);
      });

      it('returns correct message', async () => {
        const rangeFrom = moment(startedAt).subtract('5', 'minute').toISOString();
        const resp = await waitForDocumentInIndex<{ message: string }>({
          es,
          indexName: ALERT_ACTION_INDEX_NAME1,
        });

        expect(resp.hits.hits[0]._source?.message).eql(
          `Error count is 15 in the last 1 hr for service: opbeans-java, env: production, name: tx-java, error key: ${errorGroupingKey}, error name: ${errorMessage}. Alert when > 1.

Apm error count without filter query is active with the following conditions:

- Service name: opbeans-java
- Environment: production
- Error count: 15 errors over the last 1 hr
- Threshold: 1

[View alert details](http://mockedpublicbaseurl/app/observability/alerts?_a=(kuery:%27kibana.alert.uuid:%20%22${alertId}%22%27%2CrangeFrom:%27${rangeFrom}%27%2CrangeTo:now%2Cstatus:all))

- Transaction name: tx-java
- Error grouping key: ${errorGroupingKey}
- Error grouping name: ${errorMessage}`
        );
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

    describe('create alert with filter query', () => {
      before(async () => {
        actionId2 = await createIndexConnector({
          supertest,
          name: 'Error count with filter query',
          indexName: ALERT_ACTION_INDEX_NAME2,
        });
        const createdRule = await createApmRule({
          supertest,
          ruleTypeId: ApmRuleType.ErrorCount,
          name: 'Apm error count with filter query',
          params: {
            environment: 'ENVIRONMENT_ALL',
            threshold: 1,
            windowSize: 1,
            windowUnit: 'h',
            serviceName: undefined,
            kqlFilter: 'service.name: opbeans-java and service.environment: production',
            groupBy: [
              'service.name',
              'service.environment',
              'transaction.name',
              'error.grouping_key',
              'error.grouping_name',
            ],
          },
          actions: [
            {
              group: 'threshold_met',
              id: actionId2,
              params: {
                documents: [
                  {
                    message: `${errorCountMessage}
- Transaction name: {{context.transactionName}}
- Error grouping key: {{context.errorGroupingKey}}
- Error grouping name: {{context.errorGroupingName}}`,
                  },
                ],
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

      it('indexes alert document with all group-by fields', async () => {
        const resp = await waitForAlertInIndex({
          es,
          indexName: APM_ALERTS_INDEX,
          ruleId: ruleId2,
        });
        alertId = (resp.hits.hits[0]._source as any)['kibana.alert.uuid'];
        startedAt = (resp.hits.hits[0]._source as any)['kibana.alert.start'];

        expect(resp.hits.hits[0]._source).property('service.name', 'opbeans-java');
        expect(resp.hits.hits[0]._source).property('service.environment', 'production');
        expect(resp.hits.hits[0]._source).property('transaction.name', 'tx-java');
        expect(resp.hits.hits[0]._source).property('error.grouping_key', errorGroupingKey);
        expect(resp.hits.hits[0]._source).property('error.grouping_name', errorMessage);
      });

      it('returns correct message', async () => {
        const rangeFrom = moment(startedAt).subtract('5', 'minute').toISOString();
        const resp = await waitForDocumentInIndex<{ message: string }>({
          es,
          indexName: ALERT_ACTION_INDEX_NAME2,
        });

        expect(resp.hits.hits[0]._source?.message).eql(
          `Error count is 15 in the last 1 hr for service: opbeans-java, env: production, name: tx-java, error key: ${errorGroupingKey}, error name: ${errorMessage}. Alert when > 1.

Apm error count with filter query is active with the following conditions:

- Service name: opbeans-java
- Environment: production
- Error count: 15 errors over the last 1 hr
- Threshold: 1

[View alert details](http://mockedpublicbaseurl/app/observability/alerts?_a=(kuery:%27kibana.alert.uuid:%20%22${alertId}%22%27%2CrangeFrom:%27${rangeFrom}%27%2CrangeTo:now%2Cstatus:all))

- Transaction name: tx-java
- Error grouping key: ${errorGroupingKey}
- Error grouping name: ${errorMessage}`
        );
      });

      it('shows the correct alert count for each service on service inventory', async () => {
        const serviceInventoryAlertCounts = await fetchServiceInventoryAlertCounts(apmApiClient);
        expect(serviceInventoryAlertCounts).to.eql({
          'opbeans-node': 0,
          'opbeans-java': 2,
        });
      });

      it('shows the correct alert count in opbeans-java service', async () => {
        const serviceTabAlertCount = await fetchServiceTabAlertCount({
          apmApiClient,
          serviceName: 'opbeans-java',
        });
        expect(serviceTabAlertCount).to.be(2);
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
