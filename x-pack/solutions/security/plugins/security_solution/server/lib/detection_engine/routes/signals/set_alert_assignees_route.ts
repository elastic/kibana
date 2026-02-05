/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { ALERTS_API_READ } from '@kbn/security-solution-features/constants';
import { SetAlertAssigneesRequestBody } from '../../../../../common/api/detection_engine/alert_assignees';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import {
  DEFAULT_ALERTS_INDEX,
  DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
} from '../../../../../common/constants';
import { setAlertAssigneesHandler } from '../common/set_alert_assignees_handler';

export const setAlertAssigneesRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
      access: 'public',
      security: {
        authz: {
          // a t1_analyst, who has read only access, should be able to assign alerts
          requiredPrivileges: [ALERTS_API_READ],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(SetAlertAssigneesRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const securitySolution = await context.securitySolution;
        const spaceId = securitySolution?.getSpaceId() ?? 'default';
        const getIndexPattern = async () => `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

        return setAlertAssigneesHandler({
          context,
          request,
          response,
          getIndexPattern,
        });
      }
    );
};
