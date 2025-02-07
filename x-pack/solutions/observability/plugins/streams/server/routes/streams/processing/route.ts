/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  namedFieldDefinitionConfigSchema,
  processorDefinitionSchema,
  recursiveRecord,
} from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { checkAccess } from '../../../lib/streams/stream_crud';
import { createServerRoute } from '../../create_server_route';
import { DefinitionNotFoundError } from '../../../lib/streams/errors/definition_not_found_error';
import { handleProcessingSuggestion } from './suggestions_handler';
import {
  assertSimulationResult,
  executeSimulation,
  prepareSimulationBody,
  prepareSimulationDiffs,
  prepareSimulationResponse,
} from './simulation_handler';

const paramsSchema = z.object({
  path: z.object({ id: z.string() }),
  body: z.object({
    processing: z.array(processorDefinitionSchema),
    documents: z.array(recursiveRecord),
    detected_fields: z.array(namedFieldDefinitionConfigSchema).optional(),
  }),
});

export type ProcessingSimulateParams = z.infer<typeof paramsSchema>;

export const simulateProcessorRoute = createServerRoute({
  endpoint: 'POST /api/streams/{id}/processing/_simulate',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: paramsSchema,
  handler: async ({ params, request, getScopedClients }) => {
    const { scopedClusterClient } = await getScopedClients({ request });

    const { read } = await checkAccess({ id: params.path.id, scopedClusterClient });
    if (!read) {
      throw new DefinitionNotFoundError(`Stream definition for ${params.path.id} not found.`);
    }

    const simulationBody = prepareSimulationBody(params);

    const simulationResult = await executeSimulation(scopedClusterClient, simulationBody);

    const simulationDiffs = prepareSimulationDiffs(simulationResult, simulationBody.docs);

    assertSimulationResult(simulationResult, simulationDiffs);

    return prepareSimulationResponse(
      simulationResult,
      simulationBody.docs,
      simulationDiffs,
      params.body.detected_fields
    );
  },
});

const suggestionsParamsSchema = z.object({
  path: z.object({ id: z.string() }),
  body: z.object({
    field: z.string(),
    connectorId: z.string(),
    samples: z.array(recursiveRecord),
  }),
});

export type ProcessingSuggestionParams = z.infer<typeof suggestionsParamsSchema>;

export const processingSuggestionRoute = createServerRoute({
  endpoint: 'POST /api/streams/{id}/processing/_suggestions',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  params: suggestionsParamsSchema,
  handler: async ({ params, request, logger, getScopedClients }) => {
    const { inferenceClient, scopedClusterClient } = await getScopedClients({ request });
    return handleProcessingSuggestion(
      params.path.id,
      params.body,
      inferenceClient,
      scopedClusterClient
    );
  },
});

export const processingRoutes = {
  ...simulateProcessorRoute,
  ...processingSuggestionRoute,
};
