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
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createApmRule, runRuleSoon, ApmAlertFields } from '../alerts/helpers/alerting_api_helper';
import { waitForActiveRule } from '../alerts/helpers/wait_for_active_rule';
import { waitForAlertsForRule } from '../alerts/helpers/wait_for_alerts_for_rule';
import { cleanupRuleAndAlertState } from '../alerts/helpers/cleanup_rule_and_alert_state';

type TransactionsGroupsMainStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');
  const supertest = getService('supertest');
  const es = getService('es');
  const serviceName = 'synth-go';
  const dayInMs = 24 * 60 * 60 * 1000;
  const start = Date.now() - dayInMs;
  const end = Date.now() + dayInMs;
  const logger = getService('log');

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

  // FLAKY: https://github.com/elastic/kibana/issues/177617
  registry.when('when data is loaded', { config: 'basic', archives: [] }, () => {
    describe('Alerts', () => {
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
      before(async () => {
        const serviceGoProdInstance = apm
          .service({ name: serviceName, environment: 'production', agentName: 'go' })
          .instance('instance-a');

        await synthtraceEsClient.index([
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

      after(() => synthtraceEsClient.clean());

      describe('Transaction groups with avg transaction duration alerts', () => {
        let ruleId: string;
        let alerts: ApmAlertFields[];

        before(async () => {
          const createdRule = await createApmRule({
            supertest,
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
          });
          ruleId = createdRule.id;
          alerts = await waitForAlertsForRule({ es, ruleId });
        });

        after(async () => {
          await cleanupRuleAndAlertState({ es, supertest, logger });
        });

        it('checks if rule is active', async () => {
          const ruleStatus = await waitForActiveRule({ ruleId, supertest });
          expect(ruleStatus).to.be('active');
        });

        it('should successfully run the rule', async () => {
          const response = await runRuleSoon({
            ruleId,
            supertest,
          });
          expect(response.status).to.be(204);
        });

        it('indexes alert document', async () => {
          expect(alerts.length).to.be(1);
        });

        it('returns the correct number of alert counts', async () => {
          const txGroupsTypeRequest = await getTransactionGroups({
            query: { transactionType: 'request' },
          });

          expect(txGroupsTypeRequest.hasActiveAlerts).to.be.equal(true);

          const expected = txGroupsTypeRequest.transactionGroups.map(({ name, alertsCount }) => ({
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

      describe('Transaction groups with p99 transaction duration alerts', () => {
        let ruleId: string;
        let alerts: ApmAlertFields[];

        before(async () => {
          const createdRule = await createApmRule({
            supertest,
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
          });

          ruleId = createdRule.id;
          alerts = await waitForAlertsForRule({ es, ruleId });
        });

        after(async () => {
          await cleanupRuleAndAlertState({ es, supertest, logger });
        });

        it('checks if rule is active', async () => {
          const ruleStatus = await waitForActiveRule({ ruleId, supertest });
          expect(ruleStatus).to.be('active');
        });

        it('should successfully run the rule', async () => {
          const response = await runRuleSoon({
            ruleId,
            supertest,
          });
          expect(response.status).to.be(204);
        });

        it('indexes alert document', async () => {
          expect(alerts.length).to.be(1);
        });

        it('returns the correct number of alert counts', async () => {
          const txGroupsTypeRequest = await getTransactionGroups({
            query: {
              transactionType: 'request',
              latencyAggregationType: LatencyAggregationType.p99,
            },
          });

          expect(txGroupsTypeRequest.hasActiveAlerts).to.be.equal(true);

          const expected = txGroupsTypeRequest.transactionGroups.map(({ name, alertsCount }) => ({
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

      describe('Transaction groups with error rate alerts', () => {
        let ruleId: string;
        let alerts: ApmAlertFields[];

        before(async () => {
          const createdRule = await createApmRule({
            supertest,
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
          });
          ruleId = createdRule.id;
          alerts = await waitForAlertsForRule({ es, ruleId });
        });

        after(async () => {
          await cleanupRuleAndAlertState({ es, supertest, logger });
        });

        it('checks if rule is active', async () => {
          const ruleStatus = await waitForActiveRule({ ruleId, supertest });
          expect(ruleStatus).to.be('active');
        });

        it('should successfully run the rule', async () => {
          const response = await runRuleSoon({
            ruleId,
            supertest,
          });
          expect(response.status).to.be(204);
        });

        it('indexes alert document', async () => {
          expect(alerts.length).to.be(1);
        });

        it('returns the correct number of alert counts', async () => {
          const txGroupsTypeRequest = await getTransactionGroups({
            query: {
              transactionType: 'request',
              latencyAggregationType: LatencyAggregationType.p95,
            },
          });

          const expected = txGroupsTypeRequest.transactionGroups.map(({ name, alertsCount }) => ({
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

      describe('Transaction groups without alerts', () => {
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
