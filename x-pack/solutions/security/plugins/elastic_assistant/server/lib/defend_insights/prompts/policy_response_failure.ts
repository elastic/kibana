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

export async function getPolicyResponseFailurePrompt({
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
    promptGroupId: promptGroupId.defendInsights.policyResponseFailure,
    promptIds: [
      promptDictionary.defendInsightsPolicyResponseFailureContinue,
      promptDictionary.defendInsightsPolicyResponseFailureDefault,
      promptDictionary.defendInsightsPolicyResponseFailureEvents,
      promptDictionary.defendInsightsPolicyResponseFailureEventsEndpointId,
      promptDictionary.defendInsightsPolicyResponseFailureEventsId,
      promptDictionary.defendInsightsPolicyResponseFailureEventsValue,
      promptDictionary.defendInsightsPolicyResponseFailureGroup,
      promptDictionary.defendInsightsPolicyResponseFailureRefine,
      promptDictionary.defendInsightsPolicyResponseFailureRemediation,
      promptDictionary.defendInsightsPolicyResponseFailureRemediationLink,
      promptDictionary.defendInsightsPolicyResponseFailureRemediationMessage,
    ],
    provider,
    savedObjectsClient,
  });

  const getPromptById = (id: string) =>
    prompts.find((prompt) => prompt.promptId === id)?.prompt || '';

  return {
    continue: getPromptById(promptDictionary.defendInsightsPolicyResponseFailureContinue),
    default: getPromptById(promptDictionary.defendInsightsPolicyResponseFailureDefault),
    events: getPromptById(promptDictionary.defendInsightsPolicyResponseFailureEvents),
    eventsEndpointId: getPromptById(
      promptDictionary.defendInsightsPolicyResponseFailureEventsEndpointId
    ),
    eventsId: getPromptById(promptDictionary.defendInsightsPolicyResponseFailureEventsId),
    eventsValue: getPromptById(promptDictionary.defendInsightsPolicyResponseFailureEventsValue),
    group: getPromptById(promptDictionary.defendInsightsPolicyResponseFailureGroup),
    refine: getPromptById(promptDictionary.defendInsightsPolicyResponseFailureRefine),
    remediation: getPromptById(promptDictionary.defendInsightsPolicyResponseFailureRemediation),
    remediationLink: getPromptById(
      promptDictionary.defendInsightsPolicyResponseFailureRemediationLink
    ),
    remediationMessage: getPromptById(
      promptDictionary.defendInsightsPolicyResponseFailureRemediationMessage
    ),
  };
}
