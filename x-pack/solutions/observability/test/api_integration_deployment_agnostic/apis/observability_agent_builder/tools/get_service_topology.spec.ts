/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { timerange } from '@kbn/synthtrace-client';
import { type ApmSynthtraceEsClient, generateTopologyData } from '@kbn/synthtrace';
import type { OtherResult } from '@kbn/agent-builder-common';
import { OBSERVABILITY_GET_SERVICE_TOPOLOGY_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

const START = 'now-15m';
const END = 'now';

/**
 * These constants match the synthtrace scenario (generateTopologyData)
 *
 * Topology:
 *   frontend (nodejs)
 *     → checkout-service (java)
 *         → postgres (db)
 *         → redis (cache)
 *         → kafka (messaging)
 *     → recommendation-service (python)
 *         → postgres (db)
 */
const FRONTEND_SERVICE = {
  name: 'frontend',
  agent: 'nodejs',
};

const CHECKOUT_SERVICE = {
  name: 'checkout-service',
  agent: 'java',
};

const CHECKOUT_SERVICE_DEPENDENCY = {
  resource: 'checkout-service',
  spanType: 'external',
  spanSubtype: 'http',
};

const RECOMMENDATION_SERVICE_DEPENDENCY = {
  resource: 'recommendation-service',
  spanType: 'external',
  spanSubtype: 'http',
};

const POSTGRES_DEPENDENCY = {
  resource: 'postgres',
  spanType: 'db',
  spanSubtype: 'postgresql',
};

interface ServiceTopologyConnection {
  source: {
    'service.name': string;
    'agent.name': string;
  };
  target:
    | { 'service.name': string }
    | { 'span.destination.service.resource': string; 'span.type': string };
  metrics: {
    errorRate: number | null;
    latencyMs: number | null;
    throughputPerMin: number | null;
  } | null;
}

interface GetServiceTopologyToolResult extends OtherResult {
  data: {
    tracesCount: number;
    connectionsCount: number;
    connections: ServiceTopologyConnection[];
  };
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_SERVICE_TOPOLOGY_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);

      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      await apmSynthtraceEsClient.clean();

      const { client, generator } = generateTopologyData({
        range: timerange(START, END),
        apmEsClient: apmSynthtraceEsClient,
      });

      await client.index(generator);
    });

    after(async () => {
      await apmSynthtraceEsClient.clean();
    });

    describe('when fetching service topology with metrics', () => {
      let resultData: GetServiceTopologyToolResult['data'];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetServiceTopologyToolResult>({
          id: OBSERVABILITY_GET_SERVICE_TOPOLOGY_TOOL_ID,
          params: {
            serviceName: FRONTEND_SERVICE.name,
            start: START,
            end: END,
          },
        });

        expect(results).to.have.length(1);
        resultData = results[0].data;
      });

      it('returns tracesCount and connectionsCount', () => {
        expect(resultData.tracesCount).to.be.greaterThan(0);
        expect(resultData.connectionsCount).to.be(resultData.connections.length);
      });

      it('returns connections to multiple downstream services', () => {
        // Frontend should have connections to both checkout-service and recommendation-service
        const connectionToCheckout = resultData.connections.find(
          (c) =>
            c.source['service.name'] === FRONTEND_SERVICE.name &&
            'span.destination.service.resource' in c.target &&
            c.target['span.destination.service.resource'] === CHECKOUT_SERVICE_DEPENDENCY.resource
        );

        const connectionToRecommendation = resultData.connections.find(
          (c) =>
            c.source['service.name'] === FRONTEND_SERVICE.name &&
            'span.destination.service.resource' in c.target &&
            c.target['span.destination.service.resource'] ===
              RECOMMENDATION_SERVICE_DEPENDENCY.resource
        );

        expect(connectionToCheckout).to.be.ok();
        expect(connectionToRecommendation).to.be.ok();
      });

      it('returns the correct source and target details', () => {
        const connectionToCheckout = resultData.connections.find(
          (c) =>
            c.source['service.name'] === FRONTEND_SERVICE.name &&
            'span.destination.service.resource' in c.target &&
            c.target['span.destination.service.resource'] === CHECKOUT_SERVICE_DEPENDENCY.resource
        );

        expect(connectionToCheckout).to.be.ok();

        // Verify source
        expect(connectionToCheckout?.source['service.name']).to.be(FRONTEND_SERVICE.name);
        expect(connectionToCheckout?.source['agent.name']).to.be(FRONTEND_SERVICE.agent);

        // Verify target
        const target = connectionToCheckout?.target as {
          'span.destination.service.resource': string;
          'span.type': string;
          'span.subtype': string;
        };
        expect(target['span.type']).to.be(CHECKOUT_SERVICE_DEPENDENCY.spanType);
        expect(target['span.subtype']).to.be(CHECKOUT_SERVICE_DEPENDENCY.spanSubtype);
      });

      it('includes health metrics for connections', () => {
        const connectionToCheckout = resultData.connections.find(
          (c) =>
            'span.destination.service.resource' in c.target &&
            c.target['span.destination.service.resource'] === CHECKOUT_SERVICE_DEPENDENCY.resource
        );

        expect(connectionToCheckout?.metrics).to.be.ok();
        expect(connectionToCheckout?.metrics?.latencyMs).to.be.a('number');
        expect(connectionToCheckout?.metrics?.throughputPerMin).to.be.a('number');
        expect(connectionToCheckout?.metrics?.errorRate).to.be(0); // All spans are successful
      });
    });

    describe('when fetching service topology without metrics', () => {
      let resultData: GetServiceTopologyToolResult['data'];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetServiceTopologyToolResult>({
          id: OBSERVABILITY_GET_SERVICE_TOPOLOGY_TOOL_ID,
          params: {
            serviceName: FRONTEND_SERVICE.name,
            start: START,
            end: END,
            includeMetrics: false,
          },
        });

        expect(results).to.have.length(1);
        resultData = results[0].data;
      });

      it('returns connections without metrics', () => {
        expect(resultData.connections.length).to.be.greaterThan(0);

        const connectionToCheckout = resultData.connections.find(
          (c) =>
            'span.destination.service.resource' in c.target &&
            c.target['span.destination.service.resource'] === CHECKOUT_SERVICE_DEPENDENCY.resource
        );

        expect(connectionToCheckout).to.be.ok();
        expect(connectionToCheckout?.metrics).to.be(null);
      });
    });

    describe('when fetching upstream topology (direction: upstream)', () => {
      let resultData: GetServiceTopologyToolResult['data'];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetServiceTopologyToolResult>({
          id: OBSERVABILITY_GET_SERVICE_TOPOLOGY_TOOL_ID,
          params: {
            serviceName: CHECKOUT_SERVICE.name,
            start: START,
            end: END,
            direction: 'upstream',
          },
        });

        expect(results).to.have.length(1);
        resultData = results[0].data;
      });

      it('returns upstream callers of the service', () => {
        // frontend calls checkout-service, so frontend should appear as a caller
        const upstreamFromFrontend = resultData.connections.find(
          (c) => c.source['service.name'] === FRONTEND_SERVICE.name
        );

        expect(upstreamFromFrontend).to.be.ok();
        expect(upstreamFromFrontend?.source['service.name']).to.be(FRONTEND_SERVICE.name);
        expect(upstreamFromFrontend?.source['agent.name']).to.be(FRONTEND_SERVICE.agent);
      });

      it('shows the queried service as the target', () => {
        const upstreamFromFrontend = resultData.connections.find(
          (c) => c.source['service.name'] === FRONTEND_SERVICE.name
        );

        expect(upstreamFromFrontend).to.be.ok();
        const target = upstreamFromFrontend?.target as {
          'span.destination.service.resource': string;
        };
        expect(target['span.destination.service.resource']).to.be(CHECKOUT_SERVICE.name);
      });
    });

    describe('when fetching topology in both directions (direction: both)', () => {
      let resultData: GetServiceTopologyToolResult['data'];

      before(async () => {
        const results = await agentBuilderApiClient.executeTool<GetServiceTopologyToolResult>({
          id: OBSERVABILITY_GET_SERVICE_TOPOLOGY_TOOL_ID,
          params: {
            serviceName: CHECKOUT_SERVICE.name,
            start: START,
            end: END,
            direction: 'both',
          },
        });

        expect(results).to.have.length(1);
        resultData = results[0].data;
      });

      it('returns upstream callers', () => {
        // Upstream: frontend → checkout-service
        const upstreamFromFrontend = resultData.connections.find(
          (c) => c.source['service.name'] === FRONTEND_SERVICE.name
        );

        expect(upstreamFromFrontend).to.be.ok();
      });

      it('returns downstream dependencies', () => {
        // Downstream: checkout-service → postgres
        const downstreamToPostgres = resultData.connections.find(
          (c) =>
            c.source['service.name'] === CHECKOUT_SERVICE.name &&
            'span.destination.service.resource' in c.target &&
            c.target['span.destination.service.resource'] === POSTGRES_DEPENDENCY.resource
        );

        expect(downstreamToPostgres).to.be.ok();
      });
    });
  });
}
