/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { badRequest } from '@hapi/boom';
import { createSloServerRoute } from '../create_slo_server_route';
import { getDefaultConnectorId } from '../../services/ai/get_default_connector';
import {
  SLO_GENERATION_SYSTEM_PROMPT,
  SLO_GENERATION_OUTPUT_SCHEMA,
} from '../../services/ai/slo_generation_prompt';

const previousMessageSchema = t.type({
  role: t.union([t.literal('user'), t.literal('assistant')]),
  content: t.string,
});

const aiGenerateSloParamsSchema = t.type({
  body: t.intersection([
    t.type({
      prompt: t.string,
    }),
    t.partial({
      connectorId: t.string,
      previousMessages: t.array(previousMessageSchema),
    }),
  ]),
});

export const aiGenerateSloRoute = createSloServerRoute({
  endpoint: 'POST /internal/slo/ai/generate',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: aiGenerateSloParamsSchema,
  handler: async ({ params, logger, request, corePlugins, getInference }) => {
    const inference = await getInference();

    if (!inference) {
      throw badRequest(
        'AI-assisted SLO generation is not available. The inference plugin is not enabled.'
      );
    }

    const [coreStart] = await corePlugins.getStartServices();

    const { prompt, connectorId: requestedConnectorId, previousMessages } = params.body;

    const connectorId =
      requestedConnectorId ??
      (await getDefaultConnectorId({
        coreStart,
        inference,
        request,
        logger,
      }));

    const inferenceClient = inference.getClient({ request });

    const messages = previousMessages ?? [];
    const input =
      messages.length > 0
        ? `Previous context:\n${messages
            .map((m) => `${m.role}: ${m.content}`)
            .join('\n')}\n\nNew instruction: ${prompt}`
        : prompt;

    const response = await inferenceClient.output({
      id: 'slo-ai-generate',
      connectorId,
      system: SLO_GENERATION_SYSTEM_PROMPT,
      input,
      schema: SLO_GENERATION_OUTPUT_SCHEMA,
    });

    const { sloDefinition, explanation } = response.output ?? {
      sloDefinition: null,
      explanation: 'Failed to generate SLO definition.',
    };

    if (!sloDefinition) {
      throw badRequest('The AI model was unable to generate a valid SLO definition.');
    }

    return {
      sloDefinition: normalizeSloDefinition(sloDefinition),
      explanation,
    };
  },
});

/**
 * Normalizes the LLM output to ensure it matches the expected form values.
 */
function normalizeSloDefinition(definition: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...definition };

  if (!normalized.tags) {
    normalized.tags = [];
  }

  if (!normalized.groupBy) {
    normalized.groupBy = '*';
  }

  if (!normalized.settings) {
    normalized.settings = {
      preventInitialBackfill: false,
      syncDelay: 1,
      frequency: 1,
      syncField: null,
    };
  }

  return normalized;
}
