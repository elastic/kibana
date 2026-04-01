/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, IRouter, Logger } from '@kbn/core/server';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import { transformError } from '@kbn/securitysolution-es-utils';
import { FindAttackDiscoverySchedulesRequestQuery } from '@kbn/discoveries-schemas';
import { transformScheduleToApi } from '@kbn/discoveries/impl/lib/schedules/transforms';
import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import { SCHEDULES_FIND_PATH } from '../../../lib/schedules/constants';
import { createScheduleDataClient } from '../../../lib/schedules/create_schedule_data_client';
import type { DiscoveriesPluginStartDeps, DiscoveriesRequestHandlerContext } from '../../../types';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 10;

export const registerFindSchedulesRoute = (
  router: IRouter,
  logger: Logger,
  {
    getStartServices,
  }: {
    getStartServices: () => Promise<{
      coreStart: CoreStart;
      pluginsStart: DiscoveriesPluginStartDeps;
    }>;
  }
) => {
  router.versioned
    .get({
      access: 'internal',
      path: SCHEDULES_FIND_PATH,
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
            query: FindAttackDiscoverySchedulesRequestQuery,
          },
        },
      },
      async (context, request, response) => {
        const disabledResponse = await assertWorkflowsEnabled({ context, response });
        if (disabledResponse) {
          return disabledResponse;
        }

        try {
          const { pluginsStart } = await getStartServices();
          const alertingContext = await (context as unknown as DiscoveriesRequestHandlerContext)
            .alerting;

          const dataClient = await createScheduleDataClient({
            alertingContext,
            logger,
            request,
            startPlugins: pluginsStart,
          });

          const findOpts = {
            page: request.query.page,
            perPage: request.query.per_page,
            sort: {
              sortDirection: request.query.sort_direction,
              sortField: request.query.sort_field,
            },
          };

          const results = await dataClient.findSchedules(findOpts);
          const data = results.data.map(transformScheduleToApi);

          return response.ok({
            body: {
              data,
              page: request.query.page ?? DEFAULT_PAGE,
              per_page: request.query.per_page ?? DEFAULT_PER_PAGE,
              total: results.total,
            },
          });
        } catch (err) {
          logger.error(`Error finding schedules: ${err instanceof Error ? err.message : err}`);
          const error = transformError(err);

          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
