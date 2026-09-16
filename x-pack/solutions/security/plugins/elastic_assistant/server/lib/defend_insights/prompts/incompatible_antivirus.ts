/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { InferenceConnector } from '@kbn/inference-common';
import type { DefendInsightsCombinedPrompts } from '@kbn/discoveries';

import { getPromptsByGroupId, promptDictionary } from '../../prompt';
import { promptGroupId } from '../../prompt/local_prompt_object';

export async function getIncompatibleAntivirusPrompt({
  getInferenceConnectorById,
  connectorId,
  model,
  provider,
  savedObjectsClient,
}: {
  getInferenceConnectorById?: (id: string) => Promise<InferenceConnector>;
  connectorId: string;
  model?: string;
  provider?: string;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<DefendInsightsCombinedPrompts> {
  const prompts = await getPromptsByGroupId({
    getInferenceConnectorById,
    connectorId,
    model,
    promptGroupId: promptGroupId.defendInsights.incompatibleAntivirus,
    promptIds: [
      promptDictionary.defendInsightsIncompatibleAntivirusContinue,
      promptDictionary.defendInsightsIncompatibleAntivirusDefault,
      promptDictionary.defendInsightsIncompatibleAntivirusEvents,
      promptDictionary.defendInsightsIncompatibleAntivirusEventsEndpointId,
      promptDictionary.defendInsightsIncompatibleAntivirusEventsId,
      promptDictionary.defendInsightsIncompatibleAntivirusEventsValue,
      promptDictionary.defendInsightsIncompatibleAntivirusGroup,
      promptDictionary.defendInsightsIncompatibleAntivirusRefine,
    ],
    provider,
    savedObjectsClient,
  });

  const getPromptById = (id: string) =>
    prompts.find((prompt) => prompt.promptId === id)?.prompt || '';

  return {
    continue: getPromptById(promptDictionary.defendInsightsIncompatibleAntivirusContinue),
    default: getPromptById(promptDictionary.defendInsightsIncompatibleAntivirusDefault),
    events: getPromptById(promptDictionary.defendInsightsIncompatibleAntivirusEvents),
    eventsEndpointId: getPromptById(
      promptDictionary.defendInsightsIncompatibleAntivirusEventsEndpointId
    ),
    eventsId: getPromptById(promptDictionary.defendInsightsIncompatibleAntivirusEventsId),
    eventsValue: getPromptById(promptDictionary.defendInsightsIncompatibleAntivirusEventsValue),
    group: getPromptById(promptDictionary.defendInsightsIncompatibleAntivirusGroup),
    refine: getPromptById(promptDictionary.defendInsightsIncompatibleAntivirusRefine),
  };
}
