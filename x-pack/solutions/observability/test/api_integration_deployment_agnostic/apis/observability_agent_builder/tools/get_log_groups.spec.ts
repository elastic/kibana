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

  // Generate APM error data (applicationExceptionGroups)
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

      // Verify structure
      expect(data).to.have.property('applicationExceptionGroups');
      expect(data).to.have.property('logExceptionGroups');
      expect(data).to.have.property('nonExceptionLogGroups');

      const { applicationExceptionGroups, logExceptionGroups, nonExceptionLogGroups } = data;

      // Should have application exception groups (from APM)
      expect(applicationExceptionGroups).to.be.an('array');
      expect(applicationExceptionGroups.length).to.be.greaterThan(0);

      for (const group of applicationExceptionGroups) {
        expect(group.count).to.be.greaterThan(0);
        expect(group.lastSeen).to.be.a('string');

        const sample = group.sample;
        expect(sample['error.grouping_key']).to.be.a('string');
        expect(sample['service.name']).to.be.a('string');
      }

      // Should have log exception groups (from OTel logs)
      expect(logExceptionGroups).to.be.an('array');
      expect(logExceptionGroups.length).to.be.greaterThan(0);

      for (const group of logExceptionGroups) {
        expect(group.count).to.be.greaterThan(0);
        expect(group.pattern).to.be.a('string');
        expect(group.lastSeen).to.be.a('string');

        const sample = group.sample;
        expect(sample['service.name']).to.be.a('string');
      }

      // Should have non-exception log groups
      expect(nonExceptionLogGroups).to.be.an('array');
      expect(nonExceptionLogGroups.length).to.be.greaterThan(0);

      for (const category of nonExceptionLogGroups) {
        expect(category).to.have.property('pattern');
        expect(category).to.have.property('count');
        expect(category.count).to.be.greaterThan(0);
        expect(category.sample).to.have.property('message');
        expect(category.sample).to.have.property('@timestamp');
      }
    });

    describe('applicationExceptionGroups', () => {
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

          const { applicationExceptionGroups } = results[0].data;

          expect(applicationExceptionGroups).to.have.length(2);

          for (const group of applicationExceptionGroups) {
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

          const { applicationExceptionGroups } = results[0].data;

          expect(applicationExceptionGroups).to.have.length(1);

          const sample = applicationExceptionGroups[0].sample;
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

          const { applicationExceptionGroups } = results[0].data;

          expect(applicationExceptionGroups.length).to.be.greaterThan(0);

          for (const group of applicationExceptionGroups) {
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

          const { applicationExceptionGroups } = results[0].data;

          const oldGroup = applicationExceptionGroups.find((group) => {
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

          const { applicationExceptionGroups } = results[0].data;

          const newGroup = applicationExceptionGroups.find((group) => {
            const sample = group.sample;
            return sample['error.exception.type'] === 'ValidationException';
          });

          const firstSeenTime = new Date(newGroup!.firstSeen!).getTime();
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

          const { applicationExceptionGroups } = results[0].data;

          // NullPointerException in payment-service has a stacktrace defined
          const groupWithStackTrace = applicationExceptionGroups.find((group) => {
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

          const { applicationExceptionGroups } = results[0].data;

          const groupWithStackTrace = applicationExceptionGroups.find((group) => {
            const sample = group.sample;
            return sample['error.exception.type'] === 'NullPointerException';
          });

          const sample = groupWithStackTrace!.sample;
          expect(sample['error.stack_trace']).to.be(undefined);
        });
      });

      describe('downstreamServiceResource', () => {
        it('includes downstreamServiceResource for errors during downstream calls', async () => {
          const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
            id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
            params: { start: START, end: END },
          });

          const { applicationExceptionGroups } = results[0].data;

          // TimeoutException in payment-service has a downstream dependency
          const groupWithDownstream = applicationExceptionGroups.find((group) => {
            const sample = group.sample;
            return sample['error.exception.type'] === 'TimeoutException';
          });

          expect(groupWithDownstream).to.not.be(undefined);
          expect(groupWithDownstream!.downstreamServiceResource).to.be('payment-gateway-api');
        });

        it('does not include downstreamServiceResource for errors without downstream calls', async () => {
          const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
            id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
            params: { start: START, end: END },
          });

          const { applicationExceptionGroups } = results[0].data;

          // NullPointerException has no downstream dependency
          const groupWithoutDownstream = applicationExceptionGroups.find((group) => {
            const sample = group.sample;
            return sample['error.exception.type'] === 'NullPointerException';
          });

          expect(groupWithoutDownstream).to.not.be(undefined);
          expect(groupWithoutDownstream!.downstreamServiceResource).to.be(undefined);
        });
      });
    });

    describe('logExceptionGroups', () => {
      it('returns log exception groups with expected structure', async () => {
        const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
          id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
          params: { start: START, end: END },
        });

        const { logExceptionGroups } = results[0].data;

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

        const { logExceptionGroups } = results[0].data;

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

          const { logExceptionGroups } = results[0].data;

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

          const { logExceptionGroups } = results[0].data;

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

        const { nonExceptionLogGroups } = results[0].data;

        // Find the debug log category (should have 600 unique messages categorized)
        const debugCategory = nonExceptionLogGroups.find((cat) =>
          cat.pattern.includes('Debug Payment API called with request_id')
        );
        expect(debugCategory).to.not.be(undefined);
        expect(debugCategory!.count).to.be.greaterThan(500);

        // Find the order processing category (should have 150 unique messages categorized)
        const orderCategory = nonExceptionLogGroups.find((cat) =>
          cat.pattern.includes('Processing payment transaction for order')
        );
        expect(orderCategory).to.not.be(undefined);
        expect(orderCategory!.count).to.be.greaterThan(100);

        // Each category should have required fields
        nonExceptionLogGroups.forEach((category) => {
          expect(category).to.have.property('pattern');
          expect(category).to.have.property('count');
          expect(category.count).to.be.greaterThan(0);

          // Sample should include core fields
          expect(category.sample).to.have.property('message');
          expect(category.sample).to.have.property('@timestamp');
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

        const { nonExceptionLogGroups } = results[0].data;

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

        const { applicationExceptionGroups, logExceptionGroups, nonExceptionLogGroups } =
          results[0].data;

        // Application exceptions should be filtered
        for (const group of applicationExceptionGroups) {
          expect(group.sample['service.name']).to.be('payment-service');
        }

        for (const group of logExceptionGroups) {
          expect(group.sample['service.name']).to.be('payment-service');
        }

        // Non-exception logs should be filtered
        for (const group of nonExceptionLogGroups) {
          expect(group.sample['service.name']).to.be('payment-service');
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
      const data = results[0].data;
      expect(data.applicationExceptionGroups.length).to.be.greaterThan(0);
      expect(data.logExceptionGroups.length).to.be.greaterThan(0);
      expect(data.nonExceptionLogGroups.length).to.be.greaterThan(0);
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

        const { logExceptionGroups, nonExceptionLogGroups } = results[0].data;

        // Verify logExceptionGroups include the requested fields
        for (const group of logExceptionGroups) {
          const { sample } = group;
          expect(sample).to.have.property('service.name');
          expect(sample).to.have.property('service.environment');
        }

        // Verify nonExceptionLogGroups include the requested fields
        for (const group of nonExceptionLogGroups) {
          const { sample } = group;
          expect(sample).to.have.property('service.name');
          expect(sample).to.have.property('service.environment');
        }
      });
    });

    describe('size parameter', () => {
      it('limits the number of groups returned', async () => {
        const results = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
          id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            size: 2,
          },
        });

        const { applicationExceptionGroups, logExceptionGroups, nonExceptionLogGroups } =
          results[0].data;

        // Each category should have at most 2 groups
        expect(applicationExceptionGroups.length).to.be.lessThan(3);
        expect(logExceptionGroups.length).to.be.lessThan(3);
        // nonExceptionLogGroups may have up to 4 (2 high severity + 2 low severity)
        expect(nonExceptionLogGroups.length).to.be.lessThan(5);
      });

      it('returns more groups when size is larger', async () => {
        const smallSizeResults = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
          id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            size: 1,
          },
        });

        const largeSizeResults = await agentBuilderApiClient.executeTool<GetLogGroupsToolResult>({
          id: OBSERVABILITY_GET_LOG_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            size: 10,
          },
        });

        const smallData = smallSizeResults[0].data;
        const largeData = largeSizeResults[0].data;

        // Larger size should return at least as many (likely more) groups
        expect(largeData.applicationExceptionGroups.length).to.be.greaterThan(
          smallData.applicationExceptionGroups.length
        );
      });
    });
  });
}
