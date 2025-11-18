/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { SecuritySolutionPluginRouter } from '../../../types';
import {
  CreateAlertTriageJobRequestBody,
  CreateAlertTriageJobResponse,
} from '@kbn/security-solution-plugin/common/api/assistant/alert_triage';
import { createAlertTriageJobHandler } from './handlers';

export const ALERT_TRIAGE_JOB_URL = '/internal/api/alert_triage/job/async' as const;

const ROUTE_HANDLER_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export const alertTriageJobRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .post({
      access: 'internal',
      path: ALERT_TRIAGE_JOB_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: {
        authRequired: true,
        timeout: {
          idleSocket: ROUTE_HANDLER_TIMEOUT,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(CreateAlertTriageJobRequestBody),
          },
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(CreateAlertTriageJobResponse) },
            },
          },
        },
      },
      createAlertTriageJobHandler(logger)
    );
};
