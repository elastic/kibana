/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import expect from '@kbn/expect';
import { timerange } from '@kbn/synthtrace-client';
import {
  type ApmSynthtraceEsClient,
  type LogsSynthtraceEsClient,
  generateErrorGroupsData,
  generateLogExceptionGroupsData,
  DEFAULT_ERROR_SERVICES,
  DEFAULT_LOG_EXCEPTION_SERVICES,
} from '@kbn/synthtrace';
import type { OtherResult } from '@kbn/agent-builder-common';
import { OBSERVABILITY_GET_EXCEPTIONS_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools/get_exceptions/tool';
import type { ErrorGroup } from '@kbn/observability-agent-builder-plugin/server/tools/get_exceptions/handler';
import type { LogExceptionGroup } from '@kbn/observability-agent-builder-plugin/server/tools/get_exceptions/get_otel_log_exceptions';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import type { SynthtraceProvider } from '../../../services/synthtrace';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

interface GetErrorGroupsToolResult extends OtherResult {
  data: {
    errorGroups: ErrorGroup[];
    logExceptionGroups: LogExceptionGroup[];
  };
}

const START = 'now-15m';
const END = 'now';
let WINDOW_START: number;
let WINDOW_END: number;

async function setupSynthtraceData(synthtrace: ReturnType<typeof SynthtraceProvider>) {
  const apmEsClient = await synthtrace.createApmSynthtraceEsClient();
  const logsEsClient = synthtrace.createLogsSynthtraceEsClient();
  await apmEsClient.clean();
  await logsEsClient.clean();

  WINDOW_START = datemath.parse(START)!.valueOf();
  WINDOW_END = datemath.parse(END)!.valueOf();

  // generate an old error group
  const historicalRange = timerange('now-15d', 'now-15d+5m');
  const { client: historicalClient, generator: historicalGenerator } = generateErrorGroupsData({
    range: historicalRange,
    apmEsClient,
    services: [
      {
        ...DEFAULT_ERROR_SERVICES[0],
        errors: [{ ...DEFAULT_ERROR_SERVICES[0].errors[0], rate: 1 }],
      },
    ],
  });

  await historicalClient.index(historicalGenerator);

  const range = timerange(START, END);

  // Generate APM error data
  const { client: apmClient, generator: apmGenerator } = generateErrorGroupsData({
    range,
    apmEsClient,
    services: DEFAULT_ERROR_SERVICES,
  });

  await apmClient.index(apmGenerator);

  // Generate OTel log exception data
  const { client: logsClient, generator: logsGenerator } = generateLogExceptionGroupsData({
    range,
    logsEsClient,
    services: DEFAULT_LOG_EXCEPTION_SERVICES,
  });

  await logsClient.index(logsGenerator);

  return { apmEsClient, logsEsClient };
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_EXCEPTIONS_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    let logsSynthtraceEsClient: LogsSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);
      const clients = await setupSynthtraceData(synthtrace);
      apmSynthtraceEsClient = clients.apmEsClient;
      logsSynthtraceEsClient = clients.logsEsClient;
    });

    after(async () => {
      await apmSynthtraceEsClient.clean();
      await logsSynthtraceEsClient.clean();
    });

    it('returns error groups with expected structure', async () => {
      const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
        id: OBSERVABILITY_GET_EXCEPTIONS_TOOL_ID,
        params: { start: START, end: END },
      });

      expect(results).to.have.length(1);
      const { errorGroups, logExceptionGroups } = results[0].data;

      // Should have error groups
      expect(errorGroups.length).to.be(4);

      for (const group of errorGroups) {
        expect(group.count).to.be.greaterThan(0);
        expect(group.lastSeen).to.be.a('string');

        const sample = group.sample as Record<string, unknown>;
        expect(sample['error.grouping_key']).to.be.a('string');
        expect(sample['service.name']).to.be.a('string');
      }

      // logExceptionGroups should be an array (may be empty if no log exception data)
      expect(logExceptionGroups).to.be.an('array');
    });

    describe('when filtering by service.name', () => {
      let errorGroups: ErrorGroup[];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_EXCEPTIONS_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: 'service.name: "payment-service"',
          },
        });

        expect(results).to.have.length(1);
        errorGroups = results[0].data.errorGroups;
      });

      it('returns only error groups from payment-service', () => {
        expect(errorGroups).to.have.length(2);
      });

      it('all returned groups belong to payment-service', () => {
        for (const group of errorGroups) {
          const sample = group.sample as Record<string, unknown>;
          expect(sample['service.name']).to.be('payment-service');
        }
      });
    });

    describe('when filtering by error.exception.type', () => {
      let errorGroups: ErrorGroup[];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_EXCEPTIONS_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: 'error.exception.type: "TimeoutException"',
          },
        });

        expect(results).to.have.length(1);
        errorGroups = results[0].data.errorGroups;
      });

      it('returns only error groups with TimeoutException', () => {
        expect(errorGroups).to.have.length(1);
      });

      it('returned group has the correct exception type', () => {
        const sample = errorGroups[0].sample as Record<string, unknown>;
        expect(sample['error.exception.type']).to.be('TimeoutException');
      });
    });

    describe('when fetching error groups with includeFirstSeen', () => {
      let errorGroups: ErrorGroup[];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_EXCEPTIONS_TOOL_ID,
          params: {
            start: START,
            end: END,
            includeFirstSeen: true,
          },
        });

        expect(results).to.have.length(1);
        errorGroups = results[0].data.errorGroups;
      });

      it('returns all error groups', () => {
        expect(errorGroups).to.have.length(4);
      });

      it('includes firstSeen for each group', () => {
        for (const group of errorGroups) {
          expect(group).to.have.property('firstSeen');
          expect(group.firstSeen).to.be.a('string');
        }
      });

      it('returns "over 7 days ago" for errors that existed before the lookback window', () => {
        const oldGroup = errorGroups.find((group) => {
          const sample = group.sample as Record<string, unknown>;
          return sample['error.exception.message'] === 'Cannot invoke method on null object';
        });

        expect(oldGroup!.firstSeen).to.be('over 7 days ago');
      });

      it('returns an ISO timestamp for errors that first appeared within the lookback window', () => {
        const newGroup = errorGroups.find((group) => {
          const sample = group.sample as Record<string, unknown>;
          return sample['error.exception.type'] === 'ValidationException';
        });

        const firstSeenTime = new Date(newGroup!.firstSeen!).getTime();
        expect(firstSeenTime).to.be.greaterThan(WINDOW_START);
        expect(firstSeenTime).to.be.lessThan(WINDOW_END);
      });
    });

    describe('when fetching error groups with includeStackTrace', () => {
      let errorGroups: ErrorGroup[];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_EXCEPTIONS_TOOL_ID,
          params: {
            start: START,
            end: END,
            includeStackTrace: true,
          },
        });

        expect(results).to.have.length(1);
        errorGroups = results[0].data.errorGroups;
      });

      it('includes error.stack_trace string for errors that have it', () => {
        // NullPointerException in payment-service has a stacktrace defined
        const groupWithStackTrace = errorGroups.find((group) => {
          const sample = group.sample as Record<string, unknown>;
          return sample['error.exception.type'] === 'NullPointerException';
        });

        const sample = groupWithStackTrace!.sample as Record<string, unknown>;

        // error.stack_trace is a string (OTel/ECS compliant)
        const stackTrace = sample['error.stack_trace'] as string;
        expect(stackTrace).to.be.a('string');
        expect(stackTrace).to.contain('processPayment');
        expect(stackTrace).to.contain('PaymentProcessor.java');
      });

      it('does not include error.stack_trace for errors without includeStackTrace', async () => {
        // Fetch without includeStackTrace
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_EXCEPTIONS_TOOL_ID,
          params: {
            start: START,
            end: END,
            includeStackTrace: false,
          },
        });

        const groups = results[0].data.errorGroups;
        const groupWithStackTrace = groups.find((group) => {
          const sample = group.sample as Record<string, unknown>;
          return sample['error.exception.type'] === 'NullPointerException';
        });

        const sample = groupWithStackTrace!.sample as Record<string, unknown>;
        // Without includeStackTrace, error.stack_trace should not be present
        expect(sample['error.stack_trace']).to.be(undefined);
      });
    });

    describe('logExceptionGroups', () => {
      let logExceptionGroups: LogExceptionGroup[];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_EXCEPTIONS_TOOL_ID,
          params: { start: START, end: END },
        });

        expect(results).to.have.length(1);
        logExceptionGroups = results[0].data.logExceptionGroups;
      });

      it('returns log exception groups with expected structure', () => {
        // Should have log exception groups from OTel log data
        expect(logExceptionGroups.length).to.be.greaterThan(0);

        for (const group of logExceptionGroups) {
          expect(group.count).to.be.greaterThan(0);
          expect(group.pattern).to.be.a('string');
          expect(group.lastSeen).to.be.a('string');

          const sample = group.sample as Record<string, unknown>;
          expect(sample['service.name']).to.be.a('string');
        }
      });

      it('includes exception.type in samples', () => {
        // Find a group with a known exception type from our test data
        const smtpGroup = logExceptionGroups.find((group) => {
          const sample = group.sample as Record<string, unknown>;
          return sample['error.exception.type'] === 'SmtpConnectionException';
        });

        expect(smtpGroup).to.not.be(undefined);
        const sample = smtpGroup!.sample as Record<string, unknown>;
        expect(sample['service.name']).to.be('notification-service');
      });
    });

    describe('logExceptionGroups with includeStackTrace', () => {
      let logExceptionGroups: LogExceptionGroup[];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_EXCEPTIONS_TOOL_ID,
          params: {
            start: START,
            end: END,
            includeStackTrace: true,
          },
        });

        expect(results).to.have.length(1);
        logExceptionGroups = results[0].data.logExceptionGroups;
      });

      it('includes stack trace for groups that have it', () => {
        // SmtpConnectionException has a stacktrace defined
        const groupWithStackTrace = logExceptionGroups.find((group) => {
          const sample = group.sample as Record<string, unknown>;
          return sample['error.exception.type'] === 'SmtpConnectionException';
        });

        expect(groupWithStackTrace).to.not.be(undefined);
        const sample = groupWithStackTrace!.sample as Record<string, unknown>;

        const stackTrace = sample['error.stack_trace'] as string;
        expect(stackTrace).to.be.a('string');
        expect(stackTrace).to.contain('SmtpClient.connect');
      });
    });

    describe('logExceptionGroups when filtering by service.name', () => {
      let logExceptionGroups: LogExceptionGroup[];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_EXCEPTIONS_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: 'service.name: "analytics-service"',
          },
        });

        expect(results).to.have.length(1);
        logExceptionGroups = results[0].data.logExceptionGroups;
      });

      it('returns only log exception groups from analytics-service', () => {
        expect(logExceptionGroups.length).to.be.greaterThan(0);

        for (const group of logExceptionGroups) {
          const sample = group.sample as Record<string, unknown>;
          expect(sample['service.name']).to.be('analytics-service');
        }
      });
    });

    describe('downstreamServiceResource', () => {
      let errorGroups: ErrorGroup[];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_EXCEPTIONS_TOOL_ID,
          params: { start: START, end: END },
        });

        expect(results).to.have.length(1);
        errorGroups = results[0].data.errorGroups;
      });

      it('includes downstreamServiceResource for errors that occurred during downstream calls', () => {
        // TimeoutException in payment-service has a downstream dependency (payment-gateway-api)
        const groupWithDownstream = errorGroups.find((group) => {
          const sample = group.sample as Record<string, unknown>;
          return sample['error.exception.type'] === 'TimeoutException';
        });

        expect(groupWithDownstream).to.not.be(undefined);
        expect(groupWithDownstream!.downstreamServiceResource).to.be('payment-gateway-api');
      });

      it('does not include downstreamServiceResource for errors without downstream calls', () => {
        // NullPointerException in payment-service has no downstream dependency
        const groupWithoutDownstream = errorGroups.find((group) => {
          const sample = group.sample as Record<string, unknown>;
          return sample['error.exception.type'] === 'NullPointerException';
        });

        expect(groupWithoutDownstream).to.not.be(undefined);
        expect(groupWithoutDownstream!.downstreamServiceResource).to.be(undefined);
      });
    });
  });
}
