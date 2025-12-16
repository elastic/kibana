/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { InfraSynthtraceEsClient } from '@kbn/synthtrace';
import type { OtherResult } from '@kbn/onechat-common';
import { OBSERVABILITY_GET_HOSTS_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';
import { createSyntheticInfraData } from '../utils/synthtrace_scenarios';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');

  describe(`tool: ${OBSERVABILITY_GET_HOSTS_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let infraSynthtraceEsClient: InfraSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);

      ({ infraSynthtraceEsClient } = await createSyntheticInfraData({
        getService,
        hostNames: ['test-host-01', 'test-host-02'],
      }));
    });

    after(async () => {
      if (infraSynthtraceEsClient) {
        await infraSynthtraceEsClient.clean();
      }
    });

    interface ResponseData {
      total: number;
      hosts: Array<{
        name: string;
        metrics: Array<{ name: string; value: number | null }>;
        metadata: Array<{ name: string; value: string | number | null }>;
      }>;
    }

    describe('when fetching hosts', () => {
      let responseData: ResponseData;

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<OtherResult<ResponseData>>({
          id: OBSERVABILITY_GET_HOSTS_TOOL_ID,
          params: {
            start: 'now-1h',
            end: 'now',
          },
        });

        expect(results).to.have.length(1);

        responseData = results[0].data;
      });

      it('returns the correct total count', () => {
        expect(responseData.total).to.be(2);
      });

      it('returns the expected hosts', () => {
        const hostNames = responseData.hosts.map((host) => host.name);
        expect(hostNames).to.eql(['test-host-01', 'test-host-02']);
      });

      it('includes metrics for each host', () => {
        for (const host of responseData.hosts) {
          expect(host).to.have.property('metrics');
          expect(host.metrics).to.be.an('array');
        }
      });

      it('includes metadata for each host', () => {
        for (const host of responseData.hosts) {
          expect(host).to.have.property('metadata');
          expect(host.metadata).to.be.an('array');
        }
      });

      it('returns correct CPU metrics', () => {
        const host01Cpu = responseData.hosts
          .find((h) => h.name === 'test-host-01')
          ?.metrics.find((m) => m.name === 'cpuV2');

        expect(host01Cpu).to.be.ok();
        expect(host01Cpu!.value).to.be.within(0.6, 0.7);

        const host02Cpu = responseData.hosts
          .find((h) => h.name === 'test-host-02')
          ?.metrics.find((m) => m.name === 'cpuV2');

        expect(host02Cpu).to.be.ok();
        expect(host02Cpu!.value).to.be.within(0.3, 0.4);
      });

      it('returns correct memory metrics', () => {
        const host01Memory = responseData.hosts
          .find((h) => h.name === 'test-host-01')
          ?.metrics.find((m) => m.name === 'memory');

        expect(host01Memory).to.be.ok();
        expect(host01Memory!.value).to.be.within(0.7, 0.75);

        const host02Memory = responseData.hosts
          .find((h) => h.name === 'test-host-02')
          ?.metrics.find((m) => m.name === 'memory');

        expect(host02Memory).to.be.ok();
        expect(host02Memory!.value).to.be.within(0.8, 0.9);
      });

      it('returns correct disk metrics', () => {
        const host01Cpu = responseData.hosts
          .find((h) => h.name === 'test-host-01')
          ?.metrics.find((m) => m.name === 'diskSpaceUsage');
        expect(host01Cpu).to.be.ok();
        expect(host01Cpu!.value).to.be.within(0.4, 0.5);

        const host02Cpu = responseData.hosts
          .find((h) => h.name === 'test-host-02')
          ?.metrics.find((m) => m.name === 'diskSpaceUsage');
        expect(host02Cpu).to.be.ok();
        expect(host02Cpu!.value).to.be.within(0.65, 0.7);
      });
    });

    describe('when using limit parameter', () => {
      it('respects the limit and returns fewer hosts', async () => {
        const results = await agentBuilderApiClient.executeTool<OtherResult<ResponseData>>({
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

    describe('when using hostNames parameter', () => {
      it('filters to specific hosts', async () => {
        const results = await agentBuilderApiClient.executeTool<OtherResult<ResponseData>>({
          id: OBSERVABILITY_GET_HOSTS_TOOL_ID,
          params: {
            start: 'now-1h',
            end: 'now',
            hostNames: ['test-host-01'],
          },
        });

        expect(results).to.have.length(1);
        expect(results[0].data.hosts).to.have.length(1);
        expect(results[0].data.hosts[0].name).to.be('test-host-01');
      });
    });

    describe('when using kqlFilter parameter', () => {
      it('filters hosts by KQL query', async () => {
        const results = await agentBuilderApiClient.executeTool<OtherResult<ResponseData>>({
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
    });
  });
}
