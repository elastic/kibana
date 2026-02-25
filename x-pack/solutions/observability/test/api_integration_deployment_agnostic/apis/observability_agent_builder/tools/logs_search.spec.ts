/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timerange } from '@kbn/synthtrace-client';
import { type LogsSynthtraceEsClient, generateLogsSearchData } from '@kbn/synthtrace';
import { OBSERVABILITY_LOGS_SEARCH_TOOL_ID } from '@kbn/observability-agent-builder-plugin/server/tools';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import type { SynthtraceProvider } from '../../../services/synthtrace';
import { createAgentBuilderApiClient } from '../utils/agent_builder_client';

const START = 'now-15m';
const END = 'now';

async function setupSynthtraceData(synthtrace: ReturnType<typeof SynthtraceProvider>) {
  const logsEsClient = synthtrace.createLogsSynthtraceEsClient();
  await logsEsClient.clean();

  const range = timerange(START, END);

  const scenarios = generateLogsSearchData({ range, logsEsClient });

  for (const scenario of scenarios) {
    await scenario.client.index(scenario.generator);
  }

  return { logsEsClient };
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  // This tool requires an LLM connector to be configured.
  // Skipped in CI — run manually with a connector:
  //
  //   node scripts/synthtrace src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/tools/logs_search/logs_search \
  //     --from "now-1h" --to "now" --clean --workers=1
  //
  //   curl -X POST http://localhost:5601/api/agent_builder/tools/_execute \
  //     -u elastic:changeme -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
  //     -d '{ "tool_id": "observability.logs_search", "tool_params": { "prompt": "Why are there errors in the checkout service?", "start": "now-1h", "end": "now" } }'
  describe.skip(`tool: ${OBSERVABILITY_LOGS_SEARCH_TOOL_ID}`, function () {
    let agentBuilderApiClient: ReturnType<typeof createAgentBuilderApiClient>;
    let logsSynthtraceEsClient: LogsSynthtraceEsClient;

    before(async () => {
      const scoped = await roleScopedSupertest.getSupertestWithRoleScope('editor');
      agentBuilderApiClient = createAgentBuilderApiClient(scoped);
      const clients = await setupSynthtraceData(synthtrace);
      logsSynthtraceEsClient = clients.logsEsClient;
    });

    after(async () => {
      await logsSynthtraceEsClient.clean();
    });

    it('returns a structured investigation result', async () => {
      const results = await agentBuilderApiClient.executeTool({
        id: OBSERVABILITY_LOGS_SEARCH_TOOL_ID,
        params: {
          prompt: 'Why are there errors in the checkout service?',
          start: START,
          end: END,
          index: 'logs-*',
        },
      });

      const data = results[0].data as Record<string, unknown>;

      // Verify the result has the expected structure
      expect(data).to.have.property('answer');
      expect(data).to.have.property('evidence');
      expect(data).to.have.property('queryTrace');
      expect(data).to.have.property('iterations');
      expect(data).to.have.property('totalLogsExamined');
      expect(data).to.have.property('finalMatchCount');

      // The agent should have performed multiple iterations
      expect(data.iterations).to.be.greaterThan(1);

      // The query trace should show the funnel progression
      const queryTrace = data.queryTrace as string[];
      expect(queryTrace.length).to.be.greaterThan(1);
    });
  });
}
