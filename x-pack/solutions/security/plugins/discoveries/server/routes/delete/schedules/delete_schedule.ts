/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, CoreStart, IRouter, Logger } from '@kbn/core/server';
import {
  ATTACK_DISCOVERY_API_ACTION_ALL,
  ATTACK_DISCOVERY_API_ACTION_UPDATE_ATTACK_DISCOVERY_SCHEDULE,
} from '@kbn/security-solution-features/actions';
import { transformError } from '@kbn/securitysolution-es-utils';
import { DeleteAttackDiscoveryScheduleRequestParams } from '@kbn/discoveries-schemas';
import { reportScheduleAction } from '@kbn/discoveries/impl/lib/telemetry/report_schedule_action';
import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import { SCHEDULES_BY_ID_PATH } from '../../../lib/schedules/constants';
import { createScheduleDataClient } from '../../../lib/schedules/create_schedule_data_client';
import type { DiscoveriesPluginStartDeps, DiscoveriesRequestHandlerContext } from '../../../types';

export const registerDeleteScheduleRoute = (
  router: IRouter,
  logger: Logger,
  {
    analytics,
    getStartServices,
  }: {
    analytics: AnalyticsServiceSetup;
    getStartServices: () => Promise<{
      coreStart: CoreStart;
      pluginsStart: DiscoveriesPluginStartDeps;
    }>;
  }
) => {
  router.versioned
    .delete({
      access: 'internal',
      path: SCHEDULES_BY_ID_PATH,
      security: {
        authz: {
          requiredPrivileges: [
            ATTACK_DISCOVERY_API_ACTION_ALL,
            ATTACK_DISCOVERY_API_ACTION_UPDATE_ATTACK_DISCOVERY_SCHEDULE,
          ],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: DeleteAttackDiscoveryScheduleRequestParams,
          },
        },
      },
      async (context, request, response) => {
        const disabledResponse = await assertWorkflowsEnabled({ context, response });
        if (disabledResponse) {
          return disabledResponse;
        }

        const { id } = request.params;

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

          await dataClient.deleteSchedule({ id });

          reportScheduleAction({
            action: 'delete',
            analytics,
            logger,
          });

          return response.ok({ body: { id } });
        } catch (err) {
          logger.error(
            `Error deleting schedule ${id}: ${err instanceof Error ? err.message : err}`
          );
          const error = transformError(err);

          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
