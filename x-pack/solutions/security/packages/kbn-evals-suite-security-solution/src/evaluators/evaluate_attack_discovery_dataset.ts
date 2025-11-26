/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DefaultEvaluators,
  EvaluationDataset,
  Evaluator,
  KibanaPhoenixClient,
} from '@kbn/evals';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import type {
  AttackDiscoveryEvaluationClient,
  AttackDiscoveryExampleInputWithOverrides,
} from '../clients';
import { createCriteriaEvaluator } from './evaluate_dataset';

interface AttackDiscoveryOutput {
  insights?: AttackDiscovery[] | null;
  attackDiscoveries?: AttackDiscovery[] | null;
}

/**
 * Validates that the output contains attack discoveries
 */
function hasValidAttackDiscoveries(output: unknown): output is AttackDiscoveryOutput {
  if (!output || typeof output !== 'object') {
    return false;
  }

  const outputObj = output as AttackDiscoveryOutput;
  const discoveries = outputObj.insights ?? outputObj.attackDiscoveries;

  return Array.isArray(discoveries) && discoveries.length > 0;
}

/**
 * Creates a Phoenix-compatible evaluator for attack discovery structural validation.
 *
 * This evaluator validates:
 * - Output contains insights or attackDiscoveries array
 * - Array has at least one discovery
 * - Each discovery has required fields (title, summary)
 */
export function createAttackDiscoveryStructureEvaluator(): Evaluator {
  return {
    name: 'attack_discovery_structure',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      if (!hasValidAttackDiscoveries(output)) {
        return {
          score: 0,
          label: 'FAIL',
          explanation: 'No attack discoveries generated',
        };
      }

      const outputObj = output as AttackDiscoveryOutput;
      const discoveries = outputObj.insights ?? outputObj.attackDiscoveries ?? [];

      // Validate each discovery has required fields
      const invalidDiscoveries = discoveries.filter(
        (d) => !d.title || !d.summaryMarkdown || !d.entitySummaryMarkdown
      );

      if (invalidDiscoveries.length > 0) {
        return {
          score: 0.5,
          label: 'PARTIAL',
          explanation: `Generated ${discoveries.length} discovery(ies) but ${invalidDiscoveries.length} missing required fields`,
          metadata: {
            totalDiscoveries: discoveries.length,
            invalidCount: invalidDiscoveries.length,
          },
        };
      }

      return {
        score: 1,
        label: 'PASS',
        explanation: `Generated ${discoveries.length} valid attack discovery(ies)`,
        metadata: {
          totalDiscoveries: discoveries.length,
        },
      };
    },
  };
}

interface AttackDiscoveryDatasetExample extends Example {
  input: AttackDiscoveryExampleInputWithOverrides;
  output: {
    reference?: string;
    criteria?: string[];
    expectedInsights?: Array<{
      title: string;
      alertIds?: string[];
      detailsMarkdown?: string;
      entitySummaryMarkdown?: string;
      summaryMarkdown?: string;
    }>;
  };
}

export type EvaluateAttackDiscoveryDataset = ({
  dataset,
  alertsIndexPattern,
  size,
}: {
  dataset: {
    name: string;
    description: string;
    examples: AttackDiscoveryDatasetExample[];
  };
  alertsIndexPattern?: string;
  size?: number;
}) => Promise<void>;

export function createEvaluateAttackDiscoveryDataset({
  attackDiscoveryClient,
  evaluators,
  phoenixClient,
}: {
  attackDiscoveryClient: AttackDiscoveryEvaluationClient;
  evaluators: DefaultEvaluators;
  phoenixClient: KibanaPhoenixClient;
}): EvaluateAttackDiscoveryDataset {
  return async function evaluateAttackDiscoveryDataset({
    dataset: { name, description, examples },
    alertsIndexPattern = '.alerts-security.alerts-default',
    size = 100,
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    await phoenixClient.runExperiment(
      {
        dataset,
        task: async ({ input, output, metadata }) => {
          // Run Attack Discovery with the input overrides from the dataset
          const result = await attackDiscoveryClient.evaluate({
            input: input as AttackDiscoveryExampleInputWithOverrides,
            alertsIndexPattern,
            size,
          });

          return {
            insights: result.insights,
            replacements: result.replacements,
            errors: result.errors,
            insightCount: result.insights?.length ?? 0,
          };
        },
      },
      [
        // LLM-as-a-judge criteria evaluator
        createCriteriaEvaluator({ evaluators }),
        // Structural validation evaluator (CODE-based, validates discovery structure)
        createAttackDiscoveryStructureEvaluator(),
      ]
    );
  };
}
