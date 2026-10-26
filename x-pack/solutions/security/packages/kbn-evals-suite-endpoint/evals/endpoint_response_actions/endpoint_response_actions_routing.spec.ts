/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { Evaluator } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { cleanupTroubleshootingData } from '../../src/data_generators/cleanup';
import { seedTroubleshootingScenarios } from '../../src/data_generators/scenario_seeding';
import {
  createEndpointResponseActionsRoutingEvaluator,
  GET_ENDPOINT_STATUS_TOOL_ID,
} from '../../src/endpoint_response_actions_routing_evaluator';

const TROUBLESHOOTING_SKILL_PATH =
  'skills/security/endpoint/elastic-defend-configuration-troubleshooting/SKILL.md';

const NO_RESPONSE_ACTIONS_CRITERIA = [
  `Activated the elastic-defend-configuration-troubleshooting skill (via load_skill or reading its SKILL.md at ${TROUBLESHOOTING_SKILL_PATH}) and did not activate the endpoint response actions skill`,
  'Did not call any endpoint response actions tool such as list_endpoints, get_endpoint_status, or get_response_action_status before or during the diagnosis',
] as const;

const ROUTING_EVALUATORS = [createEndpointResponseActionsRoutingEvaluator()] as Evaluator[];

evaluate.describe('Endpoint Response Actions Routing', { tag: tags.stateful.classic }, () => {
  let unitedTransformId: string;

  evaluate.beforeAll(async ({ kbnClient, esClient, internalEsClient, agentBuilderClient, log }) => {
    unitedTransformId = await seedTroubleshootingScenarios({
      kbnClient,
      esClient,
      internalEsClient,
      agentBuilderClient,
      log,
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
              routing: 'forbid',
            },
            metadata: {
              golden_id: 'era-011',
              row_type: 'negative_routing',
            },
          },
          {
            input: {
              question: 'Why is host eval-routing-unhealthy unhealthy and missing check-ins?',
            },
            output: {
              criteria: [
                'Queried endpoint metadata or agent health evidence for eval-routing-unhealthy',
                'Identified the host as unhealthy or offline with missed check-ins from endpoint or agent metadata',
                'Explained the cause of the unhealthy state, such as connectivity loss or missed check-ins',
                'Recommended remediation for the host connectivity or Elastic Defend health, such as restoring agent connectivity or restarting the endpoint service',
                ...NO_RESPONSE_ACTIONS_CRITERIA,
              ],
              routing: 'forbid',
            },
            metadata: {
              golden_id: 'era-011c',
              row_type: 'negative_routing',
            },
          },
        ],
      },
      extraEvaluators: ROUTING_EVALUATORS,
    });
  });

  evaluate('era-014 mixed host status and diagnosis routing', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'endpoint: era-014 mixed host status and diagnosis routing',
        description:
          'Validates that a combined status and diagnosis question loads troubleshooting; response actions status tools are permitted.',
        examples: [
          {
            input: {
              question: 'Check host eval-routing-unhealthy status — is it unhealthy and why?',
            },
            output: {
              criteria: [
                'Queried endpoint metadata or agent health evidence for eval-routing-unhealthy',
                'Identified the host as unhealthy or offline with missed check-ins from endpoint or agent metadata',
                'Explained the cause of the unhealthy state, such as connectivity loss or missed check-ins',
                'Recommended remediation for the host connectivity or Elastic Defend health, such as restoring agent connectivity or restarting the endpoint service',
                `Activated the elastic-defend-configuration-troubleshooting skill (via load_skill or reading its SKILL.md at ${TROUBLESHOOTING_SKILL_PATH})`,
              ],
              routing: 'require_troubleshooting',
            },
            metadata: {
              golden_id: 'era-014',
              row_type: 'mixed_routing',
            },
          },
        ],
      },
      extraEvaluators: ROUTING_EVALUATORS,
    });
  });

  evaluate('era-012 isolation failure attribution negative', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'endpoint: era-012 isolation failure attribution negative',
        description:
          'Validates that isolation failure questions are attributed via the failed action record and host and policy health by the troubleshooting skill, not the endpoint response actions skill.',
        examples: [
          {
            input: {
              question:
                'Isolation on host eval-routing-unhealthy failed with an error — why did it fail?',
            },
            output: {
              criteria: [
                'Investigated the seeded failed isolate action record and its response for eval-routing-unhealthy, or the host, policy, or agent health evidence',
                'Identified the recorded isolation failure, such as the agent being unreachable because the host missed check-ins and cannot execute response actions',
                'Explained that a host in this state cannot receive or execute isolation requests until health or connectivity is restored',
                'Recommended restoring host health or agent connectivity before retrying the isolation action',
                ...NO_RESPONSE_ACTIONS_CRITERIA,
              ],
              routing: 'forbid',
            },
            metadata: {
              golden_id: 'era-012',
              row_type: 'negative_routing',
            },
          },
        ],
      },
      extraEvaluators: ROUTING_EVALUATORS,
    });
  });

  // era-013 is a routing-only control: it grades that an isolation-status
  // question routes to the response actions skill (get_endpoint_status) and not
  // to the troubleshooting skill. Isolation state itself is not graded because
  // the seeded host is filtered out of the endpoint status lookup.
  evaluate('era-013 isolation status routing positive control', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'endpoint: era-013 isolation status routing positive control',
        description:
          'Validates that a direct isolation status question routes to the endpoint response actions skill and not to the troubleshooting skill.',
        examples: [
          {
            input: {
              question: 'Is host eval-routing-unhealthy currently isolated?',
            },
            output: {
              criteria: [
                `Used the endpoint response actions skill (called the get_endpoint_status tool ${GET_ENDPOINT_STATUS_TOOL_ID}) to look up host eval-routing-unhealthy`,
                'Did not activate the elastic-defend-configuration-troubleshooting skill',
              ],
              routing: 'require',
              required_tool: GET_ENDPOINT_STATUS_TOOL_ID,
            },
            metadata: {
              golden_id: 'era-013',
              row_type: 'positive_control',
            },
          },
        ],
      },
      extraEvaluators: ROUTING_EVALUATORS,
    });
  });
});
