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
import { ALERTS_API_READ } from '@kbn/security-solution-features/constants';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  UpdateAttackDiscoveryScheduleRequestBody,
  UpdateAttackDiscoveryScheduleRequestParams,
} from '@kbn/discoveries-schemas';
import {
  transformScheduleToApi,
  transformUpdatePropsFromApi,
} from '@kbn/discoveries/impl/lib/schedules/transforms';
import { reportScheduleAction } from '@kbn/discoveries/impl/lib/telemetry/report_schedule_action';
import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import { SCHEDULES_BY_ID_PATH } from '../../../lib/schedules/constants';
import { createScheduleDataClient } from '../../../lib/schedules/create_schedule_data_client';
import type { DiscoveriesPluginStartDeps, DiscoveriesRequestHandlerContext } from '../../../types';

export const registerUpdateScheduleRoute = (
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
    .put({
      access: 'internal',
      path: SCHEDULES_BY_ID_PATH,
      security: {
        authz: {
          requiredPrivileges: [
            ATTACK_DISCOVERY_API_ACTION_UPDATE_ATTACK_DISCOVERY_SCHEDULE,
            ATTACK_DISCOVERY_API_ACTION_ALL,
            ALERTS_API_READ,
          ],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: UpdateAttackDiscoveryScheduleRequestBody,
            params: UpdateAttackDiscoveryScheduleRequestParams,
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

          const existingSchedule = await dataClient.getSchedule(id);
          // `workflowConfig` is added to the schedule params schema in PR10
          // (Schedule Integration). Until then the inferred params type does
          // not declare it, so we read it through a narrow cast. FF-off safe:
          // this route is only reachable when the feature flag is ON.
          const internalUpdateProps = transformUpdatePropsFromApi(
            request.body,
            (existingSchedule.params as { workflowConfig?: unknown }).workflowConfig
          );
          const schedule = await dataClient.updateSchedule({
            id,
            ...internalUpdateProps,
          });
          const responseBody = transformScheduleToApi(schedule);

          reportScheduleAction({
            action: 'update',
            analytics,
            hasActions: (request.body.actions?.length ?? 0) > 0,
            interval: request.body.schedule?.interval,
            logger,
          });

          return response.ok({ body: responseBody });
        } catch (err) {
          logger.error(
            `Error updating schedule ${id}: ${err instanceof Error ? err.message : err}`
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
