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
  createLogSequence,
  type CorrelatedLogEvent,
} from '@kbn/synthtrace';
import { OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { GetCorrelatedLogsToolResult } from '@kbn/observability-agent-builder-plugin/server/tools/get_correlated_logs/types';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

interface Log {
  message?: string;
  'log.level'?: string;
  'service.name'?: string;
}

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
      // await logsSynthtraceEsClient.clean();
    });

    describe('with single error and `trace.id` as correlation ID', () => {
      before(async () => {
        await indexCorrelatedLogs({
          logsEsClient: logsSynthtraceEsClient,
          logs: createLogSequence({
            service: 'payment-service',
            correlation: { 'trace.id': 'trace-123' },
            logs: [
              { 'log.level': 'info', message: 'Starting payment processing' },
              { 'log.level': 'debug', message: 'Validating payment details' },
              { 'log.level': 'error', message: 'Payment gateway timeout' },
              { 'log.level': 'warn', message: 'Retrying payment' },
              { 'log.level': 'info', message: 'Payment completed' },
            ],
          }),
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
        await indexCorrelatedLogs({
          logsEsClient: logsSynthtraceEsClient,
          logs: createLogSequence({
            service: 'checkout-service',
            correlation: { 'request.id': 'req-456' },
            logs: [
              { 'log.level': 'info', message: 'Request started' },
              { 'log.level': 'error', message: 'Database connection failed' },
              { 'log.level': 'error', message: 'Rollback failed' },
              { 'log.level': 'warn', message: 'Request aborted' },
            ],
          }),
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
        const errorLogs = group.logs.filter(
          (log: Log) => log['log.level']?.toUpperCase() === 'ERROR'
        );
        expect(errorLogs.length).to.be(2);

        const messages = errorLogs.map((log: Log) => log.message);
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
              'log.level': 'info',
              message: 'Payment flow started',
              'service.name': 'multi-service',
              'trace.id': 'trace-payment',
            },
            {
              'log.level': 'error',
              message: 'Payment error',
              'service.name': 'multi-service',
              'trace.id': 'trace-payment',
            },

            {
              'log.level': 'info',
              message: 'Refund flow started',
              'service.name': 'multi-service',
              'transaction.id': 'txn-refund',
            },
            {
              'log.level': 'error',
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

        // Find payment group by message content
        const paymentGroup = sequences.find((group) =>
          group.logs.some((log: Log) => log.message === 'Payment error')
        );
        expect(paymentGroup).to.not.be(undefined);
        expect(paymentGroup!.correlation.field).to.be('trace.id');
        expect(paymentGroup!.correlation.value).to.be('trace-payment');

        // Find refund group by message content
        const refundGroup = sequences.find((group) =>
          group.logs.some((log: Log) => log.message === 'Refund error')
        );
        expect(refundGroup).to.not.be(undefined);
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
              'log.level': 'info',
              message: 'Uncorrelated info',
              'service.name': 'no-correlation-service',
            },
            {
              'log.level': 'error',
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
              'log.level': 'error',
              message: 'Error in service A',
              'service.name': 'service-a',
              'trace.id': 'trace-a',
            },

            {
              'log.level': 'error',
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
      // Tests that errors are detected via alternative severity formats only (not log.level)
      // Each describe block ingests logs with only a single severity format

      // Syslog severity: 0=Emergency, 1=Alert, 2=Critical, 3=Error, 4=Warning, 5=Notice, 6=Info, 7=Debug
      describe('syslog.severity', () => {
        before(async () => {
          await indexCorrelatedLogs({
            logsEsClient: logsSynthtraceEsClient,
            logs: createLogSequence({
              service: 'syslog-service',
              correlation: { 'trace.id': 'syslog-trace' },
              logs: [
                { message: 'Syslog request started', 'syslog.severity': 6 }, // info
                { message: 'Syslog error occurred', 'syslog.severity': 3 }, // error
              ],
            }),
          });
        });

        it('detects errors using syslog.severity (≤4)', async () => {
          const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
            id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
            params: {
              start: 'now-10m',
              end: 'now',
              kqlFilter: 'service.name: "syslog-service"',
            },
          });

          const { sequences } = results[0].data;
          expect(sequences.length).to.be(1);
          expect(sequences[0].logs.length).to.be(2);
        });
      });

      // OpenTelemetry SeverityNumber: 1-4=Trace, 5-8=Debug, 9-12=Info, 13-16=Warn, 17-20=Error, 21-24=Fatal
      describe('OpenTelemetry SeverityNumber', () => {
        before(async () => {
          await indexCorrelatedLogs({
            logsEsClient: logsSynthtraceEsClient,
            logs: createLogSequence({
              service: 'otel-service',
              correlation: { 'request.id': 'otel-req' },
              logs: [
                { message: 'OpenTelemetry request started', SeverityNumber: 9 }, // info
                { message: 'OpenTelemetry error occurred', SeverityNumber: 17 }, // error
              ],
            }),
          });
        });

        it('detects errors using SeverityNumber (≥13)', async () => {
          const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
            id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
            params: {
              start: 'now-10m',
              end: 'now',
              kqlFilter: 'service.name: "otel-service"',
            },
          });

          const { sequences } = results[0].data;
          expect(sequences.length).to.be(1);
          expect(sequences[0].logs.length).to.be(2);
        });
      });

      // HTTP status codes: 2xx=Success, 4xx=Client error, 5xx=Server error
      describe('HTTP status codes', () => {
        before(async () => {
          await indexCorrelatedLogs({
            logsEsClient: logsSynthtraceEsClient,
            logs: createLogSequence({
              service: 'http-service',
              correlation: { 'correlation.id': 'http-corr' },
              logs: [
                { message: 'HTTP request started', 'http.response.status_code': 200 }, // success
                { message: 'HTTP error occurred', 'http.response.status_code': 500 }, // server error
              ],
            }),
          });
        });

        it('detects errors using http.response.status_code (≥500)', async () => {
          const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
            id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
            params: {
              start: 'now-10m',
              end: 'now',
              kqlFilter: 'service.name: "http-service"',
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
            { 'log.level': 'info', message: 'Request with multiple IDs started', ...shared },
            { 'log.level': 'error', message: 'Error with multiple correlation IDs', ...shared },
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

        // Verify trace.id is used as the correlation field (highest priority)
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
              'log.level': 'severe',
              message: 'Java severe error',
              'service.name': 'java-service',
              'trace.id': 'java-trace',
            },
            {
              'log.level': 'warning',
              message: 'System warning',
              'service.name': 'system-service',
              'request.id': 'system-req',
            },
            {
              'log.level': 'warn',
              message: 'Application warn',
              'service.name': 'app-service',
              'transaction.id': 'app-txn',
            },
          ],
        });
      });

      [
        { service: 'java-service', 'log.level': 'SEVERE', message: 'Java severe error' },
        { service: 'system-service', 'log.level': 'WARNING', message: 'System warning' },
        { service: 'app-service', 'log.level': 'WARN', message: 'Application warn' },
      ].forEach(({ service, 'log.level': logLevel, message }) => {
        it(`detects errors using ${logLevel} level`, async () => {
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
              'log.level': 'info',
              message: 'Session started',
              'service.name': 'session-service',
              'session.id': 'session-abc-123',
            },
            {
              'log.level': 'error',
              message: 'Session error',
              'service.name': 'session-service',
              'session.id': 'session-abc-123',
            },

            // http.request.id
            {
              'log.level': 'info',
              message: 'HTTP request received',
              'service.name': 'http-server',
              'http.request.id': 'http-req-456',
            },
            {
              'log.level': 'error',
              message: 'HTTP processing error',
              'service.name': 'http-server',
              'http.request.id': 'http-req-456',
            },

            // event.id
            {
              'log.level': 'info',
              message: 'Event processing started',
              'service.name': 'event-processor',
              'event.id': 'evt-789',
            },
            {
              'log.level': 'error',
              message: 'Event processing failed',
              'service.name': 'event-processor',
              'event.id': 'evt-789',
            },

            // cloud.trace_id
            {
              'log.level': 'info',
              message: 'Cloud trace started',
              'service.name': 'cloud-service',
              'cloud.trace_id': 'cloud-trace-xyz',
            },
            {
              'log.level': 'info',
              message: 'Cloud trace still running',
              'service.name': 'cloud-service',
              'cloud.trace_id': 'cloud-trace-xyz',
            },
            {
              'log.level': 'error',
              message: 'Cloud operation failed',
              'service.name': 'cloud-service',
              'cloud.trace_id': 'cloud-trace-xyz',
            },

            // no correlation ID
            {
              'log.level': 'info',
              message: 'Starting',
              'service.name': 'no-corr-id-service',
            },
            {
              'log.level': 'error',
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
              'log.level': 'info',
              message: 'Log for ID lookup',
              'service.name': 'id-service',
              'trace.id': 'trace-id-target',
            },
            {
              'log.level': 'error',
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
              'log.level': 'info',
              message: 'Log with fields',
              'service.name': 'fields-service',
              'trace.id': 'trace-fields',
            },
            {
              'log.level': 'error',
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
            'service.name': 'fields-service',
          },
          {
            message: 'Error with fields',
            'service.name': 'fields-service',
          },
        ]);
      });
    });

    describe('with errorLogsOnly=false', () => {
      // Tests that ANY log can be an anchor when errorLogsOnly is false
      // Useful for investigating slow requests or specific events that aren't errors

      before(async () => {
        await indexCorrelatedLogs({
          logsEsClient: logsSynthtraceEsClient,
          logs: createLogSequence({
            service: 'non-error-anchor-service',
            correlation: { 'trace.id': 'trace-non-error' },
            logs: [
              { 'log.level': 'info', message: 'Request started' },
              { 'log.level': 'info', message: 'Slow database query' },
              { 'log.level': 'info', message: 'Request completed' },
            ],
          }),
        });
      });

      it('returns sequences when anchoring on non-error logs', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            kqlFilter: 'service.name: "non-error-anchor-service"',
            errorLogsOnly: false,
          },
        });

        const { sequences } = results[0].data;
        expect(sequences.length).to.be(1);
        expect(sequences[0].logs.length).to.be(3);

        const messages = sequences[0].logs.map((log) => log.message);
        expect(messages).to.eql(['Request started', 'Slow database query', 'Request completed']);
      });

      it('returns empty when errorLogsOnly=true (default) and no errors exist', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            kqlFilter: 'service.name: "non-error-anchor-service"',
            // errorLogsOnly defaults to true
          },
        });

        const { sequences, message } = results[0].data;
        expect(sequences.length).to.be(0);
        expect(message).to.contain('No log sequences found');
      });
    });

    describe('with custom correlationFields', () => {
      // Tests that user-specified correlation fields work
      // Useful when logs use non-standard correlation identifiers

      before(async () => {
        await indexCorrelatedLogs({
          logsEsClient: logsSynthtraceEsClient,
          logs: createLogSequence({
            service: 'custom-correlation-service',
            correlation: { order_id: 'ORD-12345' },
            logs: [
              { 'log.level': 'info', message: 'Order created' },
              { 'log.level': 'info', message: 'Payment processing' },
              { 'log.level': 'error', message: 'Order fulfillment failed' },
            ],
          }),
        });
      });

      it('correlates logs using custom field (order_id)', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            kqlFilter: 'service.name: "custom-correlation-service"',
            correlationFields: ['order_id'],
          },
        });

        const { sequences } = results[0].data;
        expect(sequences.length).to.be(1);
        expect(sequences[0].correlation.field).to.be('order_id');
        expect(sequences[0].correlation.value).to.be('ORD-12345');
        expect(sequences[0].logs.length).to.be(3);

        const messages = sequences[0].logs.map((log) => log.message);
        expect(messages).to.eql([
          'Order created',
          'Payment processing',
          'Order fulfillment failed',
        ]);
      });

      it('returns empty when custom field is not in default correlationFields', async () => {
        // Without specifying correlationFields, order_id won't be recognized
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            kqlFilter: 'service.name: "custom-correlation-service"',
            // correlationFields not specified, so order_id won't be used
          },
        });

        const { sequences, message } = results[0].data;
        expect(sequences.length).to.be(0);
        expect(message).to.contain('No log sequences found');
      });
    });

    describe('with limit parameters', () => {
      describe('maxSequences', () => {
        before(async () => {
          const logs = times(5, (i) => ({
            'log.level': 'error',
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
              'log.level': 'info',
              message: `Log ${i}`,
              'service.name': 'limit-logs-service',
              'trace.id': 'trace-limit-logs',
              '@timestamp': Date.now() - (20 - i) * 1000,
            })),

            // anchor
            {
              'log.level': 'error',
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
            'log.level': 'error',
            message: `Error A ${i}`,
            'service.name': 'starvation-service',
            'trace.id': 'trace-A',
            '@timestamp': Date.now() - i * 1000, // 0s to 59s ago
          })),
          // Trace B: 1 error (older)
          {
            'log.level': 'error',
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
