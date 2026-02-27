/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import type { DefendInsightsCombinedPrompts } from '.';
import { promptGroupId } from '../../../../prompt/local_prompt_object';
import { promptDictionary, getPromptsByGroupId } from '../../../../prompt';

export async function getPolicyResponseFailurePrompt({
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
    promptGroupId: promptGroupId.defendInsights.policyResponseFailure,
    promptIds: [
      promptDictionary.defendInsightsPolicyResponseFailureDefault,
      promptDictionary.defendInsightsPolicyResponseFailureRefine,
      promptDictionary.defendInsightsPolicyResponseFailureContinue,
      promptDictionary.defendInsightsPolicyResponseFailureGroup,
      promptDictionary.defendInsightsPolicyResponseFailureEvents,
      promptDictionary.defendInsightsPolicyResponseFailureEventsId,
      promptDictionary.defendInsightsPolicyResponseFailureEventsEndpointId,
      promptDictionary.defendInsightsPolicyResponseFailureEventsValue,
      promptDictionary.defendInsightsPolicyResponseFailureRemediation,
      promptDictionary.defendInsightsPolicyResponseFailureRemediationMessage,
      promptDictionary.defendInsightsPolicyResponseFailureRemediationLink,
    ],
  });

  const getPromptById = (id: string) =>
    prompts.find((prompt) => prompt.promptId === id)?.prompt || '';

  return {
    default: getPromptById(promptDictionary.defendInsightsPolicyResponseFailureDefault),
    refine: getPromptById(promptDictionary.defendInsightsPolicyResponseFailureRefine),
    continue: getPromptById(promptDictionary.defendInsightsPolicyResponseFailureContinue),
    group: getPromptById(promptDictionary.defendInsightsPolicyResponseFailureGroup),
    events: getPromptById(promptDictionary.defendInsightsPolicyResponseFailureEvents),
    eventsId: getPromptById(promptDictionary.defendInsightsPolicyResponseFailureEventsId),
    eventsEndpointId: getPromptById(
      promptDictionary.defendInsightsPolicyResponseFailureEventsEndpointId
    ),
    eventsValue: getPromptById(promptDictionary.defendInsightsPolicyResponseFailureEventsValue),
    remediation: getPromptById(promptDictionary.defendInsightsPolicyResponseFailureRemediation),
    remediationMessage: getPromptById(
      promptDictionary.defendInsightsPolicyResponseFailureRemediationMessage
    ),
    remediationLink: getPromptById(
      promptDictionary.defendInsightsPolicyResponseFailureRemediationLink
    ),
  };
}
