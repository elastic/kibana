/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { Observable, of, switchMap } from 'rxjs';
import { ServerSentEventBase } from '@kbn/sse-utils';
import { z } from '@kbn/zod';
import datemath from '@elastic/datemath';
import { createTracedEsClient } from '@kbn/traced-es-client';
import { preconditionFailed } from '@hapi/boom';
import { runCaseSuggestions } from '../../lib/case_suggestions/run_get_case_suggestions';
import { createObservabilityServerRoute } from '../create_observability_server_route';
import { alertDetailsContextRt } from '../../services';
import { CaseSuggestionEvent } from '../../lib/case_suggestions/types';

const getObservabilityAlertDetailsContextRoute = createObservabilityServerRoute({
  endpoint: 'GET /internal/observability/assistant/alert_details_contextual_insights',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  params: t.type({
    query: alertDetailsContextRt,
  }),
  handler: async ({ dependencies, params, context, request }) => {
    const alertContext =
      await dependencies.assistant.alertDetailsContextualInsightsService.getAlertDetailsContext(
        {
          core: context.core,
          licensing: context.licensing,
          request,
        },
        params.query
      );

    return { alertContext };
  },
});

export const caseSuggestionRoot = createObservabilityServerRoute({
  endpoint: 'POST /internal/observability/investigation/case_suggestions',
  options: {
    tags: [],
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This route is opted out from authorization because it is a wrapper around Saved Object client',
    },
  },
  params: z.object({
    body: z.object({
      rangeFrom: z.string(),
      rangeTo: z.string(),
      serviceName: z.string(),
      connectorId: z.string(),
    }),
  }),
  handler: async ({
    params,
    dependencies,
    request,
    context: requestContext,
    logger,
  }): Promise<Observable<ServerSentEventBase<'event', { event: CaseSuggestionEvent }>>> => {
    const {
      body: { rangeFrom, rangeTo, serviceName, connectorId },
    } = params;

    if (!dependencies.observabilityAIAssistant) {
      throw preconditionFailed('Observability AI Assistant plugin is not available');
    }

    const start = datemath.parse(rangeFrom)?.valueOf()!;
    const end = datemath.parse(rangeTo)?.valueOf()!;

    const coreContext = await requestContext.core;

    const coreEsClient = coreContext.elasticsearch.client.asCurrentUser;

    const esClient = createTracedEsClient({
      client: coreEsClient,
      logger,
      plugin: 'investigateApp',
    });

    const [inferenceClient, observabilityAIAssistantClient] = await Promise.all([
      dependencies.inference.getClient({ request }),
      dependencies.observabilityAIAssistant!.service.getClient({
        request,
        scopes: ['observability'],
      }),
    ]);

    const next$ = runCaseSuggestions({
      connectorId,
      start,
      end,
      esClient,
      inferenceClient,
      observabilityAIAssistantClient,
      serviceName,
      spaceId: 'default', // TODO: Use the spaceId from the request context
      context: '', // TODO: Starter context for the case suggestions
      logger,
      caseSuggestionRegistry:
        dependencies.observabilityCaseSuggestionRegistry.caseSuggestionRegistry,
    }).pipe(
      switchMap((event) => {
        return of({
          type: 'event' as const,
          event,
        });
      })
    );

    return next$;
  },
});

export const aiAssistantRouteRepository = {
  ...getObservabilityAlertDetailsContextRoute,
  ...caseSuggestionRoot,
};
