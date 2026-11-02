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
  generateLogCategoriesData,
  DEFAULT_ERROR_SERVICES,
  DEFAULT_LOG_EXCEPTION_SERVICES,
} from '@kbn/synthtrace';
import { OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { GetLogGroupsToolResult } from '@kbn/observability-agent-builder-plugin/server/tools/get_log_groups/tool';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import type { SynthtraceProvider } from '../../../services/synthtrace';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

const SERVICE_NAME = 'payment-service';
const START = 'now-15m';
const END = 'now';
let WINDOW_START_TIMESTAMP: number;
let WINDOW_END_TIMESTAMP: number;

// Helper functions to filter groups by type from the flat array
interface LogGroup {
  type: string;
  sample: Record<string, unknown>;
  [key: string]: unknown;
}
const getSpanExceptionGroups = (groups: LogGroup[]) =>
  groups.filter((g) => g.type === 'spanException');
const getLogExceptionGroups = (groups: LogGroup[]) =>
  groups.filter((g) => g.type === 'logException');
const getNonExceptionLogGroups = (groups: LogGroup[]) => groups.filter((g) => g.type === 'log');

async function setupSynthtraceData(synthtrace: ReturnType<typeof SynthtraceProvider>) {
  const apmEsClient = await synthtrace.createApmSynthtraceEsClient();
  const logsEsClient = synthtrace.createLogsSynthtraceEsClient();
  await apmEsClient.clean();
  await logsEsClient.clean();

  WINDOW_START_TIMESTAMP = datemath.parse(START)!.valueOf();
  WINDOW_END_TIMESTAMP = datemath.parse(END)!.valueOf();
  const range = timerange(START, END);

  // Generate an old error group for firstSeen testing
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

  // Generate APM error data (spanExceptionGroups)
  const { client: apmClient, generator: apmGenerator } = generateErrorGroupsData({
    range,
    apmEsClient,
    services: DEFAULT_ERROR_SERVICES,
  });

  await apmClient.index(apmGenerator);

  // Generate OTel log exception data (logExceptionGroups)
  const { client: logExceptionsClient, generator: logExceptionsGenerator } =
    generateLogExceptionGroupsData({
      range,
      logsEsClient,
      services: DEFAULT_LOG_EXCEPTION_SERVICES,
    });

  await logExceptionsClient.index(logExceptionsGenerator);

  // Generate regular log data (nonExceptionLogGroups)
  const { client: logCategoriesClient, generator: logCategoriesGenerator } =
    generateLogCategoriesData({
      range,
      logsEsClient,
      serviceName: SERVICE_NAME,
      serviceEnvironment: 'production',
    });

  await logCategoriesClient.index(logCategoriesGenerator);

  return { apmEsClient, logsEsClient };
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID}`, function () {
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

    it('returns all three data categories with expected structure', async () => {
      const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
        id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
        params: { start: START, end: END },
      });

      const data = results[0].data;

      // Verify structure - now returns a flat array with type discriminator
      expect(data).to.have.property('groups');
      expect(data.groups).to.be.an('array');

      const spanExceptionGroups = getSpanExceptionGroups(data.groups);
      const logExceptionGroups = getLogExceptionGroups(data.groups);
      const nonExceptionLogGroups = getNonExceptionLogGroups(data.groups);

      // Should have application exception groups (from APM)
      expect(spanExceptionGroups.length).to.be.greaterThan(0);

      for (const group of spanExceptionGroups) {
        expect(group.type).to.be('spanException');
        expect(group.count).to.be.greaterThan(0);
        expect(group.lastSeen).to.be.a('string');

        const sample = group.sample;
        expect(sample['error.grouping_key']).to.be.a('string');
        expect(sample['service.name']).to.be.a('string');
      }

      // Should have log exception groups (from OTel logs)
      expect(logExceptionGroups.length).to.be.greaterThan(0);

      for (const group of logExceptionGroups) {
        expect(group.type).to.be('logException');
        expect(group.count).to.be.greaterThan(0);
        expect(group.pattern).to.be.a('string');
        expect(group.lastSeen).to.be.a('string');

        const sample = group.sample;
        expect(sample['service.name']).to.be.a('string');
      }

      // Should have non-exception log groups
      expect(nonExceptionLogGroups.length).to.be.greaterThan(0);

      for (const category of nonExceptionLogGroups) {
        expect(category.type).to.be('log');
        expect(category).to.have.property('pattern');
        expect(category).to.have.property('count');
        expect(category.count).to.be.greaterThan(0);
        const sample = category.sample;
        expect(sample).to.have.property('message');
        expect(sample).to.have.property('@timestamp');
      }
    });

    describe('spanExceptionGroups', () => {
      describe('when filtering by service.name', () => {
        it('returns only error groups from the specified service', async () => {
          const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
            id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'service.name: "payment-service"',
            },
          });

          const spanExceptionGroups = getSpanExceptionGroups(results[0].data.groups);

          expect(spanExceptionGroups).to.have.length(2);

          for (const group of spanExceptionGroups) {
            const sample = group.sample;
            expect(sample['service.name']).to.be('payment-service');
          }
        });
      });

      describe('when filtering by error.exception.type', () => {
        it('returns only error groups with the specified exception type', async () => {
          const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
            id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'error.exception.type: "TimeoutException"',
            },
          });

          const spanExceptionGroups = getSpanExceptionGroups(results[0].data.groups);

          expect(spanExceptionGroups).to.have.length(1);

          const sample = spanExceptionGroups[0].sample;
          expect(sample['error.exception.type']).to.be('TimeoutException');
        });
      });

      describe('when fetching with includeFirstSeen', () => {
        it('includes firstSeen for each group', async () => {
          const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
            id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
            params: {
              start: START,
              end: END,
              includeFirstSeen: true,
            },
          });

          const spanExceptionGroups = getSpanExceptionGroups(results[0].data.groups);

          expect(spanExceptionGroups.length).to.be.greaterThan(0);

          for (const group of spanExceptionGroups) {
            expect(group).to.have.property('firstSeen');
            expect(group.firstSeen).to.be.a('string');
          }
        });

        it('returns "over 7 days ago" for errors that existed before the lookback window', async () => {
          const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
            id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
            params: {
              start: START,
              end: END,
              includeFirstSeen: true,
            },
          });

          const spanExceptionGroups = getSpanExceptionGroups(results[0].data.groups);

          const oldGroup = spanExceptionGroups.find((group) => {
            const sample = group.sample;
            return sample['error.exception.message'] === 'Cannot invoke method on null object';
          });

          expect(oldGroup!.firstSeen).to.be('over 7 days ago');
        });

        it('returns an ISO timestamp for errors that first appeared within the lookback window', async () => {
          const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
            id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
            params: {
              start: START,
              end: END,
              includeFirstSeen: true,
            },
          });

          const spanExceptionGroups = getSpanExceptionGroups(results[0].data.groups);

          const newGroup = spanExceptionGroups.find((group) => {
            const sample = group.sample;
            return sample['error.exception.type'] === 'ValidationException';
          });

          const firstSeenTime = new Date(newGroup!.firstSeen as string).getTime();
          expect(firstSeenTime).to.be.within(WINDOW_START_TIMESTAMP, WINDOW_END_TIMESTAMP);
        });
      });

      describe('when fetching with includeStackTrace', () => {
        it('includes error.stack_trace string for errors that have it', async () => {
          const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
            id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
            params: {
              start: START,
              end: END,
              includeStackTrace: true,
            },
          });

          const spanExceptionGroups = getSpanExceptionGroups(results[0].data.groups);

          // NullPointerException in payment-service has a stacktrace defined
          const groupWithStackTrace = spanExceptionGroups.find((group) => {
            const sample = group.sample;
            return sample['error.exception.type'] === 'NullPointerException';
          });

          const sample = groupWithStackTrace!.sample;

          // error.stack_trace is a string (OTel/ECS compliant)
          const stackTrace = sample['error.stack_trace'] as string;
          expect(stackTrace).to.be.a('string');
          expect(stackTrace).to.contain('processPayment');
          expect(stackTrace).to.contain('PaymentProcessor.java');
        });

        it('does not include error.stack_trace when includeStackTrace is false', async () => {
          const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
            id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
            params: {
              start: START,
              end: END,
              includeStackTrace: false,
            },
          });

          const spanExceptionGroups = getSpanExceptionGroups(results[0].data.groups);

          const groupWithStackTrace = spanExceptionGroups.find((group) => {
            const sample = group.sample;
            return sample['error.exception.type'] === 'NullPointerException';
          });

          const sample = groupWithStackTrace!.sample;
          expect(sample['error.stack_trace']).to.be(undefined);
        });
      });
    });

    describe('logExceptionGroups', () => {
      it('returns log exception groups with expected structure', async () => {
        const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
          id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
          params: { start: START, end: END },
        });

        const logExceptionGroups = getLogExceptionGroups(results[0].data.groups);

        expect(logExceptionGroups.length).to.be.greaterThan(0);

        for (const group of logExceptionGroups) {
          expect(group.count).to.be.greaterThan(0);
          expect(group.pattern).to.be.a('string');
          expect(group.lastSeen).to.be.a('string');

          const sample = group.sample;
          expect(sample['service.name']).to.be.a('string');
        }
      });

      it('includes exception.type in samples', async () => {
        const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
          id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
          params: { start: START, end: END },
        });

        const logExceptionGroups = getLogExceptionGroups(results[0].data.groups);

        const smtpGroup = logExceptionGroups.find((group) => {
          const sample = group.sample;
          return sample['error.exception.type'] === 'SmtpConnectionException';
        });

        expect(smtpGroup).to.not.be(undefined);
        const sample = smtpGroup!.sample;
        expect(sample['service.name']).to.be('notification-service');
      });

      describe('with includeStackTrace', () => {
        it('includes stack trace for groups that have it', async () => {
          const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
            id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
            params: {
              start: START,
              end: END,
              includeStackTrace: true,
            },
          });

          const logExceptionGroups = getLogExceptionGroups(results[0].data.groups);

          const groupWithStackTrace = logExceptionGroups.find((group) => {
            const sample = group.sample;
            return sample['error.exception.type'] === 'SmtpConnectionException';
          });

          expect(groupWithStackTrace).to.not.be(undefined);
          const sample = groupWithStackTrace!.sample;

          const stackTrace = sample['error.stack_trace'] as string;
          expect(stackTrace).to.be.a('string');
          expect(stackTrace).to.contain('SmtpClient.connect');
        });
      });

      describe('when filtering by service.name', () => {
        it('returns only log exception groups from the specified service', async () => {
          const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
            id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
            params: {
              start: START,
              end: END,
              kqlFilter: 'service.name: "analytics-service"',
            },
          });

          const logExceptionGroups = getLogExceptionGroups(results[0].data.groups);

          expect(logExceptionGroups.length).to.be.greaterThan(0);

          for (const group of logExceptionGroups) {
            const sample = group.sample;
            expect(sample['service.name']).to.be('analytics-service');
          }
        });
      });
    });

    describe('nonExceptionLogGroups', () => {
      it('categorizes multiple unique log messages into single patterns', async () => {
        const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
          id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: `service.name:"${SERVICE_NAME}"`,
          },
        });

        const nonExceptionLogGroups = getNonExceptionLogGroups(results[0].data.groups);

        // Find the debug log category (should have 600 unique messages categorized)
        const debugCategory = nonExceptionLogGroups.find((cat) =>
          (cat.pattern as string).includes('Debug Payment API called with request_id')
        );
        expect(debugCategory).to.not.be(undefined);
        expect(debugCategory!.count).to.be.greaterThan(500);

        // Find the order processing category (should have 150 unique messages categorized)
        const orderCategory = nonExceptionLogGroups.find((cat) =>
          (cat.pattern as string).includes('Processing payment transaction for order')
        );
        expect(orderCategory).to.not.be(undefined);
        expect(orderCategory!.count).to.be.greaterThan(100);

        // Each category should have required fields
        nonExceptionLogGroups.forEach((category) => {
          expect(category).to.have.property('pattern');
          expect(category).to.have.property('count');
          expect(category.count).to.be.greaterThan(0);

          // Sample should include core fields
          const sample = category.sample;
          expect(sample).to.have.property('message');
          expect(sample).to.have.property('@timestamp');
        });
      });

      it('excludes log exceptions from regular log categories', async () => {
        const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
          id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            fields: ['error.exception.type'],
          },
        });

        const nonExceptionLogGroups = getNonExceptionLogGroups(results[0].data.groups);

        // Verify that none of the nonExceptionLogGroups have error.exception.type
        for (const category of nonExceptionLogGroups) {
          const sample = category.sample;
          expect(sample['error.exception.type']).to.be(undefined);
        }
      });
    });

    describe('combined filtering across all categories', () => {
      it('filters all three data sources when using kqlFilter', async () => {
        const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
          id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: 'service.name: "payment-service"',
            fields: ['service.name'],
          },
        });

        const spanExceptionGroups = getSpanExceptionGroups(results[0].data.groups);
        const logExceptionGroups = getLogExceptionGroups(results[0].data.groups);
        const nonExceptionLogGroups = getNonExceptionLogGroups(results[0].data.groups);

        // Application exceptions should be filtered
        for (const group of spanExceptionGroups) {
          const sample = group.sample;
          expect(sample['service.name']).to.be('payment-service');
        }

        for (const group of logExceptionGroups) {
          const sample = group.sample;
          expect(sample['service.name']).to.be('payment-service');
        }

        // Non-exception logs should be filtered
        for (const group of nonExceptionLogGroups) {
          const sample = group.sample;
          expect(sample['service.name']).to.be('payment-service');
        }
      });
    });

    it('works without kqlFilter', async () => {
      const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
        id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
        params: {
          start: START,
          end: END,
        },
      });

      expect(results.length).to.be(1);
      const { groups } = results[0].data;

      const spanExceptionGroups = getSpanExceptionGroups(groups);
      const logExceptionGroups = getLogExceptionGroups(groups);
      const nonExceptionLogGroups = getNonExceptionLogGroups(groups);

      expect(spanExceptionGroups.length).to.be.greaterThan(0);
      expect(logExceptionGroups.length).to.be.greaterThan(0);
      expect(nonExceptionLogGroups.length).to.be.greaterThan(0);
    });

    describe('fields parameter', () => {
      it('includes additional fields in log samples when specified', async () => {
        const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
          id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            fields: ['service.name', 'service.environment'],
          },
        });

        const logExceptionGroups = getLogExceptionGroups(results[0].data.groups);
        const nonExceptionLogGroups = getNonExceptionLogGroups(results[0].data.groups);

        // Verify logExceptionGroups include the requested fields
        for (const group of logExceptionGroups) {
          const sample = group.sample;
          expect(sample).to.have.property('service.name');
          expect(sample).to.have.property('service.environment');
        }

        // Verify nonExceptionLogGroups include the requested fields
        for (const group of nonExceptionLogGroups) {
          const sample = group.sample;
          expect(sample).to.have.property('service.name');
          expect(sample).to.have.property('service.environment');
        }
      });
    });

    describe('limit parameter', () => {
      it('limits the total number of groups returned', async () => {
        const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
          id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            limit: 5,
          },
        });

        const { groups } = results[0].data;

        // Total groups should be limited to size
        expect(groups.length).to.be(5);
      });

      it('prioritizes span exceptions over log exceptions over regular logs', async () => {
        const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
          id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            limit: 4,
          },
        });

        const { groups } = results[0].data;

        expect(groups.every((group) => group.type === 'spanException')).to.be(true);
      });

      it('returns more groups when limit is larger', async () => {
        const smallLimitResults = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
          id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            limit: 3,
          },
        });

        const largeLimitResults = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
          id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            limit: 15,
          },
        });

        expect(largeLimitResults[0].data.groups.length).to.be.greaterThan(
          smallLimitResults[0].data.groups.length
        );
      });
    });
  });
}
