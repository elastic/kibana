/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { InferenceConnector } from '@kbn/inference-common';
import type { CombinedPrompts } from '@kbn/discoveries/impl/attack_discovery/graphs';
import { getPromptsByGroupId } from '../../prompt';
import { promptDictionary, promptGroupId } from '../../prompt/local_prompt_object';

export type { CombinedPrompts };

/**
 * Fetches Attack Discovery prompts using the same mechanism as elastic_assistant:
 * - Looks up prompts from saved objects (user customizations)
 * - Falls back to local prompts defined in this plugin
 *
 * This is identical to elastic_assistant's getAttackDiscoveryPrompts but uses
 * our own local prompts to avoid dependency on that plugin.
 */
export const getAttackDiscoveryPrompts = async ({
  connectorId,
  getInferenceConnectorById,
  model,
  provider,
  savedObjectsClient,
}: {
  connectorId: string;
  getInferenceConnectorById?: (id: string) => Promise<InferenceConnector>;
  model?: string;
  provider?: string;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<CombinedPrompts> => {
  const prompts = await getPromptsByGroupId({
    connectorId,
    getInferenceConnectorById,
    model,
    promptGroupId: promptGroupId.attackDiscovery,
    promptIds: [
      promptDictionary.attackDiscoveryDefault,
      promptDictionary.attackDiscoveryRefine,
      promptDictionary.attackDiscoveryContinue,
      promptDictionary.attackDiscoveryDetailsMarkdown,
      promptDictionary.attackDiscoveryEntitySummaryMarkdown,
      promptDictionary.attackDiscoveryMitreAttackTactics,
      promptDictionary.attackDiscoverySummaryMarkdown,
      promptDictionary.attackDiscoveryGenerationTitle,
      promptDictionary.attackDiscoveryGenerationInsights,
    ],
    provider,
    savedObjectsClient,
  });

  return {
    continue:
      prompts.find((prompt) => prompt.promptId === promptDictionary.attackDiscoveryContinue)
        ?.prompt || '',
    default:
      prompts.find((prompt) => prompt.promptId === promptDictionary.attackDiscoveryDefault)
        ?.prompt || '',
    detailsMarkdown:
      prompts.find((prompt) => prompt.promptId === promptDictionary.attackDiscoveryDetailsMarkdown)
        ?.prompt || '',
    entitySummaryMarkdown:
      prompts.find(
        (prompt) => prompt.promptId === promptDictionary.attackDiscoveryEntitySummaryMarkdown
      )?.prompt || '',
    insights:
      prompts.find(
        (prompt) => prompt.promptId === promptDictionary.attackDiscoveryGenerationInsights
      )?.prompt || '',
    mitreAttackTactics:
      prompts.find(
        (prompt) => prompt.promptId === promptDictionary.attackDiscoveryMitreAttackTactics
      )?.prompt || '',
    refine:
      prompts.find((prompt) => prompt.promptId === promptDictionary.attackDiscoveryRefine)
        ?.prompt || '',
    summaryMarkdown:
      prompts.find((prompt) => prompt.promptId === promptDictionary.attackDiscoverySummaryMarkdown)
        ?.prompt || '',
    title:
      prompts.find((prompt) => prompt.promptId === promptDictionary.attackDiscoveryGenerationTitle)
        ?.prompt || '',
  };
};
