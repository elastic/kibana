/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { waitForEndpointPackage } from '../../src/data_generators/endpoint_data';
import { seedForensicTimeline } from '../../src/data_generators/forensic_data';
import { cleanupForensicData } from '../../src/data_generators/cleanup';
import {
  seedOsqueryInstalledNoAgents,
  cleanupOsqueryInstalledNoAgents,
} from '../../src/data_generators/osquery_trap';

/**
 * Capability-detection trap — runs in its own spec so it can be invoked as a
 * separate stack invocation (`--grep "Osquery capability trap"`).
 *
 * The trap state (Osquery installed, no agents enrolled) is mutually exclusive
 * with the smoke suite's "Osquery not installed" scenario, so the two cannot
 * share one eval run's stack. Seeding once in beforeAll — and keeping the
 * package installed for the whole run — also avoids the per-worker
 * install/uninstall race that made per-scenario seeding collide.
 */
evaluate.describe(
  'Endpoint Forensic Analysis — Osquery capability trap',
  { tag: tags.stateful.classic },
  () => {
    let trapIds: { agentPolicyId: string; packagePolicyId: string } | undefined;

    evaluate.beforeAll(
      async ({ kbnClient, esClient, internalEsClient, agentBuilderClient, log }) => {
        await waitForEndpointPackage(kbnClient, esClient, log);
        await cleanupForensicData({ esClient, internalEsClient });
        await seedForensicTimeline({ esClient }, log);

        // Seed the trap state ONCE for the whole run: osquery_manager installed
        // and attached to an empty agent policy, so installed=true but
        // agents_enrolled=false for every model worker.
        trapIds = await seedOsqueryInstalledNoAgents(kbnClient, log);

        try {
          await agentBuilderClient.converse({
            agentId: agentBuilderDefaultAgentId,
            input: 'hello',
          });
        } catch (e) {
          log.warning(`Warmup failed: ${e}`);
        }
      }
    );

    evaluate.afterAll(async ({ kbnClient, esClient, internalEsClient, log }) => {
      if (trapIds) {
        await cleanupOsqueryInstalledNoAgents(kbnClient, log, trapIds);
      }
      await cleanupForensicData({ esClient, internalEsClient });
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
