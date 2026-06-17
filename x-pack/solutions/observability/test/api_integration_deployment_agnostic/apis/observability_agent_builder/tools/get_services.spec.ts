/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { apm, timerange } from '@kbn/synthtrace-client';
import {
  type ApmSynthtraceEsClient,
  type LogsSynthtraceEsClient,
  generateApmServicesData,
  generateLogsServicesData,
  type ApmServiceConfig,
  type LogsServiceConfig,
} from '@kbn/synthtrace';
import type { OtherResult } from '@kbn/agent-builder-common';
import { OBSERVABILITY_GET_SERVICES_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';
import { createAndRunApmMlJobs } from '../utils/create_and_run_apm_ml_jobs';

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
  anomalyScore?: number;
  anomalySeverity?: string;
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
  const synthtrace = getService('synthtrace');

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
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        await apmSynthtraceEsClient.clean();

        const testServices: ApmServiceConfig[] = [
          {
            name: APM_SERVICE_1,
            environment: PRODUCTION_ENVIRONMENT,
            agentName: 'nodejs',
            transactionName: 'GET /api',
            transactionType: 'request',
            duration: 50,
            errorRate: 0.1,
          },
        ];

        const range = timerange(START, END);
        const { client, generator } = generateApmServicesData({
          range,
          apmEsClient: apmSynthtraceEsClient,
          services: testServices,
        });

        await client.index(generator);
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

      it('each service has required fields', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: { start: START, end: END },
        });

        const { data } = results[0];
        const services = data.services;

        expect(services.length).to.be.greaterThan(0);

        for (const service of services) {
          expect(service).to.have.property('serviceName');
        }
      });
    });

    describe('services from multiple data sources', () => {
      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();
        await apmSynthtraceEsClient.clean();
        await logsSynthtraceEsClient.clean();

        // Generate APM services
        const apmServices: ApmServiceConfig[] = [
          {
            name: APM_SERVICE_1,
            environment: PRODUCTION_ENVIRONMENT,
            agentName: 'nodejs',
            transactionName: 'GET /api',
            transactionType: 'request',
            duration: 50,
            errorRate: 0.1,
          },
          {
            name: APM_SERVICE_2,
            environment: PRODUCTION_ENVIRONMENT,
            agentName: 'nodejs',
            transactionName: 'GET /api',
            transactionType: 'request',
            duration: 50,
            errorRate: 0.1,
          },
          {
            name: SHARED_SERVICE,
            environment: PRODUCTION_ENVIRONMENT,
            agentName: 'nodejs',
            transactionName: 'GET /api',
            transactionType: 'request',
            duration: 50,
            errorRate: 0.1,
          },
        ];

        const range = timerange(START, END);
        const { client: apmClient, generator: apmGenerator } = generateApmServicesData({
          range,
          apmEsClient: apmSynthtraceEsClient,
          services: apmServices,
        });

        await apmClient.index(apmGenerator);

        // Generate logs services
        const logsServices: LogsServiceConfig[] = [
          { name: LOG_SERVICE_1, environment: PRODUCTION_ENVIRONMENT },
          { name: LOG_SERVICE_2, environment: PRODUCTION_ENVIRONMENT },
          { name: SHARED_SERVICE, environment: PRODUCTION_ENVIRONMENT },
        ];

        const { client: logsClient, generator: logsGenerator } = generateLogsServicesData({
          range,
          logsEsClient: logsSynthtraceEsClient,
          services: logsServices,
        });

        await logsClient.index(logsGenerator);
      });

      after(async () => {
        await apmSynthtraceEsClient.clean();
        await logsSynthtraceEsClient.clean();
      });

      it('returns services from APM, logs, and shared services', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: { start: START, end: END },
        });

        const { data } = results[0];
        const services = data.services;
        const serviceNames = services.map((s) => s.serviceName);

        // APM services
        expect(serviceNames).to.contain(APM_SERVICE_1);
        expect(serviceNames).to.contain(APM_SERVICE_2);

        // Log-only services
        expect(serviceNames).to.contain(LOG_SERVICE_1);
        expect(serviceNames).to.contain(LOG_SERVICE_2);

        // Service that exists in both APM and logs
        expect(serviceNames).to.contain(SHARED_SERVICE);
      });

      it('returns APM services with performance metrics', async () => {
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

      it('returns log-only services with basic information', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: { start: START, end: END },
        });

        const { data } = results[0];
        const services = data.services;

        const logOnlyService = services.find((s) => s.serviceName === LOG_SERVICE_1);
        expect(logOnlyService).to.be.ok();
        expect(logOnlyService).to.have.property('serviceName');

        // Log-only services don't have APM metrics
        expect(logOnlyService).to.not.have.property('latency');
        expect(logOnlyService).to.not.have.property('throughput');
      });
    });

    describe('filtering by anomaly severity', () => {
      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();
        await apmSynthtraceEsClient.clean();
        await logsSynthtraceEsClient.clean();

        const apmServices: ApmServiceConfig[] = [
          {
            name: APM_SERVICE_1,
            environment: PRODUCTION_ENVIRONMENT,
            agentName: 'nodejs',
            transactionName: 'GET /api',
            transactionType: 'request',
            duration: 50,
            errorRate: 0.1,
          },
        ];

        const range = timerange(START, END);
        const { client: apmClient, generator: apmGenerator } = generateApmServicesData({
          range,
          apmEsClient: apmSynthtraceEsClient,
          services: apmServices,
        });

        await apmClient.index(apmGenerator);

        const logsServices: LogsServiceConfig[] = [
          { name: LOG_SERVICE_1, environment: PRODUCTION_ENVIRONMENT },
        ];

        const { client: logsClient, generator: logsGenerator } = generateLogsServicesData({
          range,
          logsEsClient: logsSynthtraceEsClient,
          services: logsServices,
        });

        await logsClient.index(logsGenerator);
      });

      after(async () => {
        await apmSynthtraceEsClient.clean();
        await logsSynthtraceEsClient.clean();
      });

      it('excludes log-only services when filtering by anomalySeverities', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: {
            start: START,
            end: END,
            anomalySeverities: ['unknown'],
          },
        });

        const { data } = results[0];
        const services = data.services;
        const serviceNames = services.map((s) => s.serviceName);

        expect(serviceNames).to.contain(APM_SERVICE_1);
        expect(serviceNames).to.not.contain(LOG_SERVICE_1);
      });
    });

    describe('filtering by anomalySeverities with anomaly data', function () {
      // ML lookback job + cleanup is slow
      this.timeout(300_000);

      const ANOMALOUS_SERVICE = 'anomalous-checkout';
      const HEALTHY_SERVICE = 'healthy-cart';
      const ML_TEST_ENVIRONMENT = 'production-anomaly-test';

      const rangeStart = moment().subtract(2, 'days').valueOf();
      const rangeEnd = moment().valueOf();
      const spikeStart = moment().subtract(2, 'hours').valueOf();
      const spikeEnd = moment().subtract(1, 'hour').valueOf();
      const TEST_START_ISO = new Date(rangeStart).toISOString();
      const TEST_END_ISO = new Date(rangeEnd).toISOString();

      let anomalousServiceSeverity: string;

      before(async () => {
        const ml = getService('ml');
        const es = getService('es');
        const log = getService('log');

        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        await Promise.all([apmSynthtraceEsClient.clean(), ml.api.cleanMlIndices()]);
        await ml.api.deleteAllAnomalyDetectionJobs();

        const anomalousService = apm
          .service({
            name: ANOMALOUS_SERVICE,
            environment: ML_TEST_ENVIRONMENT,
            agentName: 'java',
          })
          .instance('a');
        const healthyService = apm
          .service({
            name: HEALTHY_SERVICE,
            environment: ML_TEST_ENVIRONMENT,
            agentName: 'nodejs',
          })
          .instance('b');

        const events = timerange(rangeStart, rangeEnd)
          .interval('1m')
          .rate(1)
          .generator((timestamp) => {
            const isInSpike = timestamp >= spikeStart && timestamp < spikeEnd;
            return [
              anomalousService
                .transaction({ transactionName: 'GET /checkout' })
                .timestamp(timestamp)
                .duration(isInSpike ? 5000 : 100)
                .outcome(isInSpike ? 'failure' : 'success'),
              healthyService
                .transaction({ transactionName: 'GET /cart' })
                .timestamp(timestamp)
                .duration(100)
                .outcome('success'),
            ];
          });

        await apmSynthtraceEsClient.index(events);

        await createAndRunApmMlJobs({
          es,
          ml: ml.api,
          environments: [ML_TEST_ENVIRONMENT],
          logger: log,
        });

        // Capture ML's assigned severity for the anomalous service so the filter
        // assertions don't hard-code a band (ML scoring varies run-to-run).
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: { start: TEST_START_ISO, end: TEST_END_ISO },
        });
        const anomalousResult = results[0].data.services.find(
          (s) => s.serviceName === ANOMALOUS_SERVICE
        );
        anomalousServiceSeverity = anomalousResult?.anomalySeverity ?? 'unknown';
      });

      after(async () => {
        const ml = getService('ml');
        await Promise.all([apmSynthtraceEsClient.clean(), ml.api.cleanMlIndices()]);
        await ml.api.deleteAllAnomalyDetectionJobs();
      });

      it('returns anomalyScore and anomalySeverity on the anomalous APM service', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: { start: TEST_START_ISO, end: TEST_END_ISO },
        });
        const anomalousService = results[0].data.services.find(
          (s) => s.serviceName === ANOMALOUS_SERVICE
        );

        expect(anomalousService).to.be.ok();
        expect(anomalousService).to.have.property('anomalyScore');
        expect(anomalousService).to.have.property('anomalySeverity');
      });

      it('assigns a non-low severity to the anomalous service', () => {
        expect(['warning', 'minor', 'major', 'critical']).to.contain(anomalousServiceSeverity);
      });

      it('filters services by anomalySeverity', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: {
            start: TEST_START_ISO,
            end: TEST_END_ISO,
            anomalySeverities: [anomalousServiceSeverity],
          },
        });
        const serviceNames = results[0].data.services.map((s) => s.serviceName);

        expect(serviceNames).to.contain(ANOMALOUS_SERVICE);
        expect(serviceNames).to.not.contain(HEALTHY_SERVICE);
      });

      it('emits anomalySeverity on every APM service (no field absence)', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: { start: TEST_START_ISO, end: TEST_END_ISO },
        });
        const apmServices = results[0].data.services.filter((s) => s.latency !== undefined);

        expect(apmServices.length).to.be.greaterThan(0);
        for (const service of apmServices) {
          expect(service).to.have.property('anomalySeverity');
          expect(['critical', 'major', 'minor', 'warning', 'low', 'unknown']).to.contain(
            service.anomalySeverity
          );
        }
      });
    });

    describe('filtering by environment', () => {
      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();
        await apmSynthtraceEsClient.clean();
        await logsSynthtraceEsClient.clean();

        const apmServices: ApmServiceConfig[] = [
          {
            name: APM_SERVICE_1,
            environment: PRODUCTION_ENVIRONMENT,
            agentName: 'nodejs',
            transactionName: 'GET /api',
            transactionType: 'request',
            duration: 50,
            errorRate: 0.1,
          },
        ];

        const range = timerange(START, END);
        const { client: apmClient, generator: apmGenerator } = generateApmServicesData({
          range,
          apmEsClient: apmSynthtraceEsClient,
          services: apmServices,
        });

        await apmClient.index(apmGenerator);

        const logsServices: LogsServiceConfig[] = [
          { name: LOG_SERVICE_1, environment: PRODUCTION_ENVIRONMENT },
          { name: LOG_SERVICE_2, environment: STAGING_ENVIRONMENT },
        ];

        const { client: logsClient, generator: logsGenerator } = generateLogsServicesData({
          range,
          logsEsClient: logsSynthtraceEsClient,
          services: logsServices,
        });

        await logsClient.index(logsGenerator);
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
            kqlFilter: `service.environment: "${PRODUCTION_ENVIRONMENT}"`,
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
            kqlFilter: `service.environment: "${STAGING_ENVIRONMENT}"`,
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

    describe('filtering by kqlFilter', () => {
      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        await apmSynthtraceEsClient.clean();

        const apmServices: ApmServiceConfig[] = [
          {
            name: APM_SERVICE_1,
            environment: PRODUCTION_ENVIRONMENT,
            agentName: 'nodejs',
            transactionName: 'GET /api',
            transactionType: 'request',
            duration: 50,
            errorRate: 0.1,
          },
          {
            name: APM_SERVICE_2,
            environment: PRODUCTION_ENVIRONMENT,
            agentName: 'python',
            transactionName: 'GET /api',
            transactionType: 'request',
            duration: 100,
            errorRate: 0.2,
          },
        ];

        const range = timerange(START, END);
        const { client: apmClient, generator: apmGenerator } = generateApmServicesData({
          range,
          apmEsClient: apmSynthtraceEsClient,
          services: apmServices,
        });

        await apmClient.index(apmGenerator);
      });

      after(async () => {
        await apmSynthtraceEsClient.clean();
      });

      it('filters services by kqlFilter on service.name', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: `service.name: "${APM_SERVICE_1}"`,
          },
        });

        const { data } = results[0];
        const services = data.services;
        const serviceNames = services.map((s) => s.serviceName);

        expect(serviceNames).to.contain(APM_SERVICE_1);
        expect(serviceNames).to.not.contain(APM_SERVICE_2);
      });

      it('filters services by kqlFilter on agent.name', async () => {
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: 'agent.name: "python"',
          },
        });

        const { data } = results[0];
        const services = data.services;
        const serviceNames = services.map((s) => s.serviceName);

        expect(serviceNames).to.contain(APM_SERVICE_2);
        expect(serviceNames).to.not.contain(APM_SERVICE_1);
      });

      it('filters services by kqlFilter on host.name', async () => {
        // Synthtrace sets host.name to `${serviceName}-01` by default
        const results = await agentBuilderApiClient.executeTool<GetServicesToolResult>({
          id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: `host.name: "${APM_SERVICE_1}-01"`,
          },
        });

        const { data } = results[0];
        const services = data.services;
        const serviceNames = services.map((s) => s.serviceName);

        expect(serviceNames).to.contain(APM_SERVICE_1);
        expect(serviceNames).to.not.contain(APM_SERVICE_2);
      });
    });
  });
}
