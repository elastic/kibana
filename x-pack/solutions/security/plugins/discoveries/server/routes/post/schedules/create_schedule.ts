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
import { CreateAttackDiscoveryScheduleRequestBody } from '@kbn/discoveries-schemas';
import {
  transformCreatePropsFromApi,
  transformScheduleToApi,
} from '@kbn/discoveries/impl/lib/schedules/transforms';
import { reportScheduleAction } from '@kbn/discoveries/impl/lib/telemetry/report_schedule_action';
import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import { SCHEDULES_BASE_PATH } from '../../../lib/schedules/constants';
import { createScheduleDataClient } from '../../../lib/schedules/create_schedule_data_client';
import type { DiscoveriesPluginStartDeps, DiscoveriesRequestHandlerContext } from '../../../types';

export const registerCreateScheduleRoute = (
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
    .post({
      access: 'internal',
      path: SCHEDULES_BASE_PATH,
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
            body: CreateAttackDiscoveryScheduleRequestBody,
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

          const internalCreateProps = transformCreatePropsFromApi({
            ...request.body,
            enabled: request.body.enabled ?? false,
          });
          const schedule = await dataClient.createSchedule(internalCreateProps);
          const responseBody = transformScheduleToApi(schedule);

          reportScheduleAction({
            action: 'create',
            analytics,
            hasActions: (request.body.actions?.length ?? 0) > 0,
            interval: request.body.schedule?.interval,
            logger,
          });

          return response.ok({ body: responseBody });
        } catch (err) {
          logger.error(`Error creating schedule: ${err instanceof Error ? err.message : err}`);
          const error = transformError(err);

          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
