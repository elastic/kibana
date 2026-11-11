/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { SECURITY_SOLUTION_DEFAULT_INDEX_ID } from '@kbn/management-settings-ids';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ENDPOINT_EVENTS_INDEX, endpointEventIndices } from '../../common/endpoint_event_indices';
import { endpointEventIndexStepCommonDefinition } from '../../common/step_types/endpoint_event_index';

export interface EndpointEventIndexStepDependencies {
  getCoreStart: () => CoreStart;
  logger?: Logger;
}

/**
 * Reads `securitySolution:defaultIndex` as the running identity and turns its
 * cluster aliases into an endpoint-event search target. A missing setting or a
 * failed read returns the local pattern, so the check still searches this cluster.
 */
export const resolveEndpointEventIndex = async (
  getCoreStart: () => CoreStart,
  request: KibanaRequest,
  logger?: Logger
): Promise<string> => {
  try {
    const coreStart = getCoreStart();
    const configured = await coreStart.uiSettings
      .asScopedToClient(coreStart.savedObjects.getScopedClient(request))
      .get<unknown>(SECURITY_SOLUTION_DEFAULT_INDEX_ID);
    if (!Array.isArray(configured)) return ENDPOINT_EVENTS_INDEX;
    return endpointEventIndices(
      configured.filter((pattern): pattern is string => typeof pattern === 'string')
    );
  } catch (error) {
    logger?.warn(
      `Reading ${SECURITY_SOLUTION_DEFAULT_INDEX_ID} failed; searching the local endpoint pattern: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return ENDPOINT_EVENTS_INDEX;
  }
};

export const getEndpointEventIndexStepDefinition = ({
  getCoreStart,
  logger,
}: EndpointEventIndexStepDependencies) =>
  createServerStepDefinition({
    ...endpointEventIndexStepCommonDefinition,
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      if (!request) {
        logger?.warn(
          'Endpoint event index step has no request; searching the local endpoint pattern'
        );
        return { output: { index: ENDPOINT_EVENTS_INDEX } };
      }
      const index = await resolveEndpointEventIndex(getCoreStart, request, logger);
      return { output: { index } };
    },
  });
