/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { timerange } from '@kbn/synthtrace-client';
import {
  type ApmSynthtraceEsClient,
  type LogsSynthtraceEsClient,
  generateErrorGroupsData,
} from '@kbn/synthtrace';
import { OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { GetErrorGroupsToolResult } from '@kbn/observability-agent-builder-plugin/server/tools/get_error_groups/tool';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

const APM_SERVICE_NAME = 'payment-service';
const OTEL_SERVICE_NAME = 'order-service';
const ENVIRONMENT = 'production';
const START = 'now-15m';
const END = 'now';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;
    let logsSynthtraceEsClient: LogsSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);

      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();

      await apmSynthtraceEsClient.clean();
      await logsSynthtraceEsClient.clean();

      const range = timerange(START, END);

      const { apm, logs } = generateErrorGroupsData({
        range,
        apmEsClient: apmSynthtraceEsClient,
        logsEsClient: logsSynthtraceEsClient,
        apmErrorConfigs: [
          {
            serviceName: APM_SERVICE_NAME,
            environment: ENVIRONMENT,
            language: 'java',
            errors: [
              {
                type: 'NullPointerException',
                message: "Cannot read property 'id' of null",
                rate: 5,
              },
              {
                type: 'TimeoutException',
                message: 'Connection timed out after 30s',
                rate: 3,
              },
            ],
          },
        ],
        otelExceptionConfigs: [
          {
            serviceName: OTEL_SERVICE_NAME,
            environment: ENVIRONMENT,
            hostName: 'order-host-01',
            exceptions: [
              {
                type: 'ValidationException',
                messages: ['Invalid order format', 'Missing required field: customerId'],
                rate: 4,
              },
              {
                type: 'DatabaseException',
                messages: ['Connection pool exhausted'],
                rate: 2,
              },
            ],
          },
        ],
      });

      // Index APM errors first (sequentially)
      for (const { client, generator } of apm) {
        await client.index(generator);
      }

      // Then index OTel exception logs
      await logs.client.index(logs.generator);

      // (Debug logging removed)
    });

    after(async () => {
      if (apmSynthtraceEsClient) {
        await apmSynthtraceEsClient.clean();
      }
      if (logsSynthtraceEsClient) {
        await logsSynthtraceEsClient.clean();
      }
    });

    describe('when fetching APM error groups', () => {
      it('returns APM error groups for a specific service', async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            serviceName: APM_SERVICE_NAME,
          },
        });

        expect(results).to.have.length(1);
        const data = results[0].data;

        expect(data.apmErrorGroups.total).to.be.greaterThan(0);
        expect(data.apmErrorGroups.groups).to.be.an('array');
        expect(data.apmErrorGroups.groups.length).to.be.greaterThan(0);

        const errorGroup = data.apmErrorGroups.groups[0];
        expect(errorGroup).to.have.property('groupId');
        expect(errorGroup).to.have.property('name');
        expect(errorGroup).to.have.property('occurrences');
        expect(errorGroup).to.have.property('lastSeen');
      });

      it('returns error groups with correct error types', async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            serviceName: APM_SERVICE_NAME,
          },
        });

        const data = results[0].data;
        const errorTypes = data.apmErrorGroups.groups.map((g) => g.type);

        expect(errorTypes).to.contain('NullPointerException');
        expect(errorTypes).to.contain('TimeoutException');
      });
    });

    describe('when fetching OTel exception groups', () => {
      it('returns OTel exception groups for a specific service', async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            serviceName: OTEL_SERVICE_NAME,
          },
        });

        expect(results).to.have.length(1);
        const data = results[0].data;

        expect(data.otelExceptionGroups.total).to.be.greaterThan(0);
        expect(data.otelExceptionGroups.groups).to.be.an('array');
        expect(data.otelExceptionGroups.groups.length).to.be.greaterThan(0);
      });

      it('groups OTel exceptions by type', async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            serviceName: OTEL_SERVICE_NAME,
          },
        });

        const data = results[0].data;

        const validationGroup = data.otelExceptionGroups.groups.find(
          (g) => g.exceptionType === 'ValidationException'
        );

        expect(validationGroup).to.be.ok();
        expect(validationGroup!.occurrences).to.be.greaterThan(0);
        expect(validationGroup).to.have.property('lastSeen');
        expect(validationGroup).to.have.property('sample');
      });

      it('returns correct exception types', async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            serviceName: OTEL_SERVICE_NAME,
          },
        });

        const data = results[0].data;
        const exceptionTypes = data.otelExceptionGroups.groups.map((g) => g.exceptionType);

        expect(exceptionTypes).to.contain('ValidationException');
        expect(exceptionTypes).to.contain('DatabaseException');
      });
    });

    describe('when fetching errors without service name', () => {
      it('returns only OTel exceptions (APM requires serviceName)', async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
          },
        });

        expect(results).to.have.length(1);
        const data = results[0].data;

        expect(data.apmErrorGroups.total).to.be(0);
        expect(data.apmErrorGroups.groups).to.have.length(0);

        expect(data.otelExceptionGroups.total).to.be.greaterThan(0);
      });
    });

    describe('when using kqlFilter parameter', () => {
      it('filters OTel exceptions by KQL query', async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: 'host.name: order-host-01',
          },
        });

        expect(results).to.have.length(1);
        const data = results[0].data;

        expect(data.otelExceptionGroups.total).to.be.greaterThan(0);
      });

      it('filters exceptions by exception type', async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: 'exception.type: ValidationException',
          },
        });

        expect(results).to.have.length(1);
        const data = results[0].data;

        expect(data.otelExceptionGroups.groups.length).to.be(1);
        expect(data.otelExceptionGroups.groups[0].exceptionType).to.be('ValidationException');
      });
    });

    describe('when using serviceEnvironment parameter', () => {
      it('filters by environment', async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            serviceName: APM_SERVICE_NAME,
            serviceEnvironment: ENVIRONMENT,
          },
        });

        expect(results).to.have.length(1);
        const data = results[0].data;

        expect(data.apmErrorGroups.total).to.be.greaterThan(0);
      });

      it('returns empty results for non-existent environment', async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            serviceName: APM_SERVICE_NAME,
            serviceEnvironment: 'non-existent-env',
          },
        });

        expect(results).to.have.length(1);
        const data = results[0].data;

        // Should have no results for non-existent environment
        expect(data.apmErrorGroups.total).to.be(0);
      });
    });

    describe('when combining filters', () => {
      it('filters by service name, environment, and KQL', async () => {
        const results = await agentBuilderApiClient.executeTool<GetErrorGroupsToolResult>({
          id: OBSERVABILITY_GET_ERROR_GROUPS_TOOL_ID,
          params: {
            start: START,
            end: END,
            serviceName: OTEL_SERVICE_NAME,
            serviceEnvironment: ENVIRONMENT,
            kqlFilter: 'exception.type: DatabaseException',
          },
        });

        expect(results).to.have.length(1);
        const data = results[0].data;

        // Should only have DatabaseException
        if (data.otelExceptionGroups.groups.length > 0) {
          expect(data.otelExceptionGroups.groups[0].exceptionType).to.be('DatabaseException');
        }
      });
    });
  });
}
