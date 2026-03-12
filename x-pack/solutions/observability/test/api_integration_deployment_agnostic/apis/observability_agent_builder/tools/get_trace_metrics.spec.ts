/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { timerange } from '@kbn/synthtrace-client';
import { orderBy } from 'lodash';
import {
  type ApmSynthtraceEsClient,
  generateTraceMetricsData,
  type TraceMetricsServiceConfig,
} from '@kbn/synthtrace';
import type { OtherResult } from '@kbn/agent-builder-common';
import { OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { TraceMetricsItem } from '@kbn/observability-agent-builder-plugin/server/tools/get_trace_metrics/handler';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

interface GetTraceMetricsToolResult extends OtherResult {
  data: {
    items: TraceMetricsItem[];
  };
}

const START = 'now-15m';
const END = 'now';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    const testServices: TraceMetricsServiceConfig[] = [
      // Service 1: payment-service in production on host-01 with container, k8s pod, and labels
      {
        name: 'payment-service',
        environment: 'production',
        hostName: 'host-01',
        containerId: 'container-payment-001',
        kubernetesPodName: 'payment-service-pod-abc123',
        labels: { team: 'payments', tier: 'critical' },
        transactions: [
          {
            name: 'POST /api/payment',
            type: 'request',
            duration: 200,
            failureRate: 0.1, // 10% failure rate
            labels: { endpoint: 'payment-create' },
          },
          {
            name: 'GET /api/payment/status',
            type: 'request',
            duration: 50,
            failureRate: 0.0, // No failures
            labels: { endpoint: 'payment-status' },
          },
        ],
      },
      // Service 2: user-service in production on host-01 with k8s pod and labels
      {
        name: 'user-service',
        environment: 'production',
        hostName: 'host-01',
        containerId: 'container-user-001',
        kubernetesPodName: 'user-service-pod-def456',
        labels: { team: 'identity', tier: 'critical' },
        transactions: [
          {
            name: 'GET /api/user',
            type: 'request',
            duration: 100,
            failureRate: 0.05, // 5% failure rate
          },
          {
            name: 'page-load',
            type: 'page-load',
            duration: 1000,
            failureRate: 0.02, // 2% failure rate
          },
        ],
      },
      // Service 3: order-service in staging on host-02 with container, k8s pod, and labels
      {
        name: 'order-service',
        environment: 'staging',
        hostName: 'host-02',
        containerId: 'container-order-001',
        kubernetesPodName: 'order-service-pod-ghi789',
        labels: { team: 'orders', tier: 'standard' },
        transactions: [
          {
            name: 'POST /api/order',
            type: 'request',
            duration: 300,
            failureRate: 0.2, // 20% failure rate
          },
          {
            name: 'worker-process',
            type: 'worker',
            duration: 500,
            failureRate: 0.15, // 15% failure rate
          },
        ],
      },
      // Service 4: notification-service in staging on host-02 with k8s pod and labels
      {
        name: 'notification-service',
        environment: 'staging',
        hostName: 'host-02',
        containerId: 'container-notify-001',
        kubernetesPodName: 'notification-service-pod-jkl012',
        labels: { team: 'notifications', tier: 'standard' },
        transactions: [
          {
            name: 'send-notification',
            type: 'messaging',
            duration: 150,
            failureRate: 0.3, // 30% failure rate
          },
        ],
      },
    ];

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);

      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      await apmSynthtraceEsClient.clean();

      const range = timerange(START, END);
      const { client, generator } = generateTraceMetricsData({
        range,
        apmEsClient: apmSynthtraceEsClient,
        services: testServices,
      });

      await client.index(generator);
    });

    after(async () => {
      if (apmSynthtraceEsClient) {
        await apmSynthtraceEsClient.clean();
      }
    });

    describe('when fetching trace metrics without filters (default groupBy: service.name)', () => {
      let resultData: GetTraceMetricsToolResult['data'];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
          id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
          params: {
            start: START,
            end: END,
          },
        });

        expect(results).to.have.length(1);
        resultData = results[0].data;
      });

      it('returns items for all services', () => {
        expect(resultData.items).to.be.an('array');
        expect(resultData.items.length).to.be(4);

        const groups = resultData.items.map((item) => item.group);
        expect(groups).to.contain('payment-service');
        expect(groups).to.contain('user-service');
        expect(groups).to.contain('order-service');
        expect(groups).to.contain('notification-service');
      });

      it('returns correct structure for each item', () => {
        for (const item of resultData.items) {
          expect(item).to.have.property('group');
          expect(item).to.have.property('latency');
          expect(item).to.have.property('throughput');
          expect(item).to.have.property('failureRate');

          expect(typeof item.group).to.be('string');
          expect(item.latency === null || typeof item.latency === 'number').to.be(true);
          expect(typeof item.throughput).to.be('number');
          expect(typeof item.failureRate).to.be('number');
        }
      });

      it('returns non-zero throughput for all services', () => {
        for (const item of resultData.items) {
          expect(item.throughput).to.be.greaterThan(0);
        }
      });

      it('returns latency values in milliseconds', () => {
        for (const item of resultData.items) {
          if (item.latency !== null) {
            expect(item.latency).to.be.greaterThan(0);
            expect(item.latency).to.be.lessThan(10000);
          }
        }
      });

      it('returns failure rate between 0 and 1', () => {
        for (const item of resultData.items) {
          expect(item.failureRate).to.be.within(0, 1);
        }
      });

      it('returns expected failure rate for notification-service (highest failure rate)', () => {
        const notificationService = resultData.items.find(
          (item) => item.group === 'notification-service'
        );
        expect(notificationService).to.be.ok();
        // Configured at 30% failure rate: 3 failures / 10 total = 0.3
        expect(notificationService!.failureRate).to.be(0.3);
      });

      it('returns values sorted by latency descending by default', () => {
        expect(resultData.items).to.eql(orderBy(resultData.items, 'latency', 'desc'));
      });

      describe('when sorting by metrics', () => {
        const parameters = [
          { sortBy: 'latency', latencyType: 'avg' },
          { sortBy: 'latency', latencyType: 'p95' },
          { sortBy: 'latency', latencyType: 'p99' },
          { sortBy: 'throughput' },
          { sortBy: 'failureRate' },
        ];

        for (const params of parameters) {
          it(`returns values sorted by ${params.sortBy} descending when sortBy=${params.sortBy} and latencyType=${params.latencyType}`, async () => {
            const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
              id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
              params: {
                start: START,
                end: END,
                sortBy: params.sortBy,
                latencyType: params.latencyType,
              },
            });
            const { items } = results[0].data;
            expect(items.length).to.be.greaterThan(0);
            expect(items).to.eql(orderBy(items, params.sortBy, 'desc'));
          });
        }

        describe('when sorting across different metric sets (document sources)', () => {
          const metricSetFilters = [
            {
              name: 'raw transaction events (processor.event: transaction)',
              kqlFilter: 'transaction.duration.us : *',
            },
            {
              name: 'transaction metrics (metricset.name: transaction)',
              kqlFilter: 'metricset.name: "transaction"',
            },
            {
              name: 'service transaction metrics (metricset.name: service_transaction)',
              kqlFilter: 'metricset.name: "service_transaction"',
            },
          ] as const;

          const toItemsByGroup = (items: TraceMetricsItem[]) =>
            new Map(items.map((item) => [item.group, item] as const));

          for (const params of parameters) {
            describe(`with sortBy=${params.sortBy} and latencyType=${params.latencyType}`, () => {
              let rawEvents: TraceMetricsItem[];
              let transactionMetrics: TraceMetricsItem[];
              let serviceTransactionMetrics: TraceMetricsItem[];
              before(async () => {
                [rawEvents, transactionMetrics, serviceTransactionMetrics] = await Promise.all(
                  metricSetFilters.map(async ({ name, kqlFilter }) => {
                    const results =
                      await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
                        id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
                        params: {
                          start: START,
                          end: END,
                          kqlFilter,
                          sortBy: params.sortBy,
                          latencyType: params.latencyType,
                        },
                      });

                    return results[0].data.items;
                  })
                );
              });

              it(`returns the same number of items across all metric sets when sortBy=${params.sortBy} and latencyType=${params.latencyType}`, () => {
                expect(rawEvents.length).to.be(transactionMetrics.length);
                expect(rawEvents.length).to.be(serviceTransactionMetrics.length);

                expect(toItemsByGroup(rawEvents)).to.eql(toItemsByGroup(transactionMetrics));
                expect(toItemsByGroup(rawEvents)).to.eql(toItemsByGroup(serviceTransactionMetrics));
              });
            });
          }
        });
      });
    });

    describe('when fetching trace metrics with filters', () => {
      describe('when filtering by service.name', () => {
        it('returns metrics only for the specified service', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'service.name: "payment-service"',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.have.length(1);
          expect(items[0].group).to.be('payment-service');
        });

        it('returns correct metrics for payment-service', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'service.name: "payment-service"',
            },
          });

          const { items } = results[0].data;
          const paymentService = items[0];

          expect(paymentService.throughput).to.be.greaterThan(0);
          expect(paymentService.latency).to.be.greaterThan(0);
          // Payment service has two transactions: 10% and 0% failure rates
          // Combined should be between 0 and 0.1
          expect(paymentService.failureRate).to.be.within(0, 0.15);
        });
      });

      describe('when filtering by service.environment', () => {
        it('returns metrics only for services in production environment', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'service.environment: "production"',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.have.length(2);
          const groups = items.map((item) => item.group);
          expect(groups).to.contain('payment-service');
          expect(groups).to.contain('user-service');
          expect(groups).not.to.contain('order-service');
          expect(groups).not.to.contain('notification-service');
        });

        it('returns metrics only for services in staging environment', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'service.environment: "staging"',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.have.length(2);
          const groups = items.map((item) => item.group);
          expect(groups).to.contain('order-service');
          expect(groups).to.contain('notification-service');
          expect(groups).not.to.contain('payment-service');
          expect(groups).not.to.contain('user-service');
        });
      });

      describe('when filtering by transaction.name', () => {
        it('returns metrics for specific transaction name', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'transaction.name: "POST /api/payment"',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.have.length(1);
          expect(items[0].group).to.be('payment-service');
          // POST /api/payment has 10% failure rate: 1 failure / 10 total = 0.1
          expect(items[0].failureRate).to.be(0.1);
        });

        it('returns metrics for worker-process transaction', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'transaction.name: "worker-process"',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.have.length(1);
          expect(items[0].group).to.be('order-service');
          // worker-process has 15% failure rate
          expect(items[0].failureRate).to.be.within(0.1, 0.2);
        });
      });

      describe('when filtering by transaction.type', () => {
        it('returns metrics for request transaction type only', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'transaction.type: "request"',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          // Should include payment-service, user-service, and order-service
          // (notification-service only has messaging type)
          expect(items.length).to.be(3);
          const groups = items.map((item) => item.group);
          expect(groups).to.contain('payment-service');
          expect(groups).to.contain('user-service');
          expect(groups).to.contain('order-service');
          expect(groups).not.to.contain('notification-service');
        });

        it('returns metrics for page-load transaction type only', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'transaction.type: "page-load"',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.have.length(1);
          expect(items[0].group).to.be('user-service');
          // page-load has 2% failure rate: Math.round(10 * 0.02) = 0 failures, so 0% actual
          expect(items[0].failureRate).to.be(0);
        });

        it('returns metrics for messaging transaction type only', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'transaction.type: "messaging"',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.have.length(1);
          expect(items[0].group).to.be('notification-service');
          // messaging type has 30% failure rate: 3 failures / 10 total = 0.3
          expect(items[0].failureRate).to.be(0.3);
        });

        it('returns metrics for worker transaction type only', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'transaction.type: "worker"',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.have.length(1);
          expect(items[0].group).to.be('order-service');
          // worker type has 15% failure rate
          expect(items[0].failureRate).to.be.within(0.1, 0.2);
        });
      });

      describe('when filtering by high-cardinality fields (labels)', () => {
        it('returns metrics when filtering by service-level label (team)', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'labels.team: "payments"',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.have.length(1);
          expect(items[0].group).to.be('payment-service');
          expect(items[0].throughput).to.be.greaterThan(0);
          expect(items[0].latency).to.be.greaterThan(0);
        });

        it('returns metrics when filtering by tier label', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'labels.tier: "critical"',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.have.length(2);
          const groups = items.map((item) => item.group);
          expect(groups).to.contain('payment-service');
          expect(groups).to.contain('user-service');
        });

        it('returns metrics when filtering by standard tier label', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'labels.tier: "standard"',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.have.length(2);
          const groups = items.map((item) => item.group);
          expect(groups).to.contain('order-service');
          expect(groups).to.contain('notification-service');
        });

        it('returns metrics when filtering by transaction-level label', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'labels.endpoint: "payment-create"',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.have.length(1);
          expect(items[0].group).to.be('payment-service');
          // POST /api/payment has 10% failure rate
          expect(items[0].failureRate).to.be(0.1);
        });

        it('returns empty results when filtering by non-existent label value', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'labels.team: "non-existent-team"',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.be.an('array');
          expect(items).to.have.length(0);
        });

        it('combines label filter with other filters', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'labels.tier: "critical" AND service.environment: "production"',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.have.length(2);
          const groups = items.map((item) => item.group);
          expect(groups).to.contain('payment-service');
          expect(groups).to.contain('user-service');
        });

        it('filters by label and groups by transaction name', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'labels.team: "payments"',
              groupBy: 'transaction.name',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.have.length(2);
          const transactionNames = items.map((item) => item.group);
          expect(transactionNames).to.contain('POST /api/payment');
          expect(transactionNames).to.contain('GET /api/payment/status');
        });
      });
    });

    describe('when fetching trace metrics with a groupBy', () => {
      describe('when grouping by host.name', () => {
        it('returns metrics grouped by host', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              groupBy: 'host.name',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.have.length(2);
          const hostNames = items.map((item) => item.group);
          expect(hostNames).to.contain('host-01');
          expect(hostNames).to.contain('host-02');
        });

        it('returns correct metrics for host-01', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              groupBy: 'host.name',
            },
          });

          const { items } = results[0].data;
          const host01 = items.find((item) => item.group === 'host-01');

          expect(host01).to.be.ok();
          expect(host01!.throughput).to.be.greaterThan(0);
          expect(host01!.latency).to.be.greaterThan(0);
          // host-01 runs payment-service and user-service with varying failure rates
          expect(host01!.failureRate).to.be.within(0, 0.15);
        });

        it('returns correct metrics for host-02', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              groupBy: 'host.name',
            },
          });

          const { items } = results[0].data;
          const host02 = items.find((item) => item.group === 'host-02');

          expect(host02).to.be.ok();
          expect(host02!.throughput).to.be.greaterThan(0);
          expect(host02!.latency).to.be.greaterThan(0);
          // host-02 runs order-service (20%, 15%) and notification-service (30%)
          // Combined should be higher failure rate
          expect(host02!.failureRate).to.be.within(0.1, 0.35);
        });
      });

      describe('when grouping by transaction.name', () => {
        it('returns metrics grouped by transaction name', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              groupBy: 'transaction.name',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          // We have 7 unique transaction names across all services
          expect(items.length).to.be(7);

          const transactionNames = items.map((item) => item.group);
          expect(transactionNames).to.contain('POST /api/payment');
          expect(transactionNames).to.contain('GET /api/payment/status');
          expect(transactionNames).to.contain('GET /api/user');
          expect(transactionNames).to.contain('page-load');
          expect(transactionNames).to.contain('POST /api/order');
          expect(transactionNames).to.contain('worker-process');
          expect(transactionNames).to.contain('send-notification');
        });

        it('returns correct metrics for specific transaction', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              groupBy: 'transaction.name',
            },
          });

          const { items } = results[0].data;

          // Check send-notification transaction (30% failure rate): 3 failures / 10 total = 0.3
          const sendNotification = items.find((item) => item.group === 'send-notification');
          expect(sendNotification).to.be.ok();
          expect(sendNotification!.failureRate).to.be(0.3);

          // Check GET /api/payment/status (0% failure rate): 0 failures / 10 total = 0
          const getPaymentStatus = items.find((item) => item.group === 'GET /api/payment/status');
          expect(getPaymentStatus).to.be.ok();
          expect(getPaymentStatus!.failureRate).to.be(0);
        });
      });

      describe('when grouping by service.environment', () => {
        it('returns metrics grouped by environment', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              groupBy: 'service.environment',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.have.length(2);
          const environments = items.map((item) => item.group);
          expect(environments).to.contain('production');
          expect(environments).to.contain('staging');
        });

        it('returns higher failure rate for staging environment', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              groupBy: 'service.environment',
            },
          });

          const { items } = results[0].data;
          const production = items.find((item) => item.group === 'production');
          const staging = items.find((item) => item.group === 'staging');

          expect(production).to.be.ok();
          expect(staging).to.be.ok();

          // Staging has higher failure rates (order-service: 20%, 15%; notification-service: 30%)
          // Production has lower failure rates (payment-service: 10%, 0%; user-service: 5%, 2%)
          expect(staging!.failureRate).to.be.greaterThan(production!.failureRate);
        });
      });

      describe('when grouping by container.id', () => {
        it('returns metrics grouped by container', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              groupBy: 'container.id',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.have.length(4);
          const containerIds = items.map((item) => item.group);
          expect(containerIds).to.contain('container-payment-001');
          expect(containerIds).to.contain('container-user-001');
          expect(containerIds).to.contain('container-order-001');
          expect(containerIds).to.contain('container-notify-001');
        });

        it('returns correct metrics for a specific container', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              groupBy: 'container.id',
            },
          });

          const { items } = results[0].data;
          const paymentContainer = items.find((item) => item.group === 'container-payment-001');

          expect(paymentContainer).to.be.ok();
          expect(paymentContainer!.throughput).to.be.greaterThan(0);
          expect(paymentContainer!.latency).to.be.greaterThan(0);
        });
      });

      describe('when grouping by kubernetes.pod.name', () => {
        it('returns metrics grouped by Kubernetes pod', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              groupBy: 'kubernetes.pod.name',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.have.length(4);
          const podNames = items.map((item) => item.group);
          expect(podNames).to.contain('payment-service-pod-abc123');
          expect(podNames).to.contain('user-service-pod-def456');
          expect(podNames).to.contain('order-service-pod-ghi789');
          expect(podNames).to.contain('notification-service-pod-jkl012');
        });

        it('returns correct metrics for a specific pod', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              groupBy: 'kubernetes.pod.name',
            },
          });

          const { items } = results[0].data;
          const paymentPod = items.find((item) => item.group === 'payment-service-pod-abc123');

          expect(paymentPod).to.be.ok();
          expect(paymentPod!.throughput).to.be.greaterThan(0);
          expect(paymentPod!.latency).to.be.greaterThan(0);
          // Payment service has two transactions: 10% and 0% failure rates
          expect(paymentPod!.failureRate).to.be.within(0, 0.15);
        });

        it('filters by service and groups by kubernetes pod', async () => {
          const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
            id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'service.name: "payment-service"',
              groupBy: 'kubernetes.pod.name',
            },
          });

          expect(results).to.have.length(1);
          const { items } = results[0].data;

          expect(items).to.have.length(1);
          expect(items[0].group).to.be('payment-service-pod-abc123');
        });
      });
    });

    describe('when using a combination of filters and groupBy', () => {
      it('filters by service and transaction type', async () => {
        const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
          id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: 'service.name: "user-service" AND transaction.type: "request"',
          },
        });

        expect(results).to.have.length(1);
        const { items } = results[0].data;

        expect(items).to.have.length(1);
        expect(items[0].group).to.be('user-service');
        // GET /api/user (5%): Math.round(10 * 0.05) = 1 failure, Math.round(10 * 0.95) = 10 successes
        // 1/11 ≈ 0.09 (rounding affects exact value)
        expect(items[0].failureRate).to.be.within(0.08, 0.1);
      });

      it('filters by environment and transaction type', async () => {
        const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
          id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: 'service.environment: "staging" AND transaction.type: "request"',
          },
        });

        expect(results).to.have.length(1);
        const { items } = results[0].data;

        expect(items).to.have.length(1);
        expect(items[0].group).to.be('order-service');
        // POST /api/order has 20% failure rate: 2 failures / 10 total = 0.2
        expect(items[0].failureRate).to.be(0.2);
      });

      it('filters by service and groups by transaction name', async () => {
        const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
          id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: 'service.name: "payment-service"',
            groupBy: 'transaction.name',
          },
        });

        expect(results).to.have.length(1);
        const { items } = results[0].data;

        expect(items).to.have.length(2);
        const transactionNames = items.map((item) => item.group);
        expect(transactionNames).to.contain('POST /api/payment');
        expect(transactionNames).to.contain('GET /api/payment/status');
      });

      it('filters by host and groups by service', async () => {
        const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
          id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: 'host.name: "host-01"',
            groupBy: 'service.name',
          },
        });

        expect(results).to.have.length(1);
        const { items } = results[0].data;

        expect(items).to.have.length(2);
        const groups = items.map((item) => item.group);
        expect(groups).to.contain('payment-service');
        expect(groups).to.contain('user-service');
        expect(groups).not.to.contain('order-service');
        expect(groups).not.to.contain('notification-service');
      });
    });

    describe('edge cases when filtering and when there is no data', () => {
      it('returns empty items when filter matches no data', async () => {
        const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
          id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: 'service.name: "non-existent-service"',
          },
        });

        expect(results).to.have.length(1);
        const { items } = results[0].data;

        expect(items).to.be.an('array');
        expect(items).to.have.length(0);
      });

      it('handles time range with no data', async () => {
        const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
          id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
          params: {
            start: 'now-100d',
            end: 'now-99d',
          },
        });

        expect(results).to.have.length(1);
        const { items } = results[0].data;

        expect(items).to.be.an('array');
        expect(items).to.have.length(0);
      });

      it('defaults to service.name grouping when groupBy is not provided', async () => {
        const results = await agentBuilderApiClient.executeTool<GetTraceMetricsToolResult>({
          id: OBSERVABILITY_GET_TRACE_METRICS_TOOL_ID,
          params: {
            start: START,
            end: END,
          },
        });

        expect(results).to.have.length(1);
        const { items } = results[0].data;

        expect(items).to.have.length(4);
        const groups = items.map((item) => item.group);
        expect(groups).to.contain('payment-service');
        expect(groups).to.contain('user-service');
        expect(groups).to.contain('order-service');
        expect(groups).to.contain('notification-service');
      });
    });
  });
}
