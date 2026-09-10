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
  type InfraSynthtraceEsClient,
  generateHostsData,
  indexAll,
} from '@kbn/synthtrace';
import { OBSERVABILITY_GET_HOSTS_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { GetHostsToolResult } from '@kbn/observability-agent-builder-plugin/server/tools/get_hosts/tool';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_HOSTS_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let infraSynthtraceEsClient: InfraSynthtraceEsClient;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);

      infraSynthtraceEsClient = synthtrace.createInfraSynthtraceEsClient();
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

      await infraSynthtraceEsClient.clean();
      await apmSynthtraceEsClient.clean();

      await indexAll(
        generateHostsData({
          range: timerange('now-15m', 'now'),
          infraEsClient: infraSynthtraceEsClient,
          apmEsClient: apmSynthtraceEsClient,
          hosts: [
            {
              name: 'test-host-01',
              cpuUsage: 0.65,
              memoryUsage: 0.72,
              diskUsage: 0.45,
              cloudProvider: 'aws',
              cloudRegion: 'us-east-1',
              services: ['payment-service', 'user-service'],
            },
            {
              name: 'test-host-02',
              cpuUsage: 0.35,
              memoryUsage: 0.85,
              diskUsage: 0.68,
              cloudProvider: 'gcp',
              cloudRegion: 'us-central1',
              services: ['order-service'],
            },
          ],
        })
      );
    });

    after(async () => {
      if (infraSynthtraceEsClient) {
        await infraSynthtraceEsClient.clean();
      }
      if (apmSynthtraceEsClient) {
        await apmSynthtraceEsClient.clean();
      }
    });

    describe('when fetching hosts', () => {
      let resultData: GetHostsToolResult['data'];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetHostsToolResult>({
          id: OBSERVABILITY_GET_HOSTS_TOOL_ID,
          params: {
            start: 'now-1h',
            end: 'now',
          },
        });

        expect(results).to.have.length(1);

        resultData = results[0].data;
      });

      it('returns the correct total count', () => {
        expect(resultData.total).to.be(2);
      });

      it('includes metrics for each host', () => {
        for (const host of resultData.hosts) {
          expect(host).to.have.property('metrics');
          expect(host.metrics).to.be.an('array');
        }
      });

      it('includes metadata for each host', () => {
        for (const host of resultData.hosts) {
          expect(host).to.have.property('metadata');
          expect(host.metadata).to.be.an('array');
        }
      });

      it('returns correct CPU metrics', () => {
        const host01Cpu = resultData.hosts
          .find((h) => h.name === 'test-host-01')
          ?.metrics.find((m) => m.name === 'cpuV2');

        expect(host01Cpu).to.be.ok();
        expect(host01Cpu!.value).to.be.within(0.6, 0.7);

        const host02Cpu = resultData.hosts
          .find((h) => h.name === 'test-host-02')
          ?.metrics.find((m) => m.name === 'cpuV2');

        expect(host02Cpu).to.be.ok();
        expect(host02Cpu!.value).to.be.within(0.3, 0.4);
      });

      it('returns correct memory metrics', () => {
        const host01Memory = resultData.hosts
          .find((h) => h.name === 'test-host-01')
          ?.metrics.find((m) => m.name === 'memory');

        expect(host01Memory).to.be.ok();
        expect(host01Memory!.value).to.be.within(0.7, 0.75);

        const host02Memory = resultData.hosts
          .find((h) => h.name === 'test-host-02')
          ?.metrics.find((m) => m.name === 'memory');

        expect(host02Memory).to.be.ok();
        expect(host02Memory!.value).to.be.within(0.8, 0.9);
      });

      it('returns correct disk metrics', () => {
        const host01Cpu = resultData.hosts
          .find((h) => h.name === 'test-host-01')
          ?.metrics.find((m) => m.name === 'diskSpaceUsage');
        expect(host01Cpu).to.be.ok();
        expect(host01Cpu!.value).to.be.within(0.4, 0.5);

        const host02Cpu = resultData.hosts
          .find((h) => h.name === 'test-host-02')
          ?.metrics.find((m) => m.name === 'diskSpaceUsage');
        expect(host02Cpu).to.be.ok();
        expect(host02Cpu!.value).to.be.within(0.65, 0.7);
      });
    });

    describe('when using limit parameter', () => {
      it('respects the limit and returns fewer hosts', async () => {
        const results = await agentBuilderApiClient.executeTool<GetHostsToolResult>({
          id: OBSERVABILITY_GET_HOSTS_TOOL_ID,
          params: {
            start: 'now-1h',
            end: 'now',
            limit: 1,
          },
        });

        expect(results).to.have.length(1);
        expect(results[0].data.hosts).to.have.length(1);
        expect(results[0].data.total).to.be(1);
      });
    });

    describe('when using kqlFilter parameter', () => {
      it('filters hosts by KQL query', async () => {
        const results = await agentBuilderApiClient.executeTool<GetHostsToolResult>({
          id: OBSERVABILITY_GET_HOSTS_TOOL_ID,
          params: {
            start: 'now-1h',
            end: 'now',
            kqlFilter: 'host.name: test-host-02',
          },
        });

        expect(results).to.have.length(1);
        expect(results[0].data.hosts).to.have.length(1);
        expect(results[0].data.hosts[0].name).to.be('test-host-02');
      });

      it('verifies APM data is indexed correctly', async () => {
        // Debug test to verify APM data exists with correct fields
        const es = getService('es');
        const response = await es.search({
          index: 'metrics-apm.transaction.*',
          size: 1,
          fields: ['data_stream.dataset', 'host.name', 'service.name'],
          query: {
            bool: {
              filter: [{ range: { '@timestamp': { gte: 'now-1h', lte: 'now' } } }],
            },
          },
          aggs: {
            hosts: {
              terms: { field: 'host.name', size: 10 },
              aggs: {
                services: {
                  terms: { field: 'service.name', size: 10 },
                },
              },
            },
          },
        });

        // Verify we have APM data with host.name and service.name
        const hostsAgg = response.aggregations?.hosts as { buckets: Array<{ key: string }> };
        expect(hostsAgg?.buckets?.length).to.be.greaterThan(0);

        // Verify data_stream.dataset is present as it's required for filtering
        expect(response.hits.hits[0].fields).to.have.property('data_stream.dataset');
      });

      it('filters hosts by service.name using APM data correlation', async () => {
        // Filter by payment-service which runs on test-host-01
        const results = await agentBuilderApiClient.executeTool<GetHostsToolResult>({
          id: OBSERVABILITY_GET_HOSTS_TOOL_ID,
          params: {
            start: 'now-1h',
            end: 'now',
            kqlFilter: 'service.name: payment-service',
          },
        });

        expect(results).to.have.length(1);
        expect(results[0].data.hosts).to.have.length(1);
        expect(results[0].data.hosts[0].name).to.be('test-host-01');
      });

      it('filters hosts by order-service which runs on test-host-02', async () => {
        const results = await agentBuilderApiClient.executeTool<GetHostsToolResult>({
          id: OBSERVABILITY_GET_HOSTS_TOOL_ID,
          params: {
            start: 'now-1h',
            end: 'now',
            kqlFilter: 'service.name: order-service',
          },
        });

        expect(results).to.have.length(1);
        expect(results[0].data.hosts).to.have.length(1);
        expect(results[0].data.hosts[0].name).to.be('test-host-02');
      });
    });
  });
}
