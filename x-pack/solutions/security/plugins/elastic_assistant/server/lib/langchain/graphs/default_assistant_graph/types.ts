/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import type { Logger } from '@kbn/logging';
import type { ContentReferencesStore } from '@kbn/elastic-assistant-common';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { AssistantStateAnnotation } from './state';

export interface GraphInputs {
  connectorId: string;
  conversationId?: string;
  threadId: string;
  llmType?: string;
  isStream?: boolean;
  isOssModel?: boolean;
  /**
   * The entire conversation history, including the new messages.
   */
  messages: BaseMessage[];
  isRegeneration: boolean;
  responseLanguage?: string;
}

export type AgentState = typeof AssistantStateAnnotation.State;

export interface NodeParamsBase {
  actionsClient: PublicMethodsOf<ActionsClient>;
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  contentReferencesStore: ContentReferencesStore;
}
