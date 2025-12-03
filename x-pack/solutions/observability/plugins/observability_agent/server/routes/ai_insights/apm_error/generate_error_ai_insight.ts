/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { MessageRole } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';

export interface GenerateErrorAiInsightParams {
  inferenceStart: InferenceServerStart;
  request: KibanaRequest;
  connectorId?: string;
  context: string;
}

export async function generateErrorAiInsight({
  inferenceStart,
  request,
  connectorId: initialConnectorId,
  context,
}: GenerateErrorAiInsightParams): Promise<string> {
  let connectorId = initialConnectorId;

  if (!connectorId) {
    const defaultConnector = await inferenceStart.getDefaultConnector(request);
    connectorId = (defaultConnector as any)?.id ?? (defaultConnector as any)?.connectorId;
  }

  if (!connectorId) {
    throw new Error('No default connector found');
  }

  const inferenceClient = inferenceStart.getClient({ request });

  const instructions = [
    `I'm an SRE looking at an application error and trying to understand what it means.`,
    `Your task is to explain likely cause(s) and next steps.`,
    `Context:\n${context}`,
  ].join('\n\n');

  const response = await inferenceClient.chatComplete({
    connectorId,
    messages: [
      {
        role: MessageRole.User,
        content: instructions,
      },
    ],
    functionCalling: 'auto',
  });

  return response.content;
}
