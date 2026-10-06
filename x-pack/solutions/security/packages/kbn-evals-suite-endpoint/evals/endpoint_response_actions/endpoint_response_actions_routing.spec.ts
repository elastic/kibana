/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.elastic.co/licensing/elastic-license
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { METADATA_UNITED_TRANSFORM } from '@kbn/security-solution-plugin/common/endpoint/constants';
import { evaluate } from '../../src/evaluate';
import {
  waitForEndpointPackage,
  waitForTransformPropagation,
  seedScenario,
  SCENARIOS,
} from '../../src/data_generators/endpoint_data';
import { cleanupTroubleshootingData } from '../../src/data_generators/cleanup';

const UNITED_TRANSFORM_WILDCARD = `${METADATA_UNITED_TRANSFORM}*`;
const ALL_SCENARIO_COUNT = Object.keys(SCENARIOS).length;

const TROUBLESHOOTING_SKILL_PATH =
  'skills/security/endpoint/elastic-defend-configuration-troubleshooting/SKILL.md';

const NO_RESPONSE_ACTIONS_CRITERIA = [
  `Activated the troubleshooting skill by reading ${TROUBLESHOOTING_SKILL_PATH} instead of the endpoint response actions skill`,
  'Did not call any endpoint_response_actions tool such as list_endpoints, get_endpoint_status, or get_response_action_status before or during the diagnosis',
] as const;

const FORBIDDEN_RESPONSE_ACTIONS_TOOLS = [
  'list_endpoints',
  'get_endpoint_status',
  'get_response_action_status',
] as const;

evaluate.describe('Endpoint Response Actions Routing', { tag: tags.stateful.classic }, () => {
  let unitedTransformId: string;

  evaluate.beforeAll(async ({ kbnClient, esClient, internalEsClient, agentBuilderClient, log }) => {
    await waitForEndpointPackage(kbnClient, esClient, log);

    const { transforms } = await esClient.transform.getTransformStats({
      transform_id: UNITED_TRANSFORM_WILDCARD,
    });
    unitedTransformId = transforms[0].id;

    try {
      await agentBuilderClient.converse({
        agentId: agentBuilderDefaultAgentId,
        input: 'hello',
      });
    } catch (e) {
      log.warning(`Warmup failed: ${e}`);
    }

    const clients = { esClient, internalEsClient };
    await cleanupTroubleshootingData(clients);

    for (const scenario of Object.values(SCENARIOS)) {
      await seedScenario(clients, scenario);
    }

    await waitForTransformPropagation(esClient, log, {
      metadataCurrent: ALL_SCENARIO_COUNT,
      metadataUnited: ALL_SCENARIO_COUNT,
    });
  });

  evaluate.afterAll(async ({ esClient, internalEsClient }) => {
    await esClient.transform
      .startTransform({ transform_id: unitedTransformId })
      .catch(() => undefined);
    await cleanupTroubleshootingData({ esClient, internalEsClient });
  });

  evaluate('era-011 host health routing negative', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'endpoint: era-011 host health routing negative',
        description:
          'Validates that host health and check-in questions route to the troubleshooting skill, not the endpoint response actions skill.',
        examples: [
          {
            input: {
              question: 'Why is host eval-routing-unhealthy offline and when did it last check in?',
            },
            output: {
              criteria: [
                'Queried endpoint metadata or agent health evidence for eval-routing-unhealthy',
                'Identified the host as unhealthy or offline with missed check-ins from endpoint or agent metadata',
                'Reported the last check-in time from the host metadata or agent records',
                'Explained the cause of the unhealthy state, such as connectivity loss or missed check-ins',
                'Recommended remediation for the host connectivity or Elastic Defend health, such as restoring agent connectivity or restarting the endpoint service',
                ...NO_RESPONSE_ACTIONS_CRITERIA,
              ],
            },
            metadata: {
              golden_id: 'era-011',
              row_type: 'negative_routing',
              forbidden_tools: [...FORBIDDEN_RESPONSE_ACTIONS_TOOLS],
            },
          },
        ],
      },
    });
  });

  evaluate('era-012 isolation failure attribution negative', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'endpoint: era-012 isolation failure attribution negative',
        description:
          'Validates that isolation failure questions are attributed via host and policy health by the troubleshooting skill, not the endpoint response actions skill.',
        examples: [
          {
            input: {
              question:
                'Isolation on host eval-routing-unhealthy failed with an error — why did it fail?',
            },
            output: {
              criteria: [
                'Investigated host, policy, or agent health evidence for eval-routing-unhealthy',
                'Attributed the isolation failure to the host being unhealthy or offline and unable to execute response actions',
                'Explained that a host in this state cannot receive or execute isolation requests until health or connectivity is restored',
                'Recommended restoring host health or agent connectivity before retrying the isolation action',
                ...NO_RESPONSE_ACTIONS_CRITERIA,
              ],
            },
            metadata: {
              golden_id: 'era-012',
              row_type: 'negative_routing',
              forbidden_tools: [...FORBIDDEN_RESPONSE_ACTIONS_TOOLS],
            },
          },
        ],
      },
    });
  });

  evaluate('era-013 isolation status positive control', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'endpoint: era-013 isolation status positive control',
        description:
          'Validates that a direct isolation status question activates the endpoint response actions skill.',
        examples: [
          {
            input: {
              question: 'Is host eval-routing-unhealthy currently isolated?',
            },
            output: {
              criteria: [
                'Called the get_endpoint_status tool of the endpoint-response-actions skill, resolving the hostname eval-routing-unhealthy via the response actions service',
                'Reported the host isolation state, such as isolated or not isolated, from the endpoint status',
              ],
            },
            metadata: {
              golden_id: 'era-013',
              row_type: 'positive_control',
              tool_sequence: ['get_endpoint_status'],
            },
          },
        ],
      },
    });
  });
});
