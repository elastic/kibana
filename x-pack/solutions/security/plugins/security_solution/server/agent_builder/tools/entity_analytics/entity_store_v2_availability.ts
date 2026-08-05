/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolAvailabilityResult } from '@kbn/agent-builder-server';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/server';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../../common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';

/**
 * Gates on the generic agent builder resource availability,
 * on the `entityAnalyticsEntityStoreV2` feature flag, and
 * on the latest-entities index actually existing for the space.
 */
export const getEntityStoreV2ToolAvailability = async ({
  core,
  request,
  spaceId,
  experimentalFeatures,
  logger,
}: {
  core: SecuritySolutionPluginCoreSetupDependencies;
  request: KibanaRequest;
  spaceId: string;
  experimentalFeatures: ExperimentalFeatures;
  logger: Logger;
}): Promise<ToolAvailabilityResult> => {
  try {
    const availability = await getAgentBuilderResourceAvailability({ core, request, logger });
    if (availability.status !== 'available') {
      return availability;
    }

    if (!experimentalFeatures.entityAnalyticsEntityStoreV2) {
      return {
        status: 'unavailable',
        reason: 'Entity Store V2 is not enabled.',
      };
    }

    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;

    // Tool is only available if the latest entity store index exists for this space
    const indexExists = await esClient.indices.exists({
      index: getEntitiesAlias(ENTITY_LATEST, spaceId),
    });

    if (!indexExists) {
      return {
        status: 'unavailable',
        reason: 'Entity Store V2 index does not exist for this space',
      };
    }

    return availability;
  } catch (error) {
    return {
      status: 'unavailable',
      reason: `Failed to check entity store v2 index availability: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    };
  }
};
