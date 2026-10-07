/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { z } from '@kbn/zod/v4';
import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { FLEET_ENDPOINT_PACKAGE } from '@kbn/fleet-plugin/common';
import { getToolResultId } from '@kbn/agent-builder-server/tools';

import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { isEndpointPackageStale } from '../../../../../../common/endpoint/utils/is_endpoint_package_stale';
import { CHECK_ENDPOINT_PACKAGE_FRESHNESS_TOOL_ID } from '../..';

export const checkEndpointPackageFreshnessTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool => {
  return {
    id: CHECK_ENDPOINT_PACKAGE_FRESHNESS_TOOL_ID,
    type: ToolType.builtin,
    description: `Returns the installed version, the latest available version, and whether the Elastic Defend endpoint integration package is stale (installed version behind latest).`,
    schema: z.object({}),
    handler: async (_, { logger }) => {
      try {
        const packageClient = endpointAppContextService.getInternalFleetServices().packages;
        const [installation, latestInfo] = await Promise.all([
          packageClient.getInstallation(FLEET_ENDPOINT_PACKAGE),
          packageClient.getLatestPackageInfo(FLEET_ENDPOINT_PACKAGE),
        ]);

        const installedVersion = installation?.version ?? null;
        const latestVersion = latestInfo.version ?? null;

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                installedVersion,
                latestVersion,
                stale: isEndpointPackageStale(installedVersion, latestVersion),
              },
            },
          ],
        };
      } catch (error) {
        logger.error(error);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: { message: `Error checking endpoint package freshness: ${error.message}` },
            },
          ],
        };
      }
    },
  };
};
