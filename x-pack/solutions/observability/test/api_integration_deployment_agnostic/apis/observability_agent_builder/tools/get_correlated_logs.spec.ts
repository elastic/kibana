/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { times } from 'lodash';
import { timerange } from '@kbn/synthtrace-client';
import {
  type LogsSynthtraceEsClient,
  generateCorrelatedLogsData,
  type CorrelatedLogEvent,
} from '@kbn/synthtrace';
import { OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { GetCorrelatedLogsToolResult } from '@kbn/observability-agent-builder-plugin/server/tools/get_correlated_logs/types';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

async function indexCorrelatedLogs({
  logsEsClient,
  logs,
}: {
  logsEsClient: LogsSynthtraceEsClient;
  logs: CorrelatedLogEvent[];
}): Promise<void> {
  await logsEsClient.clean();
  const range = timerange('now-5m', 'now');
  const { client, generator } = generateCorrelatedLogsData({ range, logsEsClient, logs });
  await client.index(generator);
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let logsSynthtraceEsClient: LogsSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);
      logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();
    });

    after(async () => {
      if (logsSynthtraceEsClient) {
        await logsSynthtraceEsClient.clean();
      }
    });

    describe('with single error and `trace.id` as correlation ID', () => {
      before(async () => {
        await indexCorrelatedLogs({
          logsEsClient: logsSynthtraceEsClient,
          logs: [
            {
              level: 'info',
              message: 'Starting payment processing',
              'service.name': 'payment-service',
              'trace.id': 'trace-123',
            },
            {
              level: 'debug',
              message: 'Validating payment details',
              'service.name': 'payment-service',
              'trace.id': 'trace-123',
            },
            {
              level: 'error',
              message: 'Payment gateway timeout',
              'service.name': 'payment-service',
              'trace.id': 'trace-123',
            },
            {
              level: 'warn',
              message: 'Retrying payment',
              'service.name': 'payment-service',
              'trace.id': 'trace-123',
            },
            {
              level: 'info',
              message: 'Payment completed',
              'service.name': 'payment-service',
              'trace.id': 'trace-123',
            },
          ],
        });
      });

      it('returns one log group with all logs', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            kqlFilter: 'service.name: "payment-service"',
          },
        });

        const { sequences, message } = results[0].data;

        expect(sequences.length).to.be(1);
        expect(sequences[0].logs.length).to.be(5);
        expect(sequences[0].correlation.field).to.be('trace.id');
        expect(sequences[0].correlation.value).to.be('trace-123');
        expect(message).to.be(undefined);
      });

      it('includes the error log and surrounding logs', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            kqlFilter: 'service.name: "payment-service"',
          },
        });

        const { sequences } = results[0].data;
        const messages = sequences[0].logs.map((log) => log.message);

        expect(messages).to.eql([
          'Starting payment processing',
          'Validating payment details',
          'Payment gateway timeout',
          'Retrying payment',
          'Payment completed',
        ]);
      });

      it('does not return logs that do not match the specified terms', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            kqlFilter: 'service.name: "non-existing-service"',
          },
        });

        const { sequences } = results[0].data;
        expect(sequences.length).to.be(0);
      });
    });

    describe('with multiple errors sharing the same correlation ID', () => {
      before(async () => {
        const sharedLogAttributes = {
          'service.name': 'checkout-service',
          'request.id': 'req-456',
        };

        await indexCorrelatedLogs({
          logsEsClient: logsSynthtraceEsClient,
          logs: [
            { level: 'info', message: 'Request started', ...sharedLogAttributes },
            { level: 'error', message: 'Database connection failed', ...sharedLogAttributes },
            { level: 'error', message: 'Rollback failed', ...sharedLogAttributes },
            { level: 'warn', message: 'Request aborted', ...sharedLogAttributes },
          ],
        });
      });

      it('creates only one group for multiple errors with same correlation ID', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            kqlFilter: 'service.name: "checkout-service"',
          },
        });

        const { sequences } = results[0].data;
        expect(sequences.length).to.be(1);
      });

      it('includes both error logs in the same group', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            kqlFilter: 'service.name: "checkout-service"',
          },
        });

        const group = results[0].data.sequences[0];
        const errorLogs = group.logs.filter((log: any) => log.log?.level === 'ERROR');
        expect(errorLogs.length).to.be(2);

        const messages = errorLogs.map((log: any) => log.message);
        expect(messages).to.contain('Database connection failed');
        expect(messages).to.contain('Rollback failed');
      });
    });

    describe('with multiple errors having different correlation IDs', () => {
      before(async () => {
        await indexCorrelatedLogs({
          logsEsClient: logsSynthtraceEsClient,
          logs: [
            {
              level: 'info',
              message: 'Payment flow started',
              'service.name': 'multi-service',
              'trace.id': 'trace-payment',
            },
            {
              level: 'error',
              message: 'Payment error',
              'service.name': 'multi-service',
              'trace.id': 'trace-payment',
            },

            {
              level: 'info',
              message: 'Refund flow started',
              'service.name': 'multi-service',
              'transaction.id': 'txn-refund',
            },
            {
              level: 'error',
              message: 'Refund error',
              'service.name': 'multi-service',
              'transaction.id': 'txn-refund',
            },
          ],
        });
      });

      it('creates separate sequences for errors with different correlation IDs', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            kqlFilter: 'service.name: "multi-service"',
          },
        });

        const { sequences } = results[0].data;
        expect(sequences.length).to.be(2);
      });

      it('sequences logs correctly by their correlation ID', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            kqlFilter: 'service.name: "multi-service"',
          },
        });

        const { sequences } = results[0].data;

        // Find payment group
        const paymentGroup = sequences.find((group) =>
          group.logs.some((log: any) => log.message === 'Payment error')
        );
        expect(paymentGroup).to.not.be(undefined);
        expect(paymentGroup!.logs.every((log: any) => log.trace?.id === 'trace-payment')).to.be(
          true
        );
        expect(paymentGroup!.correlation.field).to.be('trace.id');
        expect(paymentGroup!.correlation.value).to.be('trace-payment');

        // Find refund group
        const refundGroup = sequences.find((group) =>
          group.logs.some((log: any) => log.message === 'Refund error')
        );
        expect(refundGroup).to.not.be(undefined);
        expect(refundGroup!.logs.every((log: any) => log.transaction?.id === 'txn-refund')).to.be(
          true
        );
        expect(refundGroup!.correlation.field).to.be('transaction.id');
        expect(refundGroup!.correlation.value).to.be('txn-refund');
      });
    });

    describe('with errors lacking correlation IDs', () => {
      before(async () => {
        await indexCorrelatedLogs({
          logsEsClient: logsSynthtraceEsClient,
          logs: [
            {
              level: 'info',
              message: 'Uncorrelated info',
              'service.name': 'no-correlation-service',
            },
            {
              level: 'error',
              message: 'Uncorrelated error',
              'service.name': 'no-correlation-service',
            },
          ],
        });
      });

      it('returns empty results when errors have no correlation IDs', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            kqlFilter: 'service.name: "no-correlation-service"',
          },
        });

        const { sequences, message } = results[0].data;
        expect(sequences.length).to.be(0);
        expect(message).to.contain('No log sequences found.');
      });
    });

    describe('with KQL filtering', () => {
      before(async () => {
        await indexCorrelatedLogs({
          logsEsClient: logsSynthtraceEsClient,
          logs: [
            {
              level: 'error',
              message: 'Error in service A',
              'service.name': 'service-a',
              'trace.id': 'trace-a',
            },

            {
              level: 'error',
              message: 'Error in service B',
              'service.name': 'service-b',
              'trace.id': 'trace-b',
            },
          ],
        });
      });

      it('filters logs by service name', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            kqlFilter: 'service.name: "service-a"',
          },
        });

        const { sequences } = results[0].data;
        expect(sequences.length).to.be(1);
        expect(sequences[0].logs[0]).to.have.property('message', 'Error in service A');
      });
    });

    describe('with alternative error severity formats', () => {
      before(async () => {
        await indexCorrelatedLogs({
          logsEsClient: logsSynthtraceEsClient,
          logs: [
            {
              level: 'info',
              message: 'Syslog request started',
              'service.name': 'syslog-service',
              'trace.id': 'syslog-trace',
              'syslog.severity': 6,
            },
            {
              level: 'info',
              message: 'Syslog error occurred',
              'service.name': 'syslog-service',
              'trace.id': 'syslog-trace',
              'syslog.severity': 3,
            },

            {
              level: 'info',
              message: 'OpenTelemetry request started',
              'service.name': 'otel-service',
              'request.id': 'otel-req',
              SeverityNumber: 9,
            },
            {
              level: 'info',
              message: 'OpenTelemetry error occurred',
              'service.name': 'otel-service',
              'request.id': 'otel-req',
              SeverityNumber: 17,
            },

            {
              level: 'info',
              message: 'HTTP request started',
              'service.name': 'http-service',
              'correlation.id': 'http-corr',
              'http.response.status_code': 200,
            },
            {
              level: 'info',
              message: 'HTTP error occurred',
              'service.name': 'http-service',
              'correlation.id': 'http-corr',
              'http.response.status_code': 500,
            },
          ],
        });
      });

      [
        { service: 'syslog-service', format: 'syslog.severity (≤3)' },
        { service: 'otel-service', format: 'OpenTelemetry SeverityNumber (≥17)' },
        { service: 'http-service', format: 'HTTP status codes (≥500)' },
      ].forEach(({ service, format }) => {
        it(`detects errors using ${format}`, async () => {
          const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
            id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
            params: {
              start: 'now-10m',
              end: 'now',
              kqlFilter: `service.name: "${service}"`,
            },
          });

          const { sequences } = results[0].data;
          expect(sequences.length).to.be(1);
          expect(sequences[0].logs.length).to.be(2);
        });
      });
    });

    describe('with multiple correlation IDs on the same log', () => {
      const shared = {
        'service.name': 'priority-service',
        'trace.id': 'trace-priority-123',
        'request.id': 'request-priority-456',
        'transaction.id': 'txn-priority-789',
      };

      before(async () => {
        await indexCorrelatedLogs({
          logsEsClient: logsSynthtraceEsClient,
          logs: [
            { level: 'info', message: 'Request with multiple IDs started', ...shared },
            { level: 'error', message: 'Error with multiple correlation IDs', ...shared },
          ],
        });
      });

      it('uses trace.id when multiple correlation IDs are present (priority order)', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            kqlFilter: 'service.name: "priority-service"',
          },
        });

        const { sequences } = results[0].data;
        expect(sequences.length).to.be(1);

        // Verify all logs in the group have the same trace.id (highest priority)
        const allHaveTraceId = sequences[0].logs.every(
          (log: any) => log.trace?.id === 'trace-priority-123'
        );
        expect(allHaveTraceId).to.be(true);
        expect(sequences[0].correlation.field).to.be('trace.id');
        expect(sequences[0].correlation.value).to.be('trace-priority-123');

        expect(sequences[0].logs.map((log) => log.message)).to.eql([
          'Request with multiple IDs started',
          'Error with multiple correlation IDs',
        ]);
      });
    });

    describe('with additional log severity levels (SEVERE, WARNING, WARN)', () => {
      before(async () => {
        await indexCorrelatedLogs({
          logsEsClient: logsSynthtraceEsClient,
          logs: [
            {
              level: 'severe',
              message: 'Java severe error',
              'service.name': 'java-service',
              'trace.id': 'java-trace',
            },
            {
              level: 'warning',
              message: 'System warning',
              'service.name': 'system-service',
              'request.id': 'system-req',
            },
            {
              level: 'warn',
              message: 'Application warn',
              'service.name': 'app-service',
              'transaction.id': 'app-txn',
            },
          ],
        });
      });

      [
        { service: 'java-service', level: 'SEVERE', message: 'Java severe error' },
        { service: 'system-service', level: 'WARNING', message: 'System warning' },
        { service: 'app-service', level: 'WARN', message: 'Application warn' },
      ].forEach(({ service, level, message }) => {
        it(`detects errors using ${level} level`, async () => {
          const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
            id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
            params: {
              start: 'now-10m',
              end: 'now',
              kqlFilter: `service.name: "${service}"`,
            },
          });

          const { sequences } = results[0].data;
          expect(sequences.length).to.be(1);
          expect(sequences[0].logs[0]).to.have.property('message', message);
        });
      });
    });

    describe('with additional correlation identifiers', () => {
      before(async () => {
        await indexCorrelatedLogs({
          logsEsClient: logsSynthtraceEsClient,
          logs: [
            // session.id
            {
              level: 'info',
              message: 'Session started',
              'service.name': 'session-service',
              'session.id': 'session-abc-123',
            },
            {
              level: 'error',
              message: 'Session error',
              'service.name': 'session-service',
              'session.id': 'session-abc-123',
            },

            // http.request.id
            {
              level: 'info',
              message: 'HTTP request received',
              'service.name': 'http-server',
              'http.request.id': 'http-req-456',
            },
            {
              level: 'error',
              message: 'HTTP processing error',
              'service.name': 'http-server',
              'http.request.id': 'http-req-456',
            },

            // event.id
            {
              level: 'info',
              message: 'Event processing started',
              'service.name': 'event-processor',
              'event.id': 'evt-789',
            },
            {
              level: 'error',
              message: 'Event processing failed',
              'service.name': 'event-processor',
              'event.id': 'evt-789',
            },

            // cloud.trace_id
            {
              level: 'info',
              message: 'Cloud trace started',
              'service.name': 'cloud-service',
              'cloud.trace_id': 'cloud-trace-xyz',
            },
            {
              level: 'info',
              message: 'Cloud trace still running',
              'service.name': 'cloud-service',
              'cloud.trace_id': 'cloud-trace-xyz',
            },
            {
              level: 'error',
              message: 'Cloud operation failed',
              'service.name': 'cloud-service',
              'cloud.trace_id': 'cloud-trace-xyz',
            },

            // no correlation ID
            {
              level: 'info',
              message: 'Starting',
              'service.name': 'no-corr-id-service',
            },
            {
              level: 'error',
              message: 'Crashing',
              'service.name': 'no-corr-id-service',
            },
          ],
        });
      });

      [
        {
          correlationField: 'session.id',
          service: 'session-service',
          expectedMessages: ['Session started', 'Session error'],
        },
        {
          correlationField: 'http.request.id',
          service: 'http-server',
          expectedMessages: ['HTTP request received', 'HTTP processing error'],
        },
        {
          correlationField: 'event.id',
          service: 'event-processor',
          expectedMessages: ['Event processing started', 'Event processing failed'],
        },
        {
          correlationField: 'cloud.trace_id',
          service: 'cloud-service',
          expectedMessages: [
            'Cloud trace started',
            'Cloud trace still running',
            'Cloud operation failed',
          ],
        },

        {
          service: 'no-corr-id-service',
          expectedMessages: [],
        },
      ].forEach(({ correlationField, service, expectedMessages }) => {
        it(`Correlate by ${correlationField ?? 'N/A'}`, async () => {
          const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
            id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
            params: {
              start: 'now-10m',
              end: 'now',
              kqlFilter: `service.name: "${service}"`,
            },
          });

          const { sequences } = results[0].data;
          expect(sequences.flatMap((group) => group.logs.map(({ message }) => message))).to.eql(
            expectedMessages
          );
        });
      });
    });

    describe('with logId parameter', () => {
      let targetLogId: string;
      let targetIndex: string;

      before(async () => {
        await indexCorrelatedLogs({
          logsEsClient: logsSynthtraceEsClient,
          logs: [
            {
              level: 'info',
              message: 'Log for ID lookup',
              'service.name': 'id-service',
              'trace.id': 'trace-id-target',
            },
            {
              level: 'error',
              message: 'Error correlated with ID target',
              'service.name': 'id-service',
              'trace.id': 'trace-id-target',
            },
          ],
        });

        const es = getService('es');
        const result = await es.search({
          index: 'logs-*',
          q: 'message:"Log for ID lookup"',
        });

        if (result.hits.hits.length === 0) {
          throw new Error('Could not find inserted log for ID lookup');
        }

        targetLogId = result.hits.hits[0]._id!;
        targetIndex = result.hits.hits[0]._index;
      });

      it('finds correlated logs based on the provided logId', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
          params: {
            logId: targetLogId,
            index: targetIndex,
            start: 'now-15m',
            end: 'now',
          },
        });

        const { sequences } = results[0].data;
        expect(sequences.length).to.be(1);
        const messages = sequences[0].logs.map((log) => log.message);
        expect(messages).to.eql(['Log for ID lookup', 'Error correlated with ID target']);
      });
    });

    describe('with logSourceFields parameter', () => {
      before(async () => {
        await indexCorrelatedLogs({
          logsEsClient: logsSynthtraceEsClient,
          logs: [
            {
              level: 'info',
              message: 'Log with fields',
              'service.name': 'fields-service',
              'trace.id': 'trace-fields',
            },
            {
              level: 'error',
              message: 'Error with fields',
              'service.name': 'fields-service',
              'trace.id': 'trace-fields',
            },
          ],
        });
      });

      it('returns only specified fields', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            kqlFilter: 'service.name: "fields-service"',
            logSourceFields: ['message', 'service.name'],
          },
        });

        const { sequences } = results[0].data;
        expect(sequences.length).to.be(1);
        const logs = sequences[0].logs;

        expect(logs).to.eql([
          {
            message: 'Log with fields',
            service: { name: 'fields-service' },
          },
          {
            message: 'Error with fields',
            service: { name: 'fields-service' },
          },
        ]);
      });
    });

    describe('with limit parameters', () => {
      describe('maxSequences', () => {
        before(async () => {
          const logs = times(5, (i) => ({
            level: 'error',
            message: `Error in trace ${i}`,
            'service.name': 'limit-service',
            'trace.id': `trace-limit-${i}`,
          }));

          await indexCorrelatedLogs({
            logsEsClient: logsSynthtraceEsClient,
            logs,
          });
        });

        it('limits the number of returned sequences', async () => {
          const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
            id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
            params: {
              start: 'now-10m',
              end: 'now',
              kqlFilter: 'service.name: "limit-service"',
              maxSequences: 3,
            },
          });

          const { sequences } = results[0].data;
          expect(sequences.length).to.be(3);
        });
      });

      describe('maxLogsPerSequence', () => {
        before(async () => {
          const logs = [
            // info logs
            ...times(20, (i) => ({
              level: 'info',
              message: `Log ${i}`,
              'service.name': 'limit-logs-service',
              'trace.id': 'trace-limit-logs',
              '@timestamp': Date.now() - (20 - i) * 1000,
            })),

            // anchor
            {
              level: 'error',
              message: 'Error log',
              'service.name': 'limit-logs-service',
              'trace.id': 'trace-limit-logs',
              '@timestamp': Date.now(),
            },
          ];

          await indexCorrelatedLogs({
            logsEsClient: logsSynthtraceEsClient,
            logs,
          });
        });

        it('limits the number of logs per sequence', async () => {
          const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
            id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
            params: {
              start: 'now-10m',
              end: 'now',
              kqlFilter: 'service.name: "limit-logs-service"',
              maxLogsPerSequence: 5,
            },
          });

          const { sequences } = results[0].data;
          expect(sequences.length).to.be(1);
          expect(sequences[0].logs.length).to.be(5);
          expect(sequences[0].isTruncated).to.be(true);
        });
      });
    });

    describe('when the number of anchors in a single sequence is more than `maxSequences`', () => {
      before(async () => {
        const logs = [
          // Trace A: 60 errors (recent)
          ...times(60, (i) => ({
            level: 'error',
            message: `Error A ${i}`,
            'service.name': 'starvation-service',
            'trace.id': 'trace-A',
            '@timestamp': Date.now() - i * 1000, // 0s to 59s ago
          })),
          // Trace B: 1 error (older)
          {
            level: 'error',
            message: 'Error B',
            'service.name': 'starvation-service',
            'trace.id': 'trace-B',
            '@timestamp': Date.now() - 70000, // 70s ago
          },
        ];

        await indexCorrelatedLogs({
          logsEsClient: logsSynthtraceEsClient,
          logs,
        });
      });

      it('returns two sequences (a single long sequence should not cause starvation)', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
          params: {
            start: 'now-5m',
            end: 'now',
            kqlFilter: 'service.name: "starvation-service"',
            maxSequences: 10,
          },
        });

        const { sequences } = results[0].data;

        expect(sequences.length).to.be(2);

        const traceIds = sequences.map((s) => s.correlation.value).sort();
        expect(traceIds).to.eql(['trace-A', 'trace-B']);
      });
    });
  });
}
