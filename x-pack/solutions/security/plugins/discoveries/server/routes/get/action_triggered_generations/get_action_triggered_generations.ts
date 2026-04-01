/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CoreStart, IRouter, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';

import { getSpaceId } from '@kbn/discoveries/impl/lib/helpers/get_space_id';
import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import type { DiscoveriesPluginStartDeps } from '../../../types';
import { queryActionTriggeredGenerations } from './helpers/query_action_triggered_generations';

const ROUTE_PATH = '/internal/attack_discovery/_action_triggered_generations';

const DEFAULT_FROM = 0;
const DEFAULT_SIZE = 20;
const MAX_SIZE = 100;

const VALID_STATUSES = ['failed', 'running', 'succeeded'] as const;

const GetActionTriggeredGenerationsRequestQuery = z.object({
  end: z.string().optional(),
  from: z.coerce.number().int().min(0).optional().default(DEFAULT_FROM),
  search: z.string().optional(),
  size: z.coerce.number().int().min(1).max(MAX_SIZE).optional().default(DEFAULT_SIZE),
  start: z.string().optional(),
  status: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (val == null) return undefined;
      const items = Array.isArray(val) ? val : val.split(',').map((s) => s.trim());
      return items.filter((s): s is (typeof VALID_STATUSES)[number] =>
        (VALID_STATUSES as readonly string[]).includes(s)
      );
    }),
});

export const registerGetActionTriggeredGenerationsRoute = (
  router: IRouter,
  logger: Logger,
  {
    getEventLogIndex,
    getStartServices,
  }: {
    getEventLogIndex: () => Promise<string>;
    getStartServices: () => Promise<{
      coreStart: CoreStart;
      pluginsStart: DiscoveriesPluginStartDeps;
    }>;
  }
) => {
  router.versioned
    .get({
      access: 'internal',
      path: ROUTE_PATH,
      security: {
        authz: {
          requiredPrivileges: [ATTACK_DISCOVERY_API_ACTION_ALL],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: GetActionTriggeredGenerationsRequestQuery,
          },
        },
      },
      async (context, request, response) => {
        const disabledResponse = await assertWorkflowsEnabled({ context, response });
        if (disabledResponse) {
          return disabledResponse;
        }

        try {
          const { end, from, search, size, start, status } = request.query;

          const { coreStart, pluginsStart } = await getStartServices();
          const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
          const eventLogIndex = await getEventLogIndex();

          const spaceIdValue = getSpaceId({
            request,
            spaces: pluginsStart.spaces?.spacesService,
          });

          const result = await queryActionTriggeredGenerations({
            end,
            esClient,
            eventLogIndex,
            from,
            search,
            size,
            spaceId: spaceIdValue,
            start,
            status,
          });

          return response.ok({ body: result });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error(`Error fetching action-triggered generations: ${errorMessage}`);
          const error = transformError(err);

          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
