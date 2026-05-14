/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  type ApmSynthtraceEsClient,
  generateExitSpanChangePointsData,
  EXIT_SPAN_CHANGE_POINTS_SERVICE_NAME,
  EXIT_SPAN_CHANGE_POINTS_DEPENDENCY_RESOURCE,
  EXIT_SPAN_CHANGE_POINTS_ANALYSIS_WINDOW,
} from '@kbn/synthtrace';

import type { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ChangePointGrouping } from '@kbn/observability-agent-builder-plugin/server/tools/get_exit_span_change_points/handler';
import { OBSERVABILITY_GET_EXIT_SPAN_CHANGE_POINTS_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools/get_exit_span_change_points/tool';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

interface ToolResult {
  type: ToolResultType.other;
  data: {
    changePoints: ChangePointGrouping[];
  };
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe(`tool: ${OBSERVABILITY_GET_EXIT_SPAN_CHANGE_POINTS_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let apmSynthtraceEsClient: ApmSynthtraceEsClient;

    before(async () => {
      const supertest = await roleScopedSupertest.getSupertestWithRoleScope('admin');
      agentBuilderApiClient = createAgentBuilderApiClient(supertest);
      apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
      const { client, generator } = generateExitSpanChangePointsData({
        apmEsClient: apmSynthtraceEsClient,
      });
      await client.index(generator);
    });

    after(async () => {
      await apmSynthtraceEsClient.clean();
    });

    describe('when retrieving exit span change points', () => {
      let exitSpanChangePoints: ChangePointGrouping[];

      before(async () => {
        const toolResults: ToolResult[] = await agentBuilderApiClient.executeTool({
          id: OBSERVABILITY_GET_EXIT_SPAN_CHANGE_POINTS_TOOL_ID,
          params: {
            start: EXIT_SPAN_CHANGE_POINTS_ANALYSIS_WINDOW.start,
            end: EXIT_SPAN_CHANGE_POINTS_ANALYSIS_WINDOW.end,
            serviceName: EXIT_SPAN_CHANGE_POINTS_SERVICE_NAME,
            serviceEnvironment: 'test',
          },
        });
        exitSpanChangePoints = toolResults[0]?.data?.changePoints ?? [];
      });

      it('should return results grouped by span.destination.service.resource', () => {
        const dependency = exitSpanChangePoints.find(
          (row) => row.grouping === EXIT_SPAN_CHANGE_POINTS_DEPENDENCY_RESOURCE
        );
        expect(dependency).to.not.be(undefined);
      });

      it('should return title, grouping, and changes for each series', () => {
        exitSpanChangePoints.forEach((row) => {
          expect(row).to.have.property('title');
          expect(row).to.have.property('grouping');
          expect(row).to.have.property('changes');
          expect(row.changes).to.be.an('array');
          expect(row.changes.length).to.be.greaterThan(0);
        });
      });

      it('should include change point metadata on each change', () => {
        exitSpanChangePoints.forEach((row) => {
          row.changes.forEach((change) => {
            expect(change).to.have.property('type');
            expect(change).to.have.property('date');
          });
        });
      });
    });
  });
}
