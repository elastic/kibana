/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { promptDictionary, getPromptsByGroupId } from '../../../../prompt';
import { promptGroupId } from '../../../../prompt/local_prompt_object';

// We may need to differentiate between insights in the future, keeping the type for now
export interface DefendInsightsPrompts {
  default: string;
  refine: string;
  continue: string;
}
// We may need to differentiate between insights in the future, keeping the type for now
export interface DefendInsightsGenerationPrompts {
  group: string;
  events: string;
  eventsId: string;
  eventsEndpointId: string;
  eventsValue: string;
}

export interface DefendInsightsCombinedPrompts
  extends DefendInsightsPrompts,
    DefendInsightsGenerationPrompts {}

export async function getIncompatibleAntivirusPrompt({
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
}): Promise<DefendInsightsCombinedPrompts> {
  const prompts = await getPromptsByGroupId({
    actionsClient,
    connector,
    connectorId,
    model,
    provider,
    savedObjectsClient,
    promptGroupId: promptGroupId.defendInsights.incompatibleAntivirus,
    promptIds: [
      promptDictionary.defendInsightsIncompatibleAntivirusDefault,
      promptDictionary.defendInsightsIncompatibleAntivirusRefine,
      promptDictionary.defendInsightsIncompatibleAntivirusContinue,
      promptDictionary.defendInsightsIncompatibleAntivirusGroup,
      promptDictionary.defendInsightsIncompatibleAntivirusEvents,
      promptDictionary.defendInsightsIncompatibleAntivirusEventsId,
      promptDictionary.defendInsightsIncompatibleAntivirusEventsEndpointId,
      promptDictionary.defendInsightsIncompatibleAntivirusEventsValue,
    ],
  });

  const getPromptById = (id: string) =>
    prompts.find((prompt) => prompt.promptId === id)?.prompt || '';

  return {
    default: getPromptById(promptDictionary.defendInsightsIncompatibleAntivirusDefault),
    refine: getPromptById(promptDictionary.defendInsightsIncompatibleAntivirusRefine),
    continue: getPromptById(promptDictionary.defendInsightsIncompatibleAntivirusContinue),
    group: getPromptById(promptDictionary.defendInsightsIncompatibleAntivirusGroup),
    events: getPromptById(promptDictionary.defendInsightsIncompatibleAntivirusEvents),
    eventsId: getPromptById(promptDictionary.defendInsightsIncompatibleAntivirusEventsId),
    eventsEndpointId: getPromptById(
      promptDictionary.defendInsightsIncompatibleAntivirusEventsEndpointId
    ),
    eventsValue: getPromptById(promptDictionary.defendInsightsIncompatibleAntivirusEventsValue),
  };
}
