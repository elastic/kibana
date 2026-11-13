/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { CoreStart } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';

import { buildDefaultEsqlQuery } from '@kbn/discoveries/impl/lib/build_default_esql_query';

import type { DiscoveriesPluginStartDeps } from '../../../../types';
import { isAuthorizedToBuildDefaultQuery } from './is_authorized_to_build_default_query';

export const GET_DEFAULT_ESQL_QUERY_TOOL_ID = 'security.attack-discovery.get_default_esql_query';

const buildErrorResult = (message: string) => ({
  results: [
    {
      data: { message },
      tool_result_id: getToolResultId(),
      type: ToolResultType.error,
    },
  ],
});

/**
 * The tool authorizes the caller itself, because skills are available to every Agent Builder
 * user and, unlike the HTTP route, nothing else guards it. Authorized callers get the
 * space's anonymization fields read with the internal user, so the Kibana-owned index needs
 * no direct privileges. Without `getStartServices` it cannot verify the caller and refuses.
 */
export const getDefaultEsqlQueryTool = ({
  getStartServices,
}: {
  getStartServices?: () => Promise<{
    coreStart: CoreStart;
    pluginsStart: DiscoveriesPluginStartDeps;
  }>;
} = {}): BuiltinSkillBoundedTool => ({
  description:
    'Returns the default ES|QL query for retrieving security alerts, using the space-specific anonymization settings to determine the KEEP fields.',
  handler: async (_args, context) => {
    try {
      if (getStartServices == null) {
        return buildErrorResult(
          'Unable to verify the privileges required to build the default ES|QL query'
        );
      }

      const { pluginsStart } = await getStartServices();

      const isAuthorized = await isAuthorizedToBuildDefaultQuery({
        authz: pluginsStart.security.authz,
        request: context.request,
        spaceId: context.spaceId,
      });

      if (!isAuthorized) {
        return buildErrorResult(
          'Unauthorized: building the default ES|QL query requires the Attack Discovery and alerts read privileges'
        );
      }

      const query = await buildDefaultEsqlQuery({
        anonymizationFieldsEsClient: context.esClient.asInternalUser,
        esClient: context.esClient.asCurrentUser,
        logger: context.logger,
        spaceId: context.spaceId,
      });

      return {
        results: [
          {
            data: { query },
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
          },
        ],
      };
    } catch (error) {
      return buildErrorResult(
        `Failed to build default ES|QL query: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  },
  id: GET_DEFAULT_ESQL_QUERY_TOOL_ID,
  schema: z.object({}),
  type: ToolType.builtin,
});
