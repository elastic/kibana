/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { METADATA_UNITED_TRANSFORM } from '@kbn/security-solution-plugin/common/endpoint/constants';
import { evaluate } from '../../src/evaluate';
import {
  waitForEndpointPackage,
  waitForTransformPropagation,
  seedScenario,
  SCENARIOS,
} from '../../src/data_generators/endpoint_data';
import { cleanupSeededData } from '../../src/data_generators/cleanup';

const SKILL_PATH = 'skills/security/endpoint/elastic_defend_configuration_troubleshooting/SKILL.md';
const UNITED_TRANSFORM_WILDCARD = `${METADATA_UNITED_TRANSFORM}*`;

evaluate.describe('Automatic Troubleshooting', { tag: tags.stateful.classic }, () => {
  let unitedTransformId: string;

  evaluate.beforeAll(async ({ kbnClient, esClient, internalEsClient, chatClient, log }) => {
    await waitForEndpointPackage(kbnClient, esClient, log);

    const { transforms } = await esClient.transform.getTransformStats({
      transform_id: UNITED_TRANSFORM_WILDCARD,
    });
    unitedTransformId = transforms[0].id;

    try {
      await chatClient.converse({ message: 'hello' });
    } catch (e) {
      log.warning(`Warmup failed: ${e}`);
    }

    const clients = { esClient, internalEsClient };
    // waiting for transforms takes a while so seed all scenarios here
    await seedScenario(clients, SCENARIOS.incompatibleAntivirus);
    await seedScenario(clients, SCENARIOS.policyResponseFailure);
    await seedScenario(clients, SCENARIOS.stoppedUnitedTransform);

    await waitForTransformPropagation(esClient, log, {
      metadataCurrent: 3,
      metadataUnited: 3,
    });
  });

  evaluate('incompatible antivirus detection', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'endpoint: incompatible antivirus detection',
        description:
          'Validates that the agent detects incompatible antivirus software on an endpoint.',
        examples: [
          {
            input: {
              question:
                'Can you check if endpoint eval-host-av has any conflicting antivirus software?',
            },
            output: {
              criteria: [
                `Activated the troubleshooting skill by reading ${SKILL_PATH}`,
                'Queried endpoint metadata or process events to investigate the issue',
                'Identified incompatible antivirus software on the endpoint',
                'Called generate_insight to persist structured findings',
              ],
            },
          },
        ],
      },
    });
  });

  evaluate('policy response failure', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'endpoint: policy response failure',
        description:
          'Validates that the agent identifies a policy application failure and its root cause.',
        examples: [
          {
            input: {
              question: 'I see a policy failure on host eval-host-policy. Can you troubleshoot?',
            },
            output: {
              criteria: [
                `Activated the troubleshooting skill by reading ${SKILL_PATH}`,
                'Queried policy response data to investigate the failure',
                'Identified the policy application failure and its cause',
                'Called generate_insight to persist structured findings',
              ],
            },
          },
        ],
      },
    });
  });

  evaluate.describe('with stopped united transform', () => {
    evaluate.beforeAll(async ({ esClient }) => {
      await esClient.transform.stopTransform({
        transform_id: UNITED_TRANSFORM_WILDCARD,
        wait_for_completion: true,
      });
    });

    evaluate('stopped united transform', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'endpoint: stopped united transform',
          description:
            'Validates that the agent detects a stopped united metadata transform and recommends restarting it.',
          examples: [
            {
              input: {
                question: 'I am missing endpoints on the endpoint list page. Can you troubleshoot?',
              },
              output: {
                criteria: [
                  `Activated the troubleshooting skill by reading ${SKILL_PATH}`,
                  'Called get_package_configurations to inspect transform settings and stats',
                  'Identified that the endpoint.metadata_united transform is stopped',
                  'Recommended restarting the stopped transform as a remediation step',
                  'Called generate_insight to persist structured findings',
                ],
              },
            },
          ],
        },
      });
    });

    evaluate.afterAll(async ({ esClient, log }) => {
      try {
        await esClient.transform.startTransform({
          transform_id: unitedTransformId,
        });
      } catch (e) {
        log.warning(`Failed to restart transform: ${e}`);
      }
    });
  });

  evaluate.afterAll(async ({ esClient, internalEsClient }) => {
    // defensive restart in case scenario 3 failed mid-execution and the nested afterAll
    // didn't run. Safe no-op if the transform is already started or doesn't exist.
    try {
      await esClient.transform.startTransform({
        transform_id: unitedTransformId,
      });
    } catch {
      // noop
    }

    await esClient.deleteByQuery({
      index: '.edr-workflow-insights-*',
      query: { match_all: {} },
      refresh: true,
      ignore_unavailable: true,
    });

    await cleanupSeededData({ esClient, internalEsClient });
  });
});
