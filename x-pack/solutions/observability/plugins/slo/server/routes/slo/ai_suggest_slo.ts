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
  SLO_SUGGEST_SYSTEM_PROMPT,
  SLO_SUGGEST_OUTPUT_SCHEMA,
} from '../../services/ai/slo_generation_prompt';

const aiSuggestSloParamsSchema = t.type({
  body: t.intersection([
    t.type({
      sloDefinition: t.record(t.string, t.unknown),
    }),
    t.partial({
      connectorId: t.string,
    }),
  ]),
});

export const aiSuggestSloRoute = createSloServerRoute({
  endpoint: 'POST /internal/slo/ai/suggest',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: aiSuggestSloParamsSchema,
  handler: async ({ params, logger, request, corePlugins, getInference }) => {
    const inference = await getInference();

    if (!inference) {
      throw badRequest(
        'AI-assisted SLO suggestions are not available. The inference plugin is not enabled.'
      );
    }

    const [coreStart] = await corePlugins.getStartServices();

    const { sloDefinition, connectorId: requestedConnectorId } = params.body;

    const connectorId =
      requestedConnectorId ??
      (await getDefaultConnectorId({
        coreStart,
        inference,
        request,
        logger,
      }));

    const inferenceClient = inference.getClient({ request });

    const input = `Analyze the following SLO definition and suggest improvements:\n\n${JSON.stringify(sloDefinition, null, 2)}`;

    const response = await inferenceClient.output({
      id: 'slo-ai-suggest',
      connectorId,
      system: SLO_SUGGEST_SYSTEM_PROMPT,
      input,
      schema: SLO_SUGGEST_OUTPUT_SCHEMA,
    });

    const { suggestions } = response.output ?? { suggestions: [] };

    return {
      suggestions: Array.isArray(suggestions) ? suggestions : [],
    };
  },
});
