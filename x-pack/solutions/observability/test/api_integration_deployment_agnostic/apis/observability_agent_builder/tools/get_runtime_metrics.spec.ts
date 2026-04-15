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
  generateElasticApmJvmMetrics,
  indexOtelJvmMetrics,
  cleanupOtelJvmMetrics,
  type ElasticApmJvmServiceConfig,
  type OtelJvmServiceConfig,
} from '@kbn/synthtrace';
import {
  OBSERVABILITY_GET_RUNTIME_METRICS_TOOL_ID,
  type GetRuntimeMetricsToolResult,
} from '@kbn/observability-agent-builder-plugin/server/tools/get_runtime_metrics/tool';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

const SERVICE_NAME = 'java-service';
const OTEL_SERVICE_NAME = 'otel-java-service';
const OTEL_APM_SERVER_SERVICE_NAME = 'otel-apm-server-java-service';
const ENVIRONMENT = 'production';
const INSTANCE_NAME = 'instance-a';
const OTEL_INSTANCE_NAME = 'otel-instance-a';
const OTEL_APM_SERVER_INSTANCE_NAME = 'otel-apm-server-instance-a';
const START = 'now-15m';
const END = 'now';

// Elastic APM service config for tests
const ELASTIC_APM_SERVICE: ElasticApmJvmServiceConfig = {
  name: SERVICE_NAME,
  environment: ENVIRONMENT,
  instanceName: INSTANCE_NAME,
  hostName: 'test-host-1',
  cpuPercent: 0.75,
  heapMemoryUsed: 500_000_000, // 500MB
  heapMemoryMax: 1_073_741_824, // 1GB
  nonHeapMemoryUsed: 50_000_000, // 50MB
  nonHeapMemoryMax: 268_435_456, // 256MB
  threadCount: 42,
  gcTime: 150, // ms
};

// OTel native ingest service config
const OTEL_NATIVE_SERVICE: OtelJvmServiceConfig = {
  name: OTEL_SERVICE_NAME,
  environment: ENVIRONMENT,
  instanceName: OTEL_INSTANCE_NAME,
  hostName: 'otel-host-1',
  ingestPath: 'native',
  cpuUtilization: 0.65,
  heapMemoryUsed: 400_000_000, // 400MB
  heapMemoryLimit: 800_000_000, // 800MB
  nonHeapMemoryUsed: 40_000_000, // 40MB
  nonHeapMemoryLimit: 80_000_000, // 80MB
  threadCount: 35,
  gcDurationSeconds: 0.15, // 150ms in seconds
};

