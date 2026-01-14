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
  generateServicesData,
  type ServiceConfig,
} from '@kbn/synthtrace';
import type { OtherResult } from '@kbn/onechat-common';
import { OBSERVABILITY_GET_SERVICES_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

const SERVICE_NAME = 'service-a';
const SERVICE_NAME_2 = 'service-b';
const SERVICE_NAME_3 = 'service-c';
const ENVIRONMENT = 'production';
const ENVIRONMENT_2 = 'staging';
const START = 'now-15m';
const END = 'now';

interface GetServicesToolResult extends OtherResult {
  data: {
    services: Array<Record<string, unknown>>;
  };
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_SERVICES_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);

      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      await apmSynthtraceEsClient.clean();

      const testServices: ServiceConfig[] = [
        {
          name: SERVICE_NAME,
          environment: ENVIRONMENT,
          agentName: 'nodejs',
          transactionName: 'GET /api',
          transactionType: 'request',
          duration: 50,
          errorRate: 1,
        },
        {
          name: SERVICE_NAME_2,
          environment: ENVIRONMENT,
          agentName: 'nodejs',
          transactionName: 'GET /api',
          transactionType: 'request',
          duration: 50,
          errorRate: 1,
        },
      ];

      const range = timerange(START, END);
      const { client, generator } = generateServicesData({
        range,
        apmEsClient: apmSynthtraceEsClient,
        services: testServices,
      });

      await client.index(generator);
    });

    after(async () => {
      await apmSynthtraceEsClient.clean();
    });

    describe('when fetching services', () => {
      let resultData: GetServicesToolResult['data'];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: {
            start: START,
            end: END,
          },
        });

        expect(results).to.have.length(1);
        resultData = results[0].data;
      });

      it('returns the correct tool results structure', () => {
        expect(resultData).to.have.property('services');
        expect(Array.isArray(resultData.services)).to.be(true);
      });

      it('returns all available services for the given time range', () => {
        const services = resultData.services;

        expect(services.length).to.be(2);

        const hasServiceA = services.some((service) => service.serviceName === SERVICE_NAME);
        expect(hasServiceA).to.be(true);

        const hasServiceB = services.some((service) => service.serviceName === SERVICE_NAME_2);
        expect(hasServiceB).to.be(true);
      });
    });

    describe('when filtering by environment', () => {
      before(async () => {
        const stagingServices: ServiceConfig[] = [
          {
            name: SERVICE_NAME_3,
            environment: ENVIRONMENT_2,
            agentName: 'nodejs',
            transactionName: 'GET /api',
            transactionType: 'request',
            duration: 50,
            errorRate: 1,
          },
        ];

        const range = timerange(START, END);
        const { client, generator } = generateServicesData({
          range,
          apmEsClient: apmSynthtraceEsClient,
          services: stagingServices,
        });

        await client.index(generator);
      });

      it('returns only services for the filtered environment', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: {
            start: START,
            end: END,
            environment: ENVIRONMENT_2,
          },
        });

        expect(results).to.have.length(1);
        const services = results[0].data.services;

        expect(Array.isArray(services)).to.be(true);
        expect(services.length).to.be(1);
        expect(services[0].serviceName).to.be(SERVICE_NAME_3);
      });
    });
  });
}
