/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
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

      const instance = apm
        .service({ name: SERVICE_NAME, environment: ENVIRONMENT, agentName: 'java' })
        .instance(INSTANCE_NAME);

      await apmSynthtraceEsClient.index(
        timerange(START, END)
          .interval('1m')
          .rate(1)
          .generator((timestamp) =>
            instance
              .appMetrics({
                'system.process.cpu.total.norm.pct': 0.75,
                'jvm.memory.heap.used': 500000000, // 500MB
                'jvm.memory.non_heap.used': 50000000, // 50MB
                'jvm.thread.count': 42,
              })
              .timestamp(timestamp)
          )
      );
    });

    after(async () => {
      await apmSynthtraceEsClient.clean();
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
        expect(resultData.nodes[0].heapMemoryBytes).to.be(500000000);
      });

      it('returns non-heap memory metrics', () => {
        expect(resultData.nodes[0].nonHeapMemoryBytes).to.be(50000000);
      });

      it('returns thread count metrics', () => {
        expect(resultData.nodes[0].threadCount).to.be(42);
      });
    });

    describe('when fetching metrics for a non-Java service', () => {
      before(async () => {
        // Index a Node.js service (no JVM metrics)
        const nodeInstance = apm
          .service({ name: 'nodejs-service', environment: ENVIRONMENT, agentName: 'nodejs' })
          .instance('node-instance-1');

        await apmSynthtraceEsClient.index(
          timerange(START, END)
            .interval('1m')
            .rate(1)
            .generator((timestamp) =>
              nodeInstance
                .transaction({ transactionName: 'GET /api/users' })
                .timestamp(timestamp)
                .duration(100)
                .success()
            )
        );
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

    describe('when fetching runtime metrics for an OTel JVM service', () => {
      let resultData: GetRuntimeMetricsToolResult['data'];

      before(async () => {
        // Index OTel JVM metrics using ES client directly
        // OTel uses different field names than Elastic APM
        const now = Date.now();
        const docs = [];

        // Generate 15 documents (one per minute for 15 minutes)
        for (let i = 0; i < 15; i++) {
          const timestamp = new Date(now - (15 - i) * 60 * 1000).toISOString();

          docs.push({
            '@timestamp': timestamp,
            'processor.event': 'metric',
            'metricset.name': 'app',
            'service.name': OTEL_SERVICE_NAME,
            'service.environment': ENVIRONMENT,
            'service.node.name': OTEL_INSTANCE_NAME,
            'host.name': 'otel-host-1',
            'metrics.jvm.cpu.recent_utilization': 0.65,
            'metrics.jvm.memory.used': 400000000, // 400MB heap
            'metrics.jvm.memory.limit': 800000000, // 800MB max
            'attributes.jvm.memory.type': 'heap',
            'metrics.jvm.thread.count': 35,
            'metrics.jvm.gc.duration': 0.15, // 150ms in seconds
          });

          // Non-heap memory doc
          docs.push({
            '@timestamp': timestamp,
            'processor.event': 'metric',
            'metricset.name': 'app',
            'service.name': OTEL_SERVICE_NAME,
            'service.environment': ENVIRONMENT,
            'service.node.name': OTEL_INSTANCE_NAME,
            'host.name': 'otel-host-1',
            'metrics.jvm.memory.used': 40000000, // 40MB non-heap
            'metrics.jvm.memory.limit': 80000000, // 80MB max
            'attributes.jvm.memory.type': 'non_heap',
          });
        }

        // Bulk index OTel metrics to APM app metrics data stream
        // Uses OTel field names - handler detects OTel by field names, not index
        const body = docs.flatMap((doc) => [
          { create: { _index: `metrics-apm.app.${OTEL_SERVICE_NAME}-default` } },
          doc,
        ]);

        await es.bulk({ body, refresh: true });

        // Execute the tool
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

      after(async () => {
        // Clean up OTel test data
        await es.deleteByQuery({
          index: `metrics-apm.app.${OTEL_SERVICE_NAME}-default`,
          query: { match_all: {} },
          refresh: true,
          ignore_unavailable: true,
        });
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
        expect(resultData.nodes[0].heapMemoryBytes).to.be(400000000);
        expect(resultData.nodes[0].heapMemoryMaxBytes).to.be(800000000);
      });

      it('returns non-heap memory metrics from OTel fields', () => {
        expect(resultData.nodes[0].nonHeapMemoryBytes).to.be(40000000);
        expect(resultData.nodes[0].nonHeapMemoryMaxBytes).to.be(80000000);
      });

      it('returns memory utilization', () => {
        expect(resultData.nodes[0].heapMemoryUtilization).to.be(0.5); // 400/800
        expect(resultData.nodes[0].nonHeapMemoryUtilization).to.be(0.5); // 40/80
      });

      it('returns thread count from OTel fields', () => {
        expect(resultData.nodes[0].threadCount).to.be(35);
      });

      it('returns GC duration from OTel fields (converted to ms)', () => {
        // OTel stores GC duration in seconds, we convert to ms
        // Sum of 0.15s * ~14 docs (timing can vary) = ~2100ms
        expect(resultData.nodes[0].gcDurationMs).to.be.within(2000, 2400);
      });
    });

    describe('when fetching runtime metrics for OTel JVM service via APM Server ingest', () => {
      // APM Server stores unmapped OTel attributes under labels.* with dots replaced by underscores
      // See: https://www.elastic.co/docs/solutions/observability/apm/opentelemetry/attributes
      let resultData: GetRuntimeMetricsToolResult['data'];

      before(async () => {
        const now = Date.now();
        const docs = [];

        for (let i = 0; i < 15; i++) {
          const timestamp = new Date(now - (15 - i) * 60 * 1000).toISOString();

          // Heap memory doc - uses labels.jvm_memory_type (APM Server ingest path)
          docs.push({
            '@timestamp': timestamp,
            'processor.event': 'metric',
            'metricset.name': 'app',
            'service.name': OTEL_APM_SERVER_SERVICE_NAME,
            'service.environment': ENVIRONMENT,
            'service.node.name': OTEL_APM_SERVER_INSTANCE_NAME,
            'host.name': 'otel-apm-host-1',
            'metrics.jvm.cpu.recent_utilization': 0.55,
            'metrics.jvm.memory.used': 300000000, // 300MB heap
            'metrics.jvm.memory.limit': 600000000, // 600MB max
            'labels.jvm_memory_type': 'heap', // APM Server transforms jvm.memory.type → labels.jvm_memory_type
            'metrics.jvm.thread.count': 28,
            'metrics.jvm.gc.duration': 0.1, // 100ms in seconds
          });

          // Non-heap memory doc
          docs.push({
            '@timestamp': timestamp,
            'processor.event': 'metric',
            'metricset.name': 'app',
            'service.name': OTEL_APM_SERVER_SERVICE_NAME,
            'service.environment': ENVIRONMENT,
            'service.node.name': OTEL_APM_SERVER_INSTANCE_NAME,
            'host.name': 'otel-apm-host-1',
            'metrics.jvm.memory.used': 30000000, // 30MB non-heap
            'metrics.jvm.memory.limit': 60000000, // 60MB max
            'labels.jvm_memory_type': 'non_heap',
          });
        }

        const body = docs.flatMap((doc) => [
          { create: { _index: `metrics-apm.app.${OTEL_APM_SERVER_SERVICE_NAME}-default` } },
          doc,
        ]);

        await es.bulk({ body, refresh: true });

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

      after(async () => {
        await es.deleteByQuery({
          index: `metrics-apm.app.${OTEL_APM_SERVER_SERVICE_NAME}-default`,
          query: { match_all: {} },
          refresh: true,
          ignore_unavailable: true,
        });
      });

      it('returns runtime metrics for OTel service ingested via APM Server', () => {
        expect(resultData.total).to.be(1);
        expect(resultData.nodes.length).to.be(1);
      });

      it('returns the correct node name', () => {
        expect(resultData.nodes[0].serviceNodeName).to.be(OTEL_APM_SERVER_INSTANCE_NAME);
      });

      it('returns heap memory using labels.jvm_memory_type', () => {
        expect(resultData.nodes[0].heapMemoryBytes).to.be(300000000);
        expect(resultData.nodes[0].heapMemoryMaxBytes).to.be(600000000);
        expect(resultData.nodes[0].heapMemoryUtilization).to.be(0.5);
      });

      it('returns non-heap memory using labels.jvm_memory_type', () => {
        expect(resultData.nodes[0].nonHeapMemoryBytes).to.be(30000000);
        expect(resultData.nodes[0].nonHeapMemoryMaxBytes).to.be(60000000);
        expect(resultData.nodes[0].nonHeapMemoryUtilization).to.be(0.5);
      });

      it('returns CPU and thread count', () => {
        expect(resultData.nodes[0].cpuUtilization).to.be.within(0.5, 0.6);
        expect(resultData.nodes[0].threadCount).to.be(28);
      });
    });
  });
}
