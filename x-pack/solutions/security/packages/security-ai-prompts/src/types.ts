/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { InferenceConnector } from '@kbn/inference-common';

export type { InferenceConnector };

export interface Prompt {
  promptId: string;
  promptGroupId: string;
  prompt: {
    default: string;
  };
  provider?: string;
  model?: string;
  description?: string;
}

export type PromptArray = Array<{ promptId: string; prompt: string }>;

export interface GetPromptArgs {
  connectorId?: string;
  getInferenceConnectorById?: (id: string) => Promise<InferenceConnector>;
  localPrompts: Prompt[];
  model?: string;
  promptId: string;
  promptGroupId: string;
  provider?: string;
  savedObjectsClient: SavedObjectsClientContract;
}
export interface GetPromptsByGroupIdArgs extends Omit<GetPromptArgs, 'promptId'> {
  promptGroupId: string;
  promptIds: string[];
}
