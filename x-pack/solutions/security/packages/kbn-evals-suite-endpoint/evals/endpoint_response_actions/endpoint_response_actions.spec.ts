/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import {
  waitForEndpointPackage,
  waitForTransformPropagation,
  seedScenario,
} from '../../src/data_generators/endpoint_data';
import { cleanupResponseActionsData } from '../../src/data_generators/cleanup';

const SKILL_PATH = 'skills/security/endpoint/endpoint-response-actions/SKILL.md';

evaluate.describe('Endpoint Response Actions', { tag: tags.stateful.classic }, () => {
  evaluate.beforeAll(async ({ kbnClient, esClient, internalEsClient, agentBuilderClient, log }) => {
    await waitForEndpointPackage(kbnClient, esClient, log);

    try {
      await agentBuilderClient.converse({
        agentId: agentBuilderDefaultAgentId,
        input: 'hello',
      });
    } catch (e) {
      log.warning(`Warmup failed: ${e}`);
    }

    const clients = { esClient, internalEsClient, kbnClient };
    // Seed endpoint data for response-action tests
    await seedScenario(clients, {
      agentId: 'eval-agent-ts-isolate-001',
      hostName: 'eval-host-isolate',
      os: { name: 'Windows', version: '10' },
      policyName: 'eval-policy-response',
      policyStatus: 'success',
    });
    await seedScenario(clients, {
      agentId: 'eval-agent-ts-release-001',
      hostName: 'eval-host-release',
      os: { name: 'Linux', version: 'Ubuntu 22.04' },
      policyName: 'eval-policy-response',
      policyStatus: 'success',
    });

    await waitForTransformPropagation(esClient, log, {
      metadataCurrent: 2,
      metadataUnited: 2,
    });
  });

  evaluate.afterAll(async ({ esClient, internalEsClient }) => {
    await cleanupResponseActionsData({ esClient, internalEsClient });
  });

  // ---------------------------------------------------------------------------
  // Scenario 1: Isolate host via natural language
  // ---------------------------------------------------------------------------
  evaluate('isolate host via natural language command', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'endpoint-response-actions: isolate host NL',
        description:
          'Validates that the agent parses an isolate command from natural language, ' +
          'resolves the host to an endpoint ID, and invokes the isolation skill with ' +
          'a confirmation step.',
        examples: [
          {
            input: {
              question: 'Isolate host eval-host-isolate',
            },
            output: {
              criteria: [
                `Activated the endpoint response actions skill by reading ${SKILL_PATH}`,
                'Resolved host name "eval-host-isolate" to an endpoint/agent ID',
                'Presented a confirmation prompt before executing the isolation',
                'Called the endpoint-response-actions.isolate_host inline tool',
                'Reported the isolation result (success or pending) back to the user',
              ],
              tool_sequence: ['endpoint-response-actions.isolate_host'],
            },
            metadata: { golden_id: 'era-001-isolate-host', row_type: 'happy' },
          },
        ],
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 2: Release host via natural language
  // ---------------------------------------------------------------------------
  evaluate('release host via natural language command', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'endpoint-response-actions: release host NL',
        description:
          'Validates that the agent parses a release/unisolate command from natural language, ' +
          'resolves the host, and invokes the un-isolation skill with confirmation.',
        examples: [
          {
            input: {
              question: 'Release eval-host-release from isolation',
            },
            output: {
              criteria: [
                `Activated the endpoint response actions skill by reading ${SKILL_PATH}`,
                'Resolved host name "eval-host-release" to an endpoint/agent ID',
                'Presented a confirmation prompt before executing the release',
                'Called the endpoint-response-actions.unisolate_host inline tool',
                'Reported the release result back to the user',
              ],
              tool_sequence: ['endpoint-response-actions.unisolate_host'],
            },
            metadata: { golden_id: 'era-002-release-host', row_type: 'happy' },
          },
        ],
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 3: List endpoints before isolation
  // ---------------------------------------------------------------------------
  evaluate('list endpoints before taking action', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'endpoint-response-actions: list endpoints',
        description:
          'Validates that the agent can list available endpoints when the user asks ' +
          'for context before deciding which host to isolate.',
        examples: [
          {
            input: {
              question: 'Show me all endpoints that are currently online',
            },
            output: {
              criteria: [
                `Activated the endpoint response actions skill by reading ${SKILL_PATH}`,
                'Called the endpoint-response-actions.list_endpoints inline tool',
                'Returned a list of endpoints including at least eval-host-isolate and eval-host-release',
                'Did not attempt to isolate any host without explicit user confirmation',
              ],
              tool_sequence: ['endpoint-response-actions.list_endpoints'],
            },
            metadata: { golden_id: 'era-003-list-endpoints', row_type: 'happy' },
          },
        ],
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 4: Follow up on a prior response action by action ID
  // ---------------------------------------------------------------------------
  evaluate('look up prior response action status by action ID', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'endpoint-response-actions: action status follow-up',
        description:
          'Validates that the agent uses the read-only get_response_action_status tool ' +
          'when the analyst asks about a previously dispatched response action, instead of ' +
          'falling back to platform.core.search or raw Elasticsearch queries.',
        examples: [
          {
            input: {
              question:
                'Can you check the status of response action 8d043de1-a9ea-4dc9-ae41-2a5ff7dc693e?',
            },
            output: {
              criteria: [
                `Activated the endpoint response actions skill by reading ${SKILL_PATH}`,
                'Called endpoint-response-actions.get_response_action_status with action ID 8d043de1-a9ea-4dc9-ae41-2a5ff7dc693e',
                'Did not use platform.core.search or raw Elasticsearch queries to look up the action status',
                'Reported the lookup result to the analyst (action status if found, or a clear not-found message)',
              ],
              tool_sequence: ['endpoint-response-actions.get_response_action_status'],
            },
            metadata: { golden_id: 'era-004-action-status-by-id', row_type: 'happy' },
          },
          {
            input: {
              question:
                'The malware scan on eval-host-isolate returned pending earlier — what is the status of action c1db8485-5110-4fef-a683-d5c037a65de5 now?',
            },
            output: {
              criteria: [
                `Activated the endpoint response actions skill by reading ${SKILL_PATH}`,
                'Called endpoint-response-actions.get_response_action_status with action ID c1db8485-5110-4fef-a683-d5c037a65de5',
                'Did not dispatch a new scan or other write action just to check status',
                'Reported the current action status or a clear not-found message to the analyst',
              ],
              tool_sequence: ['endpoint-response-actions.get_response_action_status'],
            },
            metadata: { golden_id: 'era-005-pending-scan-status', row_type: 'happy' },
          },
          {
            input: {
              question: "What's the weather in Amsterdam today?",
            },
            output: {
              criteria: [
                'Did not activate the endpoint response actions skill',
                'Did not call endpoint-response-actions.get_response_action_status',
                'Did not attempt to isolate, release, or scan any endpoint',
              ],
            },
            metadata: { golden_id: 'era-distractor-weather', row_type: 'distractor' },
          },
        ],
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 5: Get endpoint status by hostname
  // ---------------------------------------------------------------------------
  evaluate('get endpoint status by hostname', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'endpoint-response-actions: endpoint status by hostname',
        description:
          'Validates that the agent resolves a hostname and calls get_endpoint_status ' +
          'to report isolation state and online/offline status.',
        examples: [
          {
            input: {
              question: 'What is the current status of eval-host-isolate? Is it isolated?',
            },
            output: {
              criteria: [
                `Activated the endpoint response actions skill by reading ${SKILL_PATH}`,
                'Passed host name "eval-host-isolate" to the endpoint status tool (the tool resolves it to an endpoint/agent ID internally)',
                'Called the endpoint-response-actions.get_endpoint_status inline tool',
                'Reported the host status (online/offline) and isolation state',
              ],
              tool_sequence: ['endpoint-response-actions.get_endpoint_status'],
            },
            metadata: { golden_id: 'era-006-endpoint-status', row_type: 'happy' },
          },
        ],
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 6: List running processes on a host
  // ---------------------------------------------------------------------------
  evaluate('list running processes on a host', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'endpoint-response-actions: running processes',
        description:
          'Validates that the agent resolves a hostname and calls running_processes ' +
          'to enumerate active processes on the endpoint.',
        examples: [
          {
            input: {
              question: 'Show me the running processes on eval-host-isolate',
            },
            output: {
              criteria: [
                `Activated the endpoint response actions skill by reading ${SKILL_PATH}`,
                'Passed host name "eval-host-isolate" to the running processes tool (the tool resolves it to an endpoint/agent ID internally)',
                'Called the endpoint-response-actions.running_processes inline tool',
                'Reported the process list or a clear not-found message',
              ],
              tool_sequence: ['endpoint-response-actions.running_processes'],
            },
            metadata: { golden_id: 'era-007-running-processes', row_type: 'happy' },
          },
        ],
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 7: Scan a path on a host
  // ---------------------------------------------------------------------------
  evaluate('scan a path on a host', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'endpoint-response-actions: scan path',
        description:
          'Validates that the agent resolves a hostname and calls scan to trigger ' +
          'a malware scan on a specific path, with confirmation.',
        examples: [
          {
            input: {
              question: 'Scan /tmp/suspicious on eval-host-isolate for malware',
            },
            output: {
              criteria: [
                `Activated the endpoint response actions skill by reading ${SKILL_PATH}`,
                'Passed host name "eval-host-isolate" to the scan tool (the tool resolves it to an endpoint/agent ID internally)',
                'Called the endpoint-response-actions.scan inline tool',
                'Surfaced the Agent Builder confirmation card for the scan write action (the skill instructs the agent to call write tools directly and let Agent Builder present the confirmation, not ask in chat)',
                'Reported the scan result (success or pending) back to the user',
              ],
              tool_sequence: ['endpoint-response-actions.scan'],
            },
            metadata: { golden_id: 'era-008-scan-path', row_type: 'happy' },
          },
        ],
      },
    });
  });
});
