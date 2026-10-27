/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import {
  API_VERSIONS,
  getDefaultGraphTraversalScenarioId,
  ENTITY_STORE_ROUTES,
} from '@kbn/entity-store/common';
import type {
  GraphTraversalExclusion,
  RunGraphTraversalRequestBody,
  RunGraphTraversalResponse,
} from '@kbn/entity-store/common';
import { useKibana } from '../../../../../../common/lib/kibana/kibana_react';

export interface UseRunBlastRadiusParams {
  /** Entity store id (EUID) of the entity to start from. */
  entityId: string;
  scenarioId?: string;
}

export interface RunBlastRadiusVariables {
  exclusions: GraphTraversalExclusion[];
}

/**
 * Runs the entity graph traversal workflow for the entity and resolves with its output. The
 * request stays open while the workflow runs, so the mutation is loading for the whole
 * traversal.
 */
export const useRunBlastRadius = ({ entityId, scenarioId }: UseRunBlastRadiusParams) => {
  const { http } = useKibana().services;
  const effectiveScenarioId = scenarioId ?? getDefaultGraphTraversalScenarioId(entityId);

  return useMutation<RunGraphTraversalResponse, Error, RunBlastRadiusVariables>({
    mutationFn: ({ exclusions }) => {
      const body: RunGraphTraversalRequestBody = {
        entity_id: entityId,
        scenario_id: effectiveScenarioId,
        ...(exclusions.length > 0 && { exclusions }),
      };
      return http.fetch<RunGraphTraversalResponse>(
        ENTITY_STORE_ROUTES.internal.GRAPH_TRAVERSAL_RUN,
        {
          method: 'POST',
          version: API_VERSIONS.internal.v2,
          body: JSON.stringify(body),
        }
      );
    },
  });
};
