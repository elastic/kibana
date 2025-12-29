/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ApmSynthtraceEsClient, LogsSynthtraceEsClient } from '@kbn/synthtrace';
import type { OtherResult } from '@kbn/agent-builder-common';
import { OBSERVABILITY_GET_SERVICES_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';
import { createSyntheticApmData } from '../utils/synthtrace_scenarios/create_synthetic_apm_data';
import { createSyntheticLogsWithService } from '../utils/synthtrace_scenarios/create_synthetic_logs_data';

// APM-only services
const APM_SERVICE_1 = 'apm-only-service';
const APM_SERVICE_2 = 'apm-only-service-2';

// Log-only services
const LOG_SERVICE_1 = 'log-only-service';
const LOG_SERVICE_2 = 'log-only-service-2';

// Service that exists in both APM and logs
const SHARED_SERVICE = 'shared-service';

const PRODUCTION_ENVIRONMENT = 'production';
const STAGING_ENVIRONMENT = 'staging';
const START = 'now-15m';
const END = 'now';

interface ServiceResult {
  serviceName: string;
  environments?: string[];
  sources: string[];
  healthStatus?: string;
  latency?: number;
  throughput?: number;
  transactionErrorRate?: number;
}

interface GetServicesToolResult extends OtherResult {
  data: {
    services: ServiceResult[];
    maxCountExceeded: boolean;
    serviceOverflowCount: number;
  };
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');

  let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
  let apmSynthtraceEsClient: ApmSynthtraceEsClient;
  let logsSynthtraceEsClient: LogsSynthtraceEsClient;

  describe(`tool: ${OBSERVABILITY_GET_SERVICES_TOOL_ID}`, function () {
    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);
    });

    describe('response structure', () => {
      before(async () => {
        ({ apmSynthtraceEsClient } = await createSyntheticApmData({
          getService,
          serviceName: APM_SERVICE_1,
          environment: PRODUCTION_ENVIRONMENT,
          language: 'nodejs',
        }));
      });

      after(async () => {
        await apmSynthtraceEsClient.clean();
      });

      it('returns the correct tool results structure', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: { start: START, end: END },
        });

        expect(Array.isArray(results)).to.be(true);
        expect(results.length).to.be(1);

        const toolResult = results[0];
        expect(toolResult).to.have.property('type');
        expect(toolResult).to.have.property('data');

        const { data } = toolResult;
        expect(data).to.have.property('services');
        expect(data).to.have.property('maxCountExceeded');
        expect(data).to.have.property('serviceOverflowCount');
      });

      it('each service has required fields including sources', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: { start: START, end: END },
        });

        const { data } = results[0];
        const services = data.services;

        expect(services.length).to.be.greaterThan(0);

        for (const service of services) {
          expect(service).to.have.property('serviceName');
          expect(service).to.have.property('sources');
          expect(Array.isArray(service.sources)).to.be(true);
          expect(service.sources.length).to.be.greaterThan(0);
        }
      });
    });

    describe('service sources', () => {
      before(async () => {
        ({ apmSynthtraceEsClient } = await createSyntheticApmData({
          getService,
          serviceName: [APM_SERVICE_1, APM_SERVICE_2, SHARED_SERVICE],
          environment: PRODUCTION_ENVIRONMENT,
          language: 'nodejs',
        }));

        ({ logsSynthtraceEsClient } = await createSyntheticLogsWithService({
          getService,
          services: [
            { name: LOG_SERVICE_1, environment: PRODUCTION_ENVIRONMENT },
            { name: LOG_SERVICE_2, environment: PRODUCTION_ENVIRONMENT },
            { name: SHARED_SERVICE, environment: PRODUCTION_ENVIRONMENT },
          ],
        }));
      });

      after(async () => {
        await apmSynthtraceEsClient.clean();
        await logsSynthtraceEsClient.clean();
      });

      it('returns all services from all sources', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: { start: START, end: END },
        });

        const { data } = results[0];
        const services = data.services;
        const serviceNames = services.map((s) => s.serviceName);

        expect(serviceNames).to.contain(APM_SERVICE_1);
        expect(serviceNames).to.contain(APM_SERVICE_2);
        expect(serviceNames).to.contain(LOG_SERVICE_1);
        expect(serviceNames).to.contain(LOG_SERVICE_2);
        expect(serviceNames).to.contain(SHARED_SERVICE);
      });

      it('returns APM-only services with the source "apm"', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: { start: START, end: END },
        });

        expect(results.length).to.be(1);
        const { data } = results[0];
        const services = data.services;

        const apmOnlyService = services.find((s) => s.serviceName === APM_SERVICE_1);
        expect(apmOnlyService).to.be.ok();
        expect(apmOnlyService!.sources).to.eql(['apm']);

        const apmOnlyService2 = services.find((s) => s.serviceName === APM_SERVICE_2);
        expect(apmOnlyService2).to.be.ok();
        expect(apmOnlyService2!.sources).to.eql(['apm']);
      });

      it('returns log-only services with the source "logs"', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: { start: START, end: END },
        });

        const { data } = results[0];
        const services = data.services;

        const logOnlyService = services.find((s) => s.serviceName === LOG_SERVICE_1);
        expect(logOnlyService).to.be.ok();
        expect(logOnlyService!.sources).to.eql(['logs']);

        const logOnlyService2 = services.find((s) => s.serviceName === LOG_SERVICE_2);
        expect(logOnlyService2).to.be.ok();
        expect(logOnlyService2!.sources).to.eql(['logs']);
      });

      it('returns services in both APM and logs with the sources "apm" and "logs"', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: { start: START, end: END },
        });

        const { data } = results[0];
        const services = data.services;

        const sharedService = services.find((s) => s.serviceName === SHARED_SERVICE);
        expect(sharedService).to.be.ok();
        expect(sharedService!.sources).to.contain('apm');
        expect(sharedService!.sources).to.contain('logs');
      });

      it('returns APM services with health metrics', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: { start: START, end: END },
        });

        const { data } = results[0];
        const services = data.services;

        const apmService = services.find((s) => s.serviceName === APM_SERVICE_1);
        expect(apmService).to.be.ok();
        expect(apmService).to.have.property('latency');
        expect(apmService).to.have.property('throughput');
        expect(apmService).to.have.property('transactionErrorRate');
      });
    });

    describe('filtering by health status', () => {
      before(async () => {
        ({ apmSynthtraceEsClient } = await createSyntheticApmData({
          getService,
          serviceName: [APM_SERVICE_1],
          environment: PRODUCTION_ENVIRONMENT,
          language: 'nodejs',
        }));

        ({ logsSynthtraceEsClient } = await createSyntheticLogsWithService({
          getService,
          services: [{ name: LOG_SERVICE_1, environment: PRODUCTION_ENVIRONMENT }],
        }));
      });

      after(async () => {
        await apmSynthtraceEsClient.clean();
        await logsSynthtraceEsClient.clean();
      });

      it('excludes log-only services when filtering by healthStatus', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: {
            start: START,
            end: END,
            healthStatus: ['healthy', 'warning', 'critical', 'unknown'],
          },
        });

        const { data } = results[0];
        const services = data.services;
        const serviceNames = services.map((s) => s.serviceName);

        expect(serviceNames).to.contain(APM_SERVICE_1);
        expect(serviceNames).to.not.contain(LOG_SERVICE_1);
      });
    });

    describe('filtering by environment', () => {
      before(async () => {
        ({ apmSynthtraceEsClient } = await createSyntheticApmData({
          getService,
          serviceName: APM_SERVICE_1,
          environment: PRODUCTION_ENVIRONMENT,
          language: 'nodejs',
        }));

        ({ logsSynthtraceEsClient } = await createSyntheticLogsWithService({
          getService,
          services: [
            { name: LOG_SERVICE_1, environment: PRODUCTION_ENVIRONMENT },
            { name: LOG_SERVICE_2, environment: STAGING_ENVIRONMENT },
          ],
        }));
      });

      after(async () => {
        await apmSynthtraceEsClient.clean();
        await logsSynthtraceEsClient.clean();
      });

      it('filters services by environment across all sources', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: {
            start: START,
            end: END,
            environment: PRODUCTION_ENVIRONMENT,
          },
        });

        const { data } = results[0];
        const services = data.services;
        const serviceNames = services.map((s) => s.serviceName);

        expect(serviceNames).to.contain(APM_SERVICE_1);
        expect(serviceNames).to.contain(LOG_SERVICE_1);
        expect(serviceNames).to.not.contain(LOG_SERVICE_2);
      });

      it('filters by staging environment', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: {
            start: START,
            end: END,
            environment: STAGING_ENVIRONMENT,
          },
        });

        const { data } = results[0];
        const services = data.services;
        const serviceNames = services.map((s) => s.serviceName);

        expect(serviceNames).to.contain(LOG_SERVICE_2);
        expect(serviceNames).to.not.contain(APM_SERVICE_1);
        expect(serviceNames).to.not.contain(LOG_SERVICE_1);
      });
    });
  });
}
