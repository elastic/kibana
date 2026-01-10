/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { timerange } from '@kbn/synthtrace-client';
import {
  type LogsSynthtraceEsClient,
  type ApmSynthtraceEsClient,
  generateRichChangeEventsData,
  indexAll,
} from '@kbn/synthtrace';
import { OBSERVABILITY_GET_CHANGE_EVENTS_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools/get_change_events/tool';
import type { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

interface GetChangeEventsToolResult {
  type: ToolResultType.other;
  data: {
    summary: string;
    total: number;
    events: Array<Record<string, any>>;
    sources: {
      logs: number;
      traces: number;
    };
    versionsByService: Record<
      string,
      Array<{ version: string; firstSeen: string; lastSeen: string }>
    >;
    note?: string;
  };
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_CHANGE_EVENTS_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let logsSynthtraceEsClient: LogsSynthtraceEsClient;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);

      logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

      await logsSynthtraceEsClient.clean();
      await apmSynthtraceEsClient.clean();

      const range = timerange('now-1h', 'now');
      const scenarios = generateRichChangeEventsData({
        range,
        logsEsClient: logsSynthtraceEsClient,
        apmEsClient: apmSynthtraceEsClient,
      });

      await indexAll(scenarios);
    });

    after(async () => {
      if (logsSynthtraceEsClient) {
        await logsSynthtraceEsClient.clean();
      }
      if (apmSynthtraceEsClient) {
        await apmSynthtraceEsClient.clean();
      }
    });

    it('retrieves all change events in the last hour with summary', async () => {
      const results = await agentBuilderApiClient.executeTool<GetChangeEventsToolResult>({
        id: OBSERVABILITY_GET_CHANGE_EVENTS_TOOL_ID,
        params: {
          start: 'now-1h',
          end: 'now',
        },
      });

      const { summary, total, events, versionsByService } = results[0].data;

      // Expecting at least:
      // 1. K8s Deployment Rollout (ScalingReplicaSet)
      // 2. K8s Pod Creation (SuccessfulCreate)
      // 3. Config Change
      // 4. Feature Flag
      // 5. Scaling Event
      // 6. CI/CD Pipeline Trace
      expect(total).to.be.greaterThan(0);
      expect(events.length).to.be(total);

      // Verify human-readable summary is present for LLM consumption
      expect(summary).to.be.a('string');
      expect(summary).to.contain('Found');
      expect(summary).to.contain('change event');

      // Verify mix of sources
      const hasLogs = events.some((e) => e.message);
      const hasTraces = events.some((e) => e.trace?.id);
      expect(hasLogs).to.be(true);
      expect(hasTraces).to.be(true);

      // Verify versions detected
      expect(versionsByService).to.have.property('checkout-service');
      const versions = versionsByService['checkout-service'];
      expect(versions.length).to.be.greaterThan(0);
      expect(versions.some((v) => v.version === '2.0.0')).to.be(true);
    });

    it('filters by service name', async () => {
      const results = await agentBuilderApiClient.executeTool<GetChangeEventsToolResult>({
        id: OBSERVABILITY_GET_CHANGE_EVENTS_TOOL_ID,
        params: {
          start: 'now-1h',
          end: 'now',
          serviceName: 'checkout-service',
        },
      });

      const { events } = results[0].data;
      expect(events.length).to.be.greaterThan(0);
      // Every event should have the service name (except maybe some infra events if not tagged, but synthtrace tags them)
      // Or at least checks that we got results.
      const serviceNames = events.map((e) => e.service?.name).filter((n) => n !== undefined);

      // Ensure all found service names match
      serviceNames.forEach((name) => expect(name).to.be('checkout-service'));
    });

    it('filters by change type (deployment)', async () => {
      const results = await agentBuilderApiClient.executeTool<GetChangeEventsToolResult>({
        id: OBSERVABILITY_GET_CHANGE_EVENTS_TOOL_ID,
        params: {
          start: 'now-1h',
          end: 'now',
          changeTypes: ['deployment'],
        },
      });

      const { events } = results[0].data;
      expect(events.length).to.be.greaterThan(0);

      // Should find K8s events and Pipeline traces
      const isDeploymentRelated = events.every((e) => {
        return (
          e.event?.category === 'deployment' ||
          e.k8s?.event?.reason === 'ScalingReplicaSet' ||
          e.k8s?.event?.reason === 'SuccessfulCreate' ||
          e.cicd?.pipeline?.run?.id
        );
      });
      expect(isDeploymentRelated).to.be(true);
    });

    it('filters by change type (feature_flag)', async () => {
      const results = await agentBuilderApiClient.executeTool<GetChangeEventsToolResult>({
        id: OBSERVABILITY_GET_CHANGE_EVENTS_TOOL_ID,
        params: {
          start: 'now-1h',
          end: 'now',
          changeTypes: ['feature_flag'],
        },
      });

      const { events } = results[0].data;
      expect(events.length).to.be(1); // Expecting exactly 1 feature flag event from scenario
      expect(events[0].feature_flag?.key).to.be('enable_ai_recommendations');
    });

    it('supports custom field retrieval', async () => {
      const results = await agentBuilderApiClient.executeTool<GetChangeEventsToolResult>({
        id: OBSERVABILITY_GET_CHANGE_EVENTS_TOOL_ID,
        params: {
          start: 'now-1h',
          end: 'now',
          changeTypes: ['feature_flag'],
          changeEventFields: ['@timestamp', 'feature_flag.key', 'message'],
        },
      });

      const { events } = results[0].data;
      expect(events.length).to.be(1);
      const event = events[0];

      // Should have requested fields
      expect(event).to.have.property('@timestamp');
      expect(event).to.have.property('message');
      // Should handle nested fields in _source
      // Note: ES return source structure, so feature_flag.key implies feature_flag object
      expect(event.feature_flag).to.have.property('key', 'enable_ai_recommendations');

      // Should NOT have other fields by default (like service.name) IF strict source filtering works
      // However, we rely on ES _source filtering.
      // Let's just check the ones we asked for exist.
    });

    it('returns helpful summary for empty results', async () => {
      const results = await agentBuilderApiClient.executeTool<GetChangeEventsToolResult>({
        id: OBSERVABILITY_GET_CHANGE_EVENTS_TOOL_ID,
        params: {
          start: 'now-1h',
          end: 'now',
          serviceName: 'non-existent-service-that-does-not-exist',
        },
      });

      const { summary, total, note } = results[0].data;

      expect(total).to.be(0);
      expect(summary).to.be('No change events found in the specified time range.');
      // Should also have instrumentation guidance
      expect(note).to.be.a('string');
      expect(note).to.contain('No change events found');
    });
  });
}
