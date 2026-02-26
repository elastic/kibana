/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { z } from '@kbn/zod';
import { ToolResultType, ToolType, platformCoreTools } from '@kbn/agent-builder-common';
import { FLEET_ENDPOINT_PACKAGE } from '@kbn/fleet-plugin/common';
import { getToolResultId } from '@kbn/agent-builder-server/tools';

import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import {
  METADATA_TRANSFORMS_PATTERN,
  metadataIndexPattern,
} from '../../../../../../common/endpoint/constants';
import { GET_PACKAGE_CONFIGURATIONS_TOOL_ID } from '../..';

const defendPackageConfigurations = z.object({});

export const getPackageConfigurationsTool = (
  endpointAppContextService: EndpointAppContextService
): BuiltinSkillBoundedTool => {
  return {
    id: GET_PACKAGE_CONFIGURATIONS_TOOL_ID,
    type: ToolType.builtin,
    description: `Fetches Elastic Defend package configurations.

Before using this tool, ensure you first call the ${platformCoreTools.integrationKnowledge} tool to gather relevant context.

This tool fetches Elastic Defend package configurations to assist in troubleshooting Elastic Defend configuration issues. Includes:
- default transform settings
- current transform settings
- index settings
- ingest pipelines
- transform stats
- node stats


**When to use:**
- When there is an issue with endpoints not displaying on the endpoint list
- When there is an issue interacting with endpoints on the endpoint list
- When there is potential misconfiguration in the Elastic Defend package assets`,
    schema: defendPackageConfigurations,
    handler: async (_, { esClient, logger }) => {
      try {
        const packageClient = endpointAppContextService.getInternalFleetServices().packages;
        const installation = await packageClient.getInstallation(FLEET_ENDPOINT_PACKAGE);
        let packageData: Awaited<ReturnType<typeof packageClient.getPackage>> | undefined;
        if (installation) {
          packageData = await packageClient.getPackage(
            FLEET_ENDPOINT_PACKAGE,
            installation.version
          );
        }
        const defaultTransformSettings: Array<{ path: string; config: unknown }> = [];
        if (packageData) {
          packageData.assetsMap.forEach((buffer, path) => {
            if (path.includes('elasticsearch/transform/') && buffer) {
              const content = buffer.toString('utf-8');
              const config: unknown = JSON.parse(content);
              defaultTransformSettings.push({ path, config });
            }
          });
        }

        const internalEsClient = esClient.asCurrentUser;
        const transformClient = internalEsClient.transform;
        const getTransformsResponse = await transformClient.getTransform({
          transform_id: METADATA_TRANSFORMS_PATTERN,
        });
        const getTransformStatsResponse = await transformClient.getTransformStats({
          transform_id: METADATA_TRANSFORMS_PATTERN,
        });
        const indexSettings = await internalEsClient.indices.getSettings({
          index: 'metrics-endpoint.metadata*',
        });
        const ingestPipelines = await internalEsClient.ingest.getPipeline({
          id: metadataIndexPattern,
        });
        const nodeStats = await internalEsClient.cat.nodes({ v: true });

        const data = {
          defaultTransformSettings,
          currentTransformSettings: getTransformsResponse.transforms,
          transformStats: getTransformStatsResponse.transforms,
          indexSettings,
          ingestPipelines,
          nodeStats,
        };

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data,
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in ${GET_PACKAGE_CONFIGURATIONS_TOOL_ID} tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
};
