/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { LogsSynthtraceEsClient } from '@kbn/synthtrace';
import { OBSERVABILITY_GET_CORRELATED_ERROR_LOGS_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { GetCorrelatedErrorLogsToolResult } from '@kbn/observability-agent-builder-plugin/server/tools/get_correlated_error_logs/types';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';
import { createSyntheticLogsWithErrorsAndCorrelationIds } from '../utils/synthtrace_scenarios/create_synthetic_logs_with_errors_and_correlation_ids';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');

  describe(`tool: ${OBSERVABILITY_GET_CORRELATED_ERROR_LOGS_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let logsSynthtraceEsClient: LogsSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);
    });

    after(async () => {
      if (logsSynthtraceEsClient) {
        await logsSynthtraceEsClient.clean();
      }
    });

    describe('with single error and `trace.id` as correlation ID', () => {
      before(async () => {
        ({ logsSynthtraceEsClient } = await createSyntheticLogsWithErrorsAndCorrelationIds({
          getService,
          timerangeStart: 'now-10m',
          logGroups: [
            [
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
          ],
        }));
      });

      it('returns one log group with all logs', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedErrorLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_ERROR_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            terms: { 'service.name': 'payment-service' },
          },
        });

        const { correlatedLogs } = results[0].data;
        expect(correlatedLogs.length).to.be(1);
        expect(correlatedLogs[0].length).to.be(5);
      });

      it('includes the error log and surrounding logs', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedErrorLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_ERROR_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            terms: { 'service.name': 'payment-service' },
          },
        });

        const { correlatedLogs } = results[0].data;
        const messages = correlatedLogs[0].map((log) => log.message);

        expect(messages).to.eql([
          'Starting payment processing',
          'Validating payment details',
          'Payment gateway timeout',
          'Retrying payment',
          'Payment completed',
        ]);
      });

      it('does not return logs that do not match the specified terms', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedErrorLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_ERROR_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            terms: { 'service.name': 'non-existing-service' },
          },
        });

        const { correlatedLogs } = results[0].data;
        expect(correlatedLogs.length).to.be(0);
      });
    });

    describe('with multiple errors sharing the same correlation ID', () => {
      before(async () => {
        const sharedLogAttributes = {
          'service.name': 'checkout-service',
          'request.id': 'req-456',
        };

        ({ logsSynthtraceEsClient } = await createSyntheticLogsWithErrorsAndCorrelationIds({
          getService,
          timerangeStart: 'now-10m',
          logGroups: [
            [
              { level: 'info', message: 'Request started', ...sharedLogAttributes },
              { level: 'error', message: 'Database connection failed', ...sharedLogAttributes },
              { level: 'error', message: 'Rollback failed', ...sharedLogAttributes },
              { level: 'warn', message: 'Request aborted', ...sharedLogAttributes },
            ],
          ],
        }));
      });

      it('creates only one group for multiple errors with same correlation ID', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedErrorLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_ERROR_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            terms: { 'service.name': 'checkout-service' },
          },
        });

        const { correlatedLogs } = results[0].data;
        expect(correlatedLogs.length).to.be(1);
      });

      it('includes both error logs in the same group', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedErrorLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_ERROR_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            terms: { 'service.name': 'checkout-service' },
          },
        });

        const group = results[0].data.correlatedLogs[0];
        const errorLogs = group.filter((log: any) => log.log?.level === 'ERROR');
        expect(errorLogs.length).to.be(2);

        const messages = errorLogs.map((log: any) => log.message);
        expect(messages).to.contain('Database connection failed');
        expect(messages).to.contain('Rollback failed');
      });
    });

    describe('with multiple errors having different correlation IDs', () => {
      before(async () => {
        ({ logsSynthtraceEsClient } = await createSyntheticLogsWithErrorsAndCorrelationIds({
          getService,
          timerangeStart: 'now-10m',
          logGroups: [
            [
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
            ],
            [
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
          ],
        }));
      });

      it('creates separate groups for errors with different correlation IDs', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedErrorLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_ERROR_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            terms: { 'service.name': 'multi-service' },
          },
        });

        const { correlatedLogs } = results[0].data;
        expect(correlatedLogs.length).to.be(2);
      });

      it('groups logs correctly by their correlation ID', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedErrorLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_ERROR_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            terms: { 'service.name': 'multi-service' },
          },
        });

        const { correlatedLogs } = results[0].data;

        // Find payment group
        const paymentGroup = correlatedLogs.find((group) =>
          group.some((log: any) => log.message === 'Payment error')
        );
        expect(paymentGroup).to.not.be(undefined);
        expect(paymentGroup!.every((log: any) => log.trace?.id === 'trace-payment')).to.be(true);

        // Find refund group
        const refundGroup = correlatedLogs.find((group) =>
          group.some((log: any) => log.message === 'Refund error')
        );
        expect(refundGroup).to.not.be(undefined);
        expect(refundGroup!.every((log: any) => log.transaction?.id === 'txn-refund')).to.be(true);
      });
    });

    describe('with errors lacking correlation IDs', () => {
      before(async () => {
        ({ logsSynthtraceEsClient } = await createSyntheticLogsWithErrorsAndCorrelationIds({
          getService,
          timerangeStart: 'now-10m',
          logGroups: [
            [
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
              // No correlation ID fields
            ],
          ],
        }));
      });

      it('returns empty results when errors have no correlation IDs', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedErrorLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_ERROR_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            terms: { 'service.name': 'no-correlation-service' },
          },
        });

        const { correlatedLogs } = results[0].data;
        expect(correlatedLogs.length).to.be(0);
      });
    });

    describe('with terms filtering', () => {
      before(async () => {
        ({ logsSynthtraceEsClient } = await createSyntheticLogsWithErrorsAndCorrelationIds({
          getService,
          timerangeStart: 'now-10m',
          logGroups: [
            [
              {
                level: 'error',
                message: 'Error in service A',
                'service.name': 'service-a',
                'trace.id': 'trace-a',
              },
            ],
            [
              {
                level: 'error',
                message: 'Error in service B',
                'service.name': 'service-b',
                'trace.id': 'trace-b',
              },
            ],
          ],
        }));
      });

      it('filters logs by service name', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedErrorLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_ERROR_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            terms: { 'service.name': 'service-a' },
          },
        });

        const { correlatedLogs } = results[0].data;
        expect(correlatedLogs.length).to.be(1);
        expect(correlatedLogs[0][0]).to.have.property('message', 'Error in service A');
      });
    });

    describe('with alternative error severity formats', () => {
      before(async () => {
        ({ logsSynthtraceEsClient } = await createSyntheticLogsWithErrorsAndCorrelationIds({
          getService,
          timerangeStart: 'now-10m',
          logGroups: [
            [
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
            ],
            [
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
            ],
            [
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
          ],
        }));
      });

      [
        { service: 'syslog-service', format: 'syslog.severity (≤3)' },
        { service: 'otel-service', format: 'OpenTelemetry SeverityNumber (≥17)' },
        { service: 'http-service', format: 'HTTP status codes (≥500)' },
      ].forEach(({ service, format }) => {
        it(`detects errors using ${format}`, async () => {
          const results = await agentBuilderApiClient.executeTool<GetCorrelatedErrorLogsToolResult>(
            {
              id: OBSERVABILITY_GET_CORRELATED_ERROR_LOGS_TOOL_ID,
              params: {
                start: 'now-10m',
                end: 'now',
                terms: { 'service.name': service },
              },
            }
          );

          const { correlatedLogs } = results[0].data;
          expect(correlatedLogs.length).to.be(1);
          expect(correlatedLogs[0].length).to.be(2);
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
        ({ logsSynthtraceEsClient } = await createSyntheticLogsWithErrorsAndCorrelationIds({
          getService,
          timerangeStart: 'now-10m',
          logGroups: [
            [
              { level: 'info', message: 'Request with multiple IDs started', ...shared },
              { level: 'error', message: 'Error with multiple correlation IDs', ...shared },
            ],
          ],
        }));
      });

      it('uses trace.id when multiple correlation IDs are present (priority order)', async () => {
        const results = await agentBuilderApiClient.executeTool<GetCorrelatedErrorLogsToolResult>({
          id: OBSERVABILITY_GET_CORRELATED_ERROR_LOGS_TOOL_ID,
          params: {
            start: 'now-10m',
            end: 'now',
            terms: { 'service.name': 'priority-service' },
          },
        });

        const { correlatedLogs } = results[0].data;
        expect(correlatedLogs.length).to.be(1);

        // Verify all logs in the group have the same trace.id (highest priority)
        const allHaveTraceId = correlatedLogs[0].every(
          (log: any) => log.trace?.id === 'trace-priority-123'
        );
        expect(allHaveTraceId).to.be(true);

        expect(correlatedLogs[0].map((log) => log.message)).to.eql([
          'Request with multiple IDs started',
          'Error with multiple correlation IDs',
        ]);
      });
    });

    describe('with additional log severity levels (SEVERE, WARNING, WARN)', () => {
      before(async () => {
        ({ logsSynthtraceEsClient } = await createSyntheticLogsWithErrorsAndCorrelationIds({
          getService,
          timerangeStart: 'now-10m',
          logGroups: [
            [
              {
                level: 'severe',
                message: 'Java severe error',
                'service.name': 'java-service',
                'trace.id': 'java-trace',
              },
            ],
            [
              {
                level: 'warning',
                message: 'System warning',
                'service.name': 'system-service',
                'request.id': 'system-req',
              },
            ],
            [
              {
                level: 'warn',
                message: 'Application warn',
                'service.name': 'app-service',
                'transaction.id': 'app-txn',
              },
            ],
          ],
        }));
      });

      [
        { service: 'java-service', level: 'SEVERE', message: 'Java severe error' },
        { service: 'system-service', level: 'WARNING', message: 'System warning' },
        { service: 'app-service', level: 'WARN', message: 'Application warn' },
      ].forEach(({ service, level, message }) => {
        it(`detects errors using ${level} level`, async () => {
          const results = await agentBuilderApiClient.executeTool<GetCorrelatedErrorLogsToolResult>(
            {
              id: OBSERVABILITY_GET_CORRELATED_ERROR_LOGS_TOOL_ID,
              params: {
                start: 'now-10m',
                end: 'now',
                terms: { 'service.name': service },
              },
            }
          );

          const { correlatedLogs } = results[0].data;
          expect(correlatedLogs.length).to.be(1);
          expect(correlatedLogs[0][0]).to.have.property('message', message);
        });
      });
    });

    describe('with additional correlation identifiers', () => {
      before(async () => {
        ({ logsSynthtraceEsClient } = await createSyntheticLogsWithErrorsAndCorrelationIds({
          getService,
          timerangeStart: 'now-10m',
          logGroups: [
            [
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
            ],
            [
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
            ],
            [
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
            ],
            [
              {
                level: 'info',
                message: 'Cloud trace started',
                'service.name': 'cloud-service',
                'cloud.trace_id': 'cloud-trace-xyz',
              },
              {
                level: 'error',
                message: 'Cloud operation failed',
                'service.name': 'cloud-service',
                'cloud.trace_id': 'cloud-trace-xyz',
              },
            ],
          ],
        }));
      });

      [
        {
          field: 'session.id',
          service: 'session-service',
          messages: ['Session started', 'Session error'],
        },
        {
          field: 'http.request.id',
          service: 'http-server',
          messages: ['HTTP request received', 'HTTP processing error'],
        },
        {
          field: 'event.id',
          service: 'event-processor',
          messages: ['Event processing started', 'Event processing failed'],
        },
        {
          field: 'cloud.trace_id',
          service: 'cloud-service',
          messages: ['Cloud trace started', 'Cloud operation failed'],
        },
      ].forEach(({ field, service, messages }) => {
        it(`groups logs by ${field}`, async () => {
          const results = await agentBuilderApiClient.executeTool<GetCorrelatedErrorLogsToolResult>(
            {
              id: OBSERVABILITY_GET_CORRELATED_ERROR_LOGS_TOOL_ID,
              params: {
                start: 'now-10m',
                end: 'now',
                terms: { 'service.name': service },
              },
            }
          );

          const { correlatedLogs } = results[0].data;
          expect(correlatedLogs.length).to.be(1);
          expect(correlatedLogs[0].length).to.be(2);
          expect(correlatedLogs[0].map((log) => log.message)).to.eql(messages);
        });
      });
    });
  });
}
