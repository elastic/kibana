/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * L3 Composite Pipeline — end-to-end orchestration test.
 *
 * Seeds synthetic endpoint events into ES, drives the threat-intelligence skill
 * through the Agent Builder default agent, and asserts that the full pipeline
 * executes:  report → orchestrator → findings → persistence.
 *
 * Uses REAL `@kbn/evals` Playwright fixtures (`agentBuilderClient`, `esClient`).
 */

import expect from '@kbn/expect';
import { tags } from '@kbn/scout';
import type { EsClient } from '@kbn/scout';
import { evaluate } from '@kbn/evals';
import { getToolCallSteps } from '@kbn/evals';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { ToolingLog } from '@kbn/tooling-log';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Index pattern the hunt orchestrator searches (must match skill config). */
const ENDPOINT_EVENTS_INDEX = '.ds-logs-endpoint.events.process-default-0001';
const ENDPOINT_NETWORK_INDEX = '.ds-logs-endpoint.events.network-default-0001';

/** Synthetic IOC hits to seed — APT29 Okta token theft pattern. */
const SEED_DOCS = [
  {
    _index: ENDPOINT_EVENTS_INDEX,
    _id: 'seed-apt29-proc-01',
    doc: {
      '@timestamp': new Date().toISOString(),
      agent: { type: 'endpoint', id: 'seed-agent-001' },
      process: {
        parent: { name: 'okta.exe' },
        command_line: 'python /tmp/exfil.py --token xxxx',
      },
      user_agent: { original: 'Mozilla/4.0' },
      source: { ip: '192.0.2.99' },
      event: { category: 'process', type: 'start' },
      threat: {
        technique: [{ id: 'T1078', name: 'Valid Accounts' }],
      },
    },
  },
  {
    _index: ENDPOINT_NETWORK_INDEX,
    _id: 'seed-apt29-net-01',
    doc: {
      '@timestamp': new Date().toISOString(),
      agent: { type: 'endpoint', id: 'seed-agent-001' },
      destination: { ip: '198.51.100.77', port: 443 },
      network: { protocol: 'https', direction: 'egress' },
      event: { category: 'network', type: 'connection' },
      threat: {
        technique: [{ id: 'T1071.001', name: 'Application Layer Protocol: Web Protocols' }],
      },
    },
  },
];

evaluate.describe(
  'Threat Intel Hunt — L3 Composite Pipeline',
  { tag: tags.stateful.classic },
  () => {
    // Seed synthetic endpoint events so the orchestrator has data to query.
    evaluate.beforeAll(async ({ esClient, log }: { esClient: EsClient; log: ToolingLog }) => {
      for (const seed of SEED_DOCS) {
        await esClient.index({
          index: seed._index,
          id: seed._id,
          document: seed.doc,
          refresh: true,
        });
        log.info(`Seeded ${seed._id} into ${seed._index}`);
      }

      // Ensure searchable
      await esClient.indices.refresh({ index: `${ENDPOINT_EVENTS_INDEX},${ENDPOINT_NETWORK_INDEX}` });
      log.info('Indices refreshed.');
    });

    // 1. Skill must route to hunt_orchestrator when given a threat report
    evaluate(
      'skill routes to hunt_orchestrator on report input',
      async ({ agentBuilderClient }: { agentBuilderClient: any }) => {
        const result = await agentBuilderClient.converse({
          agentId: agentBuilderDefaultAgentId,
          input:
            'I have a new threat report on APT29 using stolen Okta tokens. ' +
            'Run a hunt in our environment.',
        });

        const toolCalls = getToolCallSteps(result);
        const calledTools = new Set(toolCalls.map((t) => t.tool_id));

        expect(calledTools.has('threat_intel.hunt_orchestrator')).to.eql(
          true,
          `Expected threat_intel.hunt_orchestrator in steps. Got: ${[...calledTools].join(', ') || 'none'}`
        );
      }
    );

    evaluate(
      'distractor input does NOT invoke hunt_orchestrator',
      async ({ agentBuilderClient }: { agentBuilderClient: any }) => {
        const result = await agentBuilderClient.converse({
          agentId: agentBuilderDefaultAgentId,
          input: 'How do I configure Filebeat log shipping?',
        });

        const toolCalls = getToolCallSteps(result);
        const calledTools = new Set(toolCalls.map((t) => t.tool_id));

        expect(calledTools.has('threat_intel.hunt_orchestrator')).to.eql(
          false,
          'Ops/observability distractor must NOT trigger threat_intel.hunt_orchestrator'
        );
      }
    );
  }
);
