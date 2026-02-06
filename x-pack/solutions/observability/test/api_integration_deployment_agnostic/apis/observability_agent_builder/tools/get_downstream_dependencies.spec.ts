/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { timerange } from '@kbn/synthtrace-client';
import { type ApmSynthtraceEsClient, generateDependenciesData } from '@kbn/synthtrace';
import type { OtherResult } from '@kbn/agent-builder-common';
import { OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

const SERVICE_NAME = 'service-a';
const ENVIRONMENT = 'production';
const START = 'now-15m';
const END = 'now';
const DEPENDENCY_RESOURCE = 'elasticsearch/my-backend';

interface GetDownstreamDependenciesToolResult extends OtherResult {
  data: {
    dependencies: Array<Record<string, unknown>>;
  };
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);

      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      await apmSynthtraceEsClient.clean();

      const { client, generator } = generateDependenciesData({
        range: timerange(START, END),
        apmEsClient: apmSynthtraceEsClient,
        serviceName: SERVICE_NAME,
        environment: ENVIRONMENT,
        agentName: 'nodejs',
        transactionName: 'POST /api/checkout',
        dependencies: [
          {
            spanName: 'GET /dep',
            spanType: 'db',
            spanSubtype: 'elasticsearch',
            destination: DEPENDENCY_RESOURCE,
            duration: 100,
          },
        ],
      });

      await client.index(generator);
    });

    after(async () => {
      await apmSynthtraceEsClient.clean();
    });

    describe('when fetching downstream dependencies', () => {
      let resultData: GetDownstreamDependenciesToolResult['data'];

      before(async () => {
        const results =
          await agentBuilderApiClient.executeTool<GetDownstreamDependenciesToolResult>({
            id: OBSERVABILITY_GET_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
            params: {
              serviceName: SERVICE_NAME,
              environment: ENVIRONMENT,
              start: START,
              end: END,
            },
          });

        expect(results).to.have.length(1);
        resultData = results[0].data;
      });

      it('returns the correct tool results structure', () => {
        expect(resultData).to.have.property('dependencies');
        expect(Array.isArray(resultData.dependencies)).to.be(true);
      });

      it('returns downstream dependencies for the given service and time range', () => {
        const dependencies = resultData.dependencies;

        expect(dependencies.length > 0).to.be(true);

        const hasExpectedBackend = dependencies.some(
          (d) =>
            d['span.destination.service.resource'] === DEPENDENCY_RESOURCE &&
            d['span.type'] === 'db' &&
            d['span.subtype'] === 'elasticsearch'
        );

        expect(hasExpectedBackend).to.be(true);
      });
    });
  });
}