// OTel APM Server ingest service config
const OTEL_APM_SERVER_SERVICE: OtelJvmServiceConfig = {
  name: OTEL_APM_SERVER_SERVICE_NAME,
  environment: ENVIRONMENT,
  instanceName: OTEL_APM_SERVER_INSTANCE_NAME,
  hostName: 'otel-apm-host-1',
  ingestPath: 'apm_server',
  cpuUtilization: 0.55,
  heapMemoryUsed: 300_000_000, // 300MB
  heapMemoryLimit: 600_000_000, // 600MB
  nonHeapMemoryUsed: 30_000_000, // 30MB
  nonHeapMemoryLimit: 60_000_000, // 60MB
  threadCount: 28,
  gcDurationSeconds: 0.1, // 100ms in seconds
};

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');
  const es = getService('es');

  describe(`tool: ${OBSERVABILITY_GET_RUNTIME_METRICS_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);

      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      await apmSynthtraceEsClient.clean();

      const range = timerange(START, END);

      // Index Elastic APM JVM metrics using synthtrace
      const { client, generator } = generateElasticApmJvmMetrics({
        range,
        apmEsClient: apmSynthtraceEsClient,
        services: [ELASTIC_APM_SERVICE],
      });
      await client.index(generator);

      // Index OTel JVM metrics using direct ES indexing
      const startMs = datemath.parse(START)!.valueOf();
      const endMs = datemath.parse(END)!.valueOf();

      await indexOtelJvmMetrics({
        esClient: es,
        startMs,
        endMs,
        services: [OTEL_NATIVE_SERVICE, OTEL_APM_SERVER_SERVICE],
      });
    });

    after(async () => {
      await apmSynthtraceEsClient.clean();
      await cleanupOtelJvmMetrics({
        esClient: es,
        services: [OTEL_NATIVE_SERVICE, OTEL_APM_SERVER_SERVICE],
      });
    });

    describe('when fetching runtime metrics for a Java service', () => {
      let resultData: GetRuntimeMetricsToolResult['data'];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetRuntimeMetricsToolResult>({
          id: OBSERVABILITY_GET_RUNTIME_METRICS_TOOL_ID,
          params: {
            serviceName: SERVICE_NAME,
            serviceEnvironment: ENVIRONMENT,
            start: START,
            end: END,
          },
        });

        expect(results).to.have.length(1);
        resultData = results[0].data;
      });

      it('returns the correct tool results structure', () => {
        expect(resultData).to.have.property('total');
        expect(resultData).to.have.property('nodes');
        expect(Array.isArray(resultData.nodes)).to.be(true);
      });

      it('returns runtime metrics for the service', () => {
        expect(resultData.total).to.be(1);
        expect(resultData.nodes.length).to.be(1);
      });

      it('returns the correct node name', () => {
        expect(resultData.nodes[0].serviceNodeName).to.be(INSTANCE_NAME);
      });

      it('returns runtime type', () => {
        expect(resultData.nodes[0].runtime).to.be('jvm');
      });

      it('returns CPU metrics', () => {
        expect(resultData.nodes[0].cpuUtilization).to.be.within(0.7, 0.8);
      });

      it('returns heap memory metrics', () => {
        expect(resultData.nodes[0].heapMemoryBytes).to.be(ELASTIC_APM_SERVICE.heapMemoryUsed);
      });

      it('returns non-heap memory metrics', () => {
        expect(resultData.nodes[0].nonHeapMemoryBytes).to.be(ELASTIC_APM_SERVICE.nonHeapMemoryUsed);
      });

      it('returns thread count metrics', () => {
        expect(resultData.nodes[0].threadCount).to.be(ELASTIC_APM_SERVICE.threadCount);
      });
    });

    describe('when fetching metrics for a non-Java service', () => {
      before(async () => {
        // Index a Node.js service (no JVM metrics) using synthtrace
        const { client, generator } = generateElasticApmJvmMetrics({
          range: timerange(START, END),
          apmEsClient: apmSynthtraceEsClient,
          services: [], // Empty services - no JVM metrics
        });
        await client.index(generator);
      });

      it('returns empty results for non-JVM services', async () => {
        const results = await agentBuilderApiClient.executeTool<GetRuntimeMetricsToolResult>({
          id: OBSERVABILITY_GET_RUNTIME_METRICS_TOOL_ID,
          params: {
            serviceName: 'nodejs-service',
            serviceEnvironment: ENVIRONMENT,
            start: START,
            end: END,
          },
        });

        expect(results).to.have.length(1);
        expect(results[0].data.total).to.be(0);
        expect(results[0].data.nodes).to.have.length(0);
      });
    });

    describe('when using kqlFilter parameter', () => {
      it('filters nodes by KQL query', async () => {
        const results = await agentBuilderApiClient.executeTool<GetRuntimeMetricsToolResult>({
          id: OBSERVABILITY_GET_RUNTIME_METRICS_TOOL_ID,
          params: {
            serviceName: SERVICE_NAME,
            serviceEnvironment: ENVIRONMENT,
            start: START,
            end: END,
            kqlFilter: `service.node.name: ${INSTANCE_NAME}`,
          },
        });

        expect(results).to.have.length(1);
        expect(results[0].data.nodes).to.have.length(1);
        expect(results[0].data.nodes[0].serviceNodeName).to.be(INSTANCE_NAME);
      });

      it('returns empty when filter matches nothing', async () => {
        const results = await agentBuilderApiClient.executeTool<GetRuntimeMetricsToolResult>({
          id: OBSERVABILITY_GET_RUNTIME_METRICS_TOOL_ID,
          params: {
            serviceName: SERVICE_NAME,
            serviceEnvironment: ENVIRONMENT,
            start: START,
            end: END,
            kqlFilter: 'service.node.name: non-existent-instance',
          },
        });

        expect(results).to.have.length(1);
        expect(results[0].data.total).to.be(0);
        expect(results[0].data.nodes).to.have.length(0);
      });
    });

    describe('when querying across all environments', () => {
      it('returns metrics without environment filter', async () => {
        const results = await agentBuilderApiClient.executeTool<GetRuntimeMetricsToolResult>({
          id: OBSERVABILITY_GET_RUNTIME_METRICS_TOOL_ID,
          params: {
            serviceName: SERVICE_NAME,
            start: START,
            end: END,
          },
        });

        expect(results).to.have.length(1);
        expect(results[0].data.total).to.be(1);
      });
    });

    describe('when using limit parameter', () => {
      it('respects the limit parameter', async () => {
        const results = await agentBuilderApiClient.executeTool<GetRuntimeMetricsToolResult>({
          id: OBSERVABILITY_GET_RUNTIME_METRICS_TOOL_ID,
          params: {
            serviceName: SERVICE_NAME,
            start: START,
            end: END,
            limit: 1,
          },
        });

        expect(results).to.have.length(1);
        expect(results[0].data.nodes.length).to.be.lessThan(2);
      });
    });

    describe('when querying without serviceName', () => {
      it('returns metrics across all services using kqlFilter', async () => {
        const results = await agentBuilderApiClient.executeTool<GetRuntimeMetricsToolResult>({
          id: OBSERVABILITY_GET_RUNTIME_METRICS_TOOL_ID,
          params: {
            start: START,
            end: END,
            kqlFilter: `service.name: ${SERVICE_NAME}`,
          },
        });

        expect(results).to.have.length(1);
        expect(results[0].data.total).to.be(1);
        expect(results[0].data.nodes[0].serviceName).to.be(SERVICE_NAME);
      });
    });

    describe('response includes serviceName field', () => {
      it('returns serviceName in the response', async () => {
        const results = await agentBuilderApiClient.executeTool<GetRuntimeMetricsToolResult>({
          id: OBSERVABILITY_GET_RUNTIME_METRICS_TOOL_ID,
          params: {
            serviceName: SERVICE_NAME,
            start: START,
            end: END,
          },
        });

        expect(results).to.have.length(1);
        expect(results[0].data.nodes[0].serviceName).to.be(SERVICE_NAME);
      });
    });

    describe('when fetching runtime metrics for an OTel JVM service (native ingest)', () => {
      let resultData: GetRuntimeMetricsToolResult['data'];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetRuntimeMetricsToolResult>({
          id: OBSERVABILITY_GET_RUNTIME_METRICS_TOOL_ID,
          params: {
            serviceName: OTEL_SERVICE_NAME,
            serviceEnvironment: ENVIRONMENT,
            start: START,
            end: END,
          },
        });

        expect(results).to.have.length(1);
        resultData = results[0].data;
      });

      it('returns runtime metrics for the OTel service', () => {
        expect(resultData.total).to.be(1);
        expect(resultData.nodes.length).to.be(1);
      });

      it('returns the correct node name', () => {
        expect(resultData.nodes[0].serviceNodeName).to.be(OTEL_INSTANCE_NAME);
      });

      it('returns runtime type', () => {
        expect(resultData.nodes[0].runtime).to.be('jvm');
      });

      it('returns CPU metrics from OTel fields', () => {
        expect(resultData.nodes[0].cpuUtilization).to.be.within(0.6, 0.7);
      });

      it('returns heap memory metrics from OTel fields', () => {
        expect(resultData.nodes[0].heapMemoryBytes).to.be(OTEL_NATIVE_SERVICE.heapMemoryUsed);
        expect(resultData.nodes[0].heapMemoryMaxBytes).to.be(OTEL_NATIVE_SERVICE.heapMemoryLimit);
      });

      it('returns non-heap memory metrics from OTel fields', () => {
        expect(resultData.nodes[0].nonHeapMemoryBytes).to.be(OTEL_NATIVE_SERVICE.nonHeapMemoryUsed);
        expect(resultData.nodes[0].nonHeapMemoryMaxBytes).to.be(
          OTEL_NATIVE_SERVICE.nonHeapMemoryLimit
        );
      });

      it('returns memory utilization', () => {
        // Use range to avoid floating point precision issues
        expect(resultData.nodes[0].heapMemoryUtilization).to.be.within(0.49, 0.51); // 400/800
        expect(resultData.nodes[0].nonHeapMemoryUtilization).to.be.within(0.49, 0.51); // 40/80
      });

      it('returns thread count from OTel fields', () => {
        expect(resultData.nodes[0].threadCount).to.be(OTEL_NATIVE_SERVICE.threadCount);
      });

      it('returns GC duration from OTel fields (converted to ms)', () => {
        // OTel stores GC duration in seconds, we convert to ms
        // Document count varies (14-17) based on timing, so use wide range
        expect(resultData.nodes[0].gcDurationMs).to.be.within(1800, 2800);
      });
    });

    describe('when fetching runtime metrics for OTel JVM service via APM Server ingest', () => {
      // APM Server stores unmapped OTel attributes under labels.* with dots replaced by underscores
      // See: https://www.elastic.co/docs/solutions/observability/apm/opentelemetry/attributes
      let resultData: GetRuntimeMetricsToolResult['data'];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetRuntimeMetricsToolResult>({
          id: OBSERVABILITY_GET_RUNTIME_METRICS_TOOL_ID,
          params: {
            serviceName: OTEL_APM_SERVER_SERVICE_NAME,
            serviceEnvironment: ENVIRONMENT,
            start: START,
            end: END,
          },
        });

        expect(results).to.have.length(1);
        resultData = results[0].data;
      });

      it('returns runtime metrics for OTel service ingested via APM Server', () => {
        expect(resultData.total).to.be(1);
        expect(resultData.nodes.length).to.be(1);
      });

      it('returns the correct node name', () => {
        expect(resultData.nodes[0].serviceNodeName).to.be(OTEL_APM_SERVER_INSTANCE_NAME);
      });

      it('returns heap memory using labels.jvm_memory_type', () => {
        expect(resultData.nodes[0].heapMemoryBytes).to.be(OTEL_APM_SERVER_SERVICE.heapMemoryUsed);
        expect(resultData.nodes[0].heapMemoryMaxBytes).to.be(
          OTEL_APM_SERVER_SERVICE.heapMemoryLimit
        );
        // Use range to avoid floating point precision issues
        expect(resultData.nodes[0].heapMemoryUtilization).to.be.within(0.49, 0.51);
      });

      it('returns non-heap memory using labels.jvm_memory_type', () => {
        expect(resultData.nodes[0].nonHeapMemoryBytes).to.be(
          OTEL_APM_SERVER_SERVICE.nonHeapMemoryUsed
        );
        expect(resultData.nodes[0].nonHeapMemoryMaxBytes).to.be(
          OTEL_APM_SERVER_SERVICE.nonHeapMemoryLimit
        );
        // Use range to avoid floating point precision issues
        expect(resultData.nodes[0].nonHeapMemoryUtilization).to.be.within(0.49, 0.51);
      });

      it('returns CPU and thread count', () => {
        expect(resultData.nodes[0].cpuUtilization).to.be.within(0.5, 0.6);
        expect(resultData.nodes[0].threadCount).to.be(OTEL_APM_SERVER_SERVICE.threadCount);
      });
    });
  });
}
