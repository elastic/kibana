/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolAvailabilityResult } from '@kbn/agent-builder-server';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/server';
import type { LicenseType } from '@kbn/licensing-types';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../../common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';

/**
 * Shared availability gate for Entity Analytics Agent Builder tools that depend
 * on Entity Store V2: space/resource availability, the
 * `entityAnalyticsEntityStoreV2` feature flag, and the latest-entities index for
 * the space.
 *
 * Pass `minLicense` for tools that also require a minimum license. Leave it
 * unset for tools that only need the store.
 */
export const getEntityAnalyticsToolAvailability = async ({
  core,
  request,
  spaceId,
  experimentalFeatures,
  logger,
  minLicense,
}: {
  core: SecuritySolutionPluginCoreSetupDependencies;
  request: KibanaRequest;
  spaceId: string;
  experimentalFeatures: ExperimentalFeatures;
  logger: Logger;
  minLicense?: LicenseType;
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

    const [coreStart, startPlugins] = await core.getStartServices();
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

    if (minLicense !== undefined) {
      const license = await startPlugins.licensing.getLicense();
      if (!license.hasAtLeast(minLicense)) {
        return {
          status: 'unavailable',
          reason: `This tool requires a ${minLicense} license or above.`,
        };
      }
    }

    return availability;
  } catch (error) {
    return {
      status: 'unavailable',
      reason: `Failed to check tool availability: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    };
  }
};
