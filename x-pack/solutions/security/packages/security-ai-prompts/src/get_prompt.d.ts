/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import type { PromptArray, GetPromptArgs, GetPromptsByGroupIdArgs } from './types';
/**
 * Get prompts by feature (promptGroupId)
 * provide either model + provider or connector to avoid additional calls to get connector
 * @param actionsClient - actions client (look up connector if connector is not provided)
 * @param connector - connector, provide if available. No need to provide model and provider in this case
 * @param connectorId - connector id
 * @param localPrompts - local prompts object
 * @param model - model. No need to provide if connector provided
 * @param promptGroupId - feature id, should be common across promptIds
 * @param promptIds - prompt ids with shared promptGroupId
 * @param provider  - provider. No need to provide if connector provided
 * @param savedObjectsClient - saved objects client
 */
export declare const getPromptsByGroupId: ({
  actionsClient,
  connector,
  connectorId,
  localPrompts,
  model: providedModel,
  promptGroupId,
  promptIds,
  provider: providedProvider,
  savedObjectsClient,
}: GetPromptsByGroupIdArgs) => Promise<PromptArray>;
/**
 * Get prompt by promptId
 * provide either model + provider or connector to avoid additional calls to get connector
 * @param actionsClient - actions client
 * @param connector - connector, provide if available. No need to provide model and provider in this case
 * @param connectorId - connector id
 * @param localPrompts - local prompts object
 * @param model - model. No need to provide if connector provided
 * @param promptId - prompt id
 * @param promptGroupId - feature id, should be common across promptIds
 * @param provider  - provider. No need to provide if connector provided
 * @param savedObjectsClient - saved objects client
 */
export declare const getPrompt: ({
  actionsClient,
  connector,
  connectorId,
  localPrompts,
  model: providedModel,
  promptGroupId,
  promptId,
  provider: providedProvider,
  savedObjectsClient,
}: GetPromptArgs) => Promise<string>;
export declare const resolveProviderAndModel: ({
  providedProvider,
  providedModel,
  connectorId,
  actionsClient,
  providedConnector,
}: {
  providedProvider?: string;
  providedModel?: string;
  connectorId?: string;
  actionsClient?: PublicMethodsOf<ActionsClient>;
  providedConnector?: Connector;
}) => Promise<{
  provider?: string;
  model?: string;
}>;
