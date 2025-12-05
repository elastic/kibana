/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import type { Evaluator } from '@arizeai/phoenix-client/dist/esm/types/experiments';

export interface AttackDiscoveryOutput {
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

/**
 * @deprecated Provided for backward compatibility with existing test mocks.
 * Use createAttackDiscoveryStructureEvaluator() for Phoenix-compatible evaluator.
 */
export const getCustomEvaluator = (): unknown => {
  return createAttackDiscoveryStructureEvaluator();
};
