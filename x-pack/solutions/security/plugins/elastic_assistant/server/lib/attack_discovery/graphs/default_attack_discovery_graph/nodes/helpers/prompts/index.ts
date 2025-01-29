/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { getPromptsByGroupId, promptDictionary } from '../../../../../../prompt';
import { promptGroupId } from '../../../../../../prompt/local_prompt_object';

export interface AttackDiscoveryPrompts {
  default: string;
  refine: string;
  continue: string;
}

export interface GenerationPrompts {
  detailsMarkdown: string;
  entitySummaryMarkdown: string;
  mitreAttackTactics: string;
  summaryMarkdown: string;
  title: string;
  insights: string;
}

export interface CombinedPrompts extends AttackDiscoveryPrompts, GenerationPrompts {}

export const getAttackDiscoveryPrompts = async ({
  actionsClient,
  connector,
  connectorId,
  model,
  provider,
  savedObjectsClient,
}: {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connector?: Connector;
  connectorId: string;
  model?: string;
  provider?: string;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<CombinedPrompts> => {
  const prompts = await getPromptsByGroupId({
    actionsClient,
    connector,
    connectorId,
    // if in future oss has different prompt, add it as model here
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
    default:
      prompts.find((prompt) => prompt.promptId === promptDictionary.attackDiscoveryDefault)
        ?.prompt || '',
    refine:
      prompts.find((prompt) => prompt.promptId === promptDictionary.attackDiscoveryRefine)
        ?.prompt || '',
    continue:
      prompts.find((prompt) => prompt.promptId === promptDictionary.attackDiscoveryContinue)
        ?.prompt || '',
    detailsMarkdown:
      prompts.find((prompt) => prompt.promptId === promptDictionary.attackDiscoveryDetailsMarkdown)
        ?.prompt || '',
    entitySummaryMarkdown:
      prompts.find(
        (prompt) => prompt.promptId === promptDictionary.attackDiscoveryEntitySummaryMarkdown
      )?.prompt || '',
    mitreAttackTactics:
      prompts.find(
        (prompt) => prompt.promptId === promptDictionary.attackDiscoveryMitreAttackTactics
      )?.prompt || '',
    summaryMarkdown:
      prompts.find((prompt) => prompt.promptId === promptDictionary.attackDiscoverySummaryMarkdown)
        ?.prompt || '',
    title:
      prompts.find((prompt) => prompt.promptId === promptDictionary.attackDiscoveryGenerationTitle)
        ?.prompt || '',
    insights:
      prompts.find(
        (prompt) => prompt.promptId === promptDictionary.attackDiscoveryGenerationInsights
      )?.prompt || '',
  };
};
