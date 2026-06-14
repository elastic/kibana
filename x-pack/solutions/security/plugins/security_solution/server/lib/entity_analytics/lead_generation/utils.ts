/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';

export const resolveChatModel = async (
  inference: InferenceServerStart,
  request: KibanaRequest,
  connectorId: string
): Promise<InferenceChatModel> =>
  inference.getChatModel({
    request,
    connectorId,
    chatModelOptions: {
      temperature: 0,
      maxRetries: 0,
      telemetryMetadata: {
        pluginId: 'securitySolution',
      },
    },
  });
