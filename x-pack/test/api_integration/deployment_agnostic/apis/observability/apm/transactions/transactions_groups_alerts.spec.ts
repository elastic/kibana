/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { LatencyAggregationType } from '@kbn/apm-plugin/common/latency_aggregation_types';
import { ApmDocumentType, ApmTransactionDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { AggregationType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import { ApmRuleType } from '@kbn/rule-data-utils';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { APM_ACTION_VARIABLE_INDEX, APM_ALERTS_INDEX } from '../alerts/helpers/alerting_helper';

type TransactionsGroupsMainStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics'>;

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');
  const alertingApi = getService('alertingApi');
  const samlAuth = getService('samlAuth');

  const serviceName = 'synth-go';
  const dayInMs = 24 * 60 * 60 * 1000;
  const start = Date.now() - dayInMs;
  const end = Date.now() + dayInMs;

  type Alerts = Awaited<ReturnType<typeof alertingApi.waitForAlertInIndex>>;

  async function getTransactionGroups(overrides?: {
    path?: {
      serviceName?: string;
    };
    query?: {
      start?: string;
      end?: string;
      transactionType?: string;
      environment?: string;
      kuery?: string;
      latencyAggregationType?: LatencyAggregationType;
      documentType?: ApmTransactionDocumentType;
      rollupInterval?: RollupInterval;
      useDurationSummary?: boolean;
    };
  }) {
    const response = await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics',
      params: {
        path: { serviceName },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          latencyAggregationType: LatencyAggregationType.avg,
          transactionType: 'request',
          environment: 'ENVIRONMENT_ALL',
          useDurationSummary: false,
          kuery: '',
          documentType: ApmDocumentType.TransactionMetric,
          rollupInterval: RollupInterval.SixtyMinutes,
          ...overrides?.query,
        },
      },
    });
    expect(response.status).to.be(200);

    return response.body as TransactionsGroupsMainStatistics;
  }

  describe('Transaction groups alerts', function () {
    describe('when data is loaded', () => {
      const transactions = [
        {
          name: 'GET /api/task/avg',
          duration: 100,
          type: 'task',
        },
        {
          name: 'GET /api/request/avg',
          duration: 100,
          type: 'request',
        },
        {
          name: 'GET /api/request/p99',
          duration: 100,
          type: 'request',
        },
        {
          name: 'GET /api/request/p95',
          duration: 100,
          type: 'request',
        },
        {
          name: 'GET /api/failed/request',
          duration: 100,
          type: 'request',
        },
      ];
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;
      let roleAuthc: RoleCredentials;

      before(async () => {
        roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        const serviceGoProdInstance = apm
          .service({ name: serviceName, environment: 'production', agentName: 'go' })
          .instance('instance-a');

        await apmSynthtraceEsClient.index([
          timerange(start, end)
            .interval('1m')
            .rate(1)
            .generator((timestamp) => {
              return transactions.map(({ name, duration, type }) => {
                return serviceGoProdInstance
                  .transaction({ transactionName: name, transactionType: type })
                  .timestamp(timestamp)
                  .duration(duration)
                  .success();
              });
            }),
          timerange(start, end)
            .interval('1m')
            .rate(1)
            .generator((timestamp) => {
              return transactions.map(({ name, duration, type }) => {
                return serviceGoProdInstance
                  .transaction({ transactionName: name, transactionType: type })
                  .timestamp(timestamp)
                  .duration(duration)
                  .failure();
              });
            }),
        ]);
      });

      after(async () => {
        await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
        await apmSynthtraceEsClient.clean();
      });

      describe('with avg transaction duration alerts', () => {
        let ruleId: string;
        let alerts: Alerts;

        before(async () => {
          const createdRule = await alertingApi.createRule({
            name: `Latency threshold | ${serviceName}`,
            params: {
              serviceName,
              transactionType: 'request',
              transactionName: 'GET /api/request/avg',
              windowSize: 5,
              windowUnit: 'h',
              threshold: 99,
              aggregationType: AggregationType.Avg,
              environment: 'production',
              groupBy: [
                'service.name',
                'service.environment',
                'transaction.type',
                'transaction.name',
              ],
            },
            ruleTypeId: ApmRuleType.TransactionDuration,
            consumer: 'apm',
            roleAuthc,
          });
          ruleId = createdRule.id;
          alerts = await alertingApi.waitForAlertInIndex({
            ruleId,
            indexName: APM_ALERTS_INDEX,
          });
        });

        after(async () => {
          await alertingApi.cleanUpAlerts({
            ruleId,
            alertIndexName: APM_ALERTS_INDEX,
            connectorIndexName: APM_ACTION_VARIABLE_INDEX,
            consumer: 'apm',
            roleAuthc,
          });
        });

        it('checks if rule is active', async () => {
          const ruleStatus = await alertingApi.waitForRuleStatus({
            ruleId,
            expectedStatus: 'active',
            roleAuthc,
          });
          expect(ruleStatus).to.be('active');
        });

        it('should successfully run the rule', async () => {
          const response = await alertingApi.runRule(roleAuthc, ruleId);
          expect(response.status).to.be(204);
        });

        it('indexes alert document', async () => {
          expect(alerts.hits.hits.length).to.be(1);
        });

        it('returns the correct number of alert counts', async () => {
          const txGroupsTypeRequest = await getTransactionGroups({
            query: { transactionType: 'request' },
          });

          expect(txGroupsTypeRequest.hasActiveAlerts).to.be.equal(true);

          const expected = txGroupsTypeRequest.transactionGroups
            .filter(({ name }) => name.includes('request'))
            .map(({ name, alertsCount }) => ({
              name,
              alertsCount,
            }));

          expect(expected).to.eql([
            { name: 'GET /api/failed/request', alertsCount: 0 },
            { name: 'GET /api/request/p95', alertsCount: 0 },
            { name: 'GET /api/request/p99', alertsCount: 0 },
            { name: 'GET /api/request/avg', alertsCount: 1 },
          ]);
        });
      });

      describe('with p99 transaction duration alerts', () => {
        let ruleId: string;
        let alerts: Alerts;

        before(async () => {
          const createdRule = await alertingApi.createRule({
            name: `Latency threshold | ${serviceName}`,
            params: {
              serviceName,
              transactionType: 'request',
              transactionName: 'GET /api/request/p99',
              windowSize: 99,
              windowUnit: 'h',
              threshold: 10,
              aggregationType: AggregationType.P99,
              environment: 'production',
              groupBy: [
                'service.name',
                'service.environment',
                'transaction.type',
                'transaction.name',
              ],
            },
            ruleTypeId: ApmRuleType.TransactionDuration,
            consumer: 'apm',
            roleAuthc,
          });

          ruleId = createdRule.id;
          alerts = await alertingApi.waitForAlertInIndex({
            ruleId,
            indexName: APM_ALERTS_INDEX,
          });
        });

        after(async () => {
          await alertingApi.cleanUpAlerts({
            ruleId,
            alertIndexName: APM_ALERTS_INDEX,
            connectorIndexName: APM_ACTION_VARIABLE_INDEX,
            consumer: 'apm',
            roleAuthc,
          });
        });

        it('checks if rule is active', async () => {
          const ruleStatus = await alertingApi.waitForRuleStatus({
            ruleId,
            expectedStatus: 'active',
            roleAuthc,
          });
          expect(ruleStatus).to.be('active');
        });

        it('should successfully run the rule', async () => {
          const response = await alertingApi.runRule(roleAuthc, ruleId);
          expect(response.status).to.be(204);
        });

        it('indexes alert document', async () => {
          expect(alerts.hits.hits.length).to.be(1);
        });

        it('returns the correct number of alert counts', async () => {
          const txGroupsTypeRequest = await getTransactionGroups({
            query: {
              transactionType: 'request',
              latencyAggregationType: LatencyAggregationType.p99,
            },
          });

          expect(txGroupsTypeRequest.hasActiveAlerts).to.be.equal(true);

          const expected = txGroupsTypeRequest.transactionGroups
            .filter(({ name }) => name.includes('request'))
            .map(({ name, alertsCount }) => ({
              name,
              alertsCount,
            }));

          expect(expected).to.eql([
            { name: 'GET /api/failed/request', alertsCount: 0 },
            { name: 'GET /api/request/avg', alertsCount: 0 },
            { name: 'GET /api/request/p95', alertsCount: 0 },
            { name: 'GET /api/request/p99', alertsCount: 1 },
          ]);
        });
      });

      describe('with error rate alerts', () => {
        let ruleId: string;
        let alerts: Alerts;

        before(async () => {
          const createdRule = await alertingApi.createRule({
            name: `Error rate | ${serviceName}`,
            params: {
              serviceName,
              transactionType: 'request',
              transactionName: 'GET /api/failed/request',
              windowSize: 99,
              windowUnit: 'h',
              threshold: 5,
              environment: 'production',
              groupBy: [
                'service.name',
                'service.environment',
                'transaction.type',
                'transaction.name',
              ],
            },
            ruleTypeId: ApmRuleType.TransactionErrorRate,
            consumer: 'apm',
            roleAuthc,
          });

          ruleId = createdRule.id;
          alerts = await alertingApi.waitForAlertInIndex({
            ruleId,
            indexName: APM_ALERTS_INDEX,
          });
        });

        after(async () => {
          await alertingApi.cleanUpAlerts({
            ruleId,
            alertIndexName: APM_ALERTS_INDEX,
            connectorIndexName: APM_ACTION_VARIABLE_INDEX,
            consumer: 'apm',
            roleAuthc,
          });
        });

        it('checks if rule is active', async () => {
          const ruleStatus = await alertingApi.waitForRuleStatus({
            ruleId,
            expectedStatus: 'active',
            roleAuthc,
          });
          expect(ruleStatus).to.be('active');
        });

        it('should successfully run the rule', async () => {
          const response = await alertingApi.runRule(roleAuthc, ruleId);
          expect(response.status).to.be(204);
        });

        it('indexes alert document', async () => {
          expect(alerts.hits.hits.length).to.be(1);
        });

        it('returns the correct number of alert counts', async () => {
          const txGroupsTypeRequest = await getTransactionGroups({
            query: {
              transactionType: 'request',
              latencyAggregationType: LatencyAggregationType.p95,
            },
          });

          const expected = txGroupsTypeRequest.transactionGroups
            .filter(({ name }) => name.includes('request'))
            .map(({ name, alertsCount }) => ({
              name,
              alertsCount,
            }));

          expect(txGroupsTypeRequest.hasActiveAlerts).to.be.equal(true);

          expect(expected).to.eql([
            { name: 'GET /api/request/avg', alertsCount: 0 },
            { name: 'GET /api/request/p95', alertsCount: 0 },
            { name: 'GET /api/request/p99', alertsCount: 0 },
            { name: 'GET /api/failed/request', alertsCount: 1 },
          ]);
        });
      });

      describe('without alerts', () => {
        it('returns the correct number of alert counts', async () => {
          const txGroupsTypeTask = await getTransactionGroups({
            query: { transactionType: 'task' },
          });

          const expected = txGroupsTypeTask.transactionGroups.map(({ name, alertsCount }) => ({
            name,
            alertsCount,
          }));

          expect(txGroupsTypeTask.hasActiveAlerts).to.be.equal(false);

          expect(expected).to.eql([{ name: 'GET /api/task/avg', alertsCount: 0 }]);
        });
      });
    });
  });
}
