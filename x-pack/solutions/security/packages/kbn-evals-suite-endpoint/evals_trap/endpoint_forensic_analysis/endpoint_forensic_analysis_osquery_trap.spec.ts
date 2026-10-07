/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { assertOsqueryTrapHasNoAgents } from '../../src/data_generators/osquery_trap';

evaluate.describe(
  'Endpoint Forensic Analysis — Osquery capability trap',
  { tag: tags.stateful.classic },
  () => {
    evaluate.beforeAll(async ({ kbnClient }) => {
      // Recheck in the actual model worker/space; never infer space-wide state from an empty policy.
      await assertOsqueryTrapHasNoAgents(kbnClient);
      await kbnClient.request({
        method: 'GET',
        path: `/api/agent_builder/agents/${agentBuilderDefaultAgentId}`,
      });
      const { data } = await kbnClient.request<{ results: Array<{ id: string }> }>({
        method: 'GET',
        path: '/api/agent_builder/tools',
      });
      if (!data.results.some((tool) => tool.id === 'security.osquery.check_integration')) {
        throw new Error('Trap suite requires security.osquery.check_integration in this space');
      }
    });

    evaluate(
      'Osquery installed but no agents enrolled — probe is load-bearing',
      async ({ evaluateForensicDataset }) => {
        // Trap: Osquery IS installed but no host can run a live query. An agent
        // that skips check_integration reports "not installed" (wrong); only the
        // probe reveals "installed, zero agents enrolled". This makes the probe
        // load-bearing instead of optional.
        await evaluateForensicDataset({
          dataset: {
            name: 'security: endpoint-forensic-analysis-osquery-capability-no-agents',
            description:
              'Capability detection trap: Osquery installed but no agents enrolled. Agent must call check_integration to learn installed-but-unusable, NOT claim not-installed.',
            examples: [
              {
                input: {
                  question:
                    'Show me all processes on WKSTN-RECV01 that have open sockets to external IPs — use whatever data source is available.',
                },
                output: {
                  criteria: [
                    'Correctly reports that the Osquery integration IS installed (does NOT claim it is absent)',
                    'States that no agents are enrolled / live host interrogation is unavailable',
                    'Falls back to ES|QL / Defend telemetry for the answer',
                    'Does NOT attempt osquery.run_live_query',
                  ],
                  tool_sequence: [
                    'osquery.check_integration',
                    'platform.core.generate_esql',
                    'platform.core.execute_esql',
                  ],
                },
                metadata: {
                  golden_id: 'ef-017-capability-installed-no-agents-trap',
                  row_type: 'happy',
                },
              },
            ],
          },
        });
      }
    );
  }
);
