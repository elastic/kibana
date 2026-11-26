/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { APM_API_PRIVILEGE, DIGITAL_EXPERIENCE_API_PRIVILEGES } from '../../common/feature';
import {
  getScorecardReportStepCommonDefinition,
  InputSchema,
} from '../../common/step_types/get_scorecard_report_step';
import { getScorecardReport } from '../lib/report/get_scorecard_report';
import { buildScorecardSummary } from '../lib/report/scorecard_summary';

const DAY_MS = 24 * 60 * 60 * 1000;

export const getScorecardReportStepDefinition = (
  coreLogger: Logger,
  getAuthz: () => Promise<AuthorizationServiceSetup | undefined>
) =>
  createServerStepDefinition({
    ...getScorecardReportStepCommonDefinition,
    handler: async ({ input: renderedInput, contextManager, abortSignal, logger }) => {
      try {
        // The runner passes templated values on without validating them again.
        const { serviceName, environment, lookbackDays } = InputSchema.parse(renderedInput);

        // The scoped client only enforces index privileges; the route also requires these.
        const authz = await getAuthz();
        const request = contextManager.getFakeRequest();
        if (authz?.mode.useRbacForRequest(request)) {
          const { hasAllRequested } = await authz.checkPrivilegesDynamicallyWithRequest(request)({
            kibana: [
              authz.actions.api.get(DIGITAL_EXPERIENCE_API_PRIVILEGES.read),
              authz.actions.api.get(APM_API_PRIVILEGE),
            ],
          });
          if (!hasAllRequested) {
            return {
              error: new Error(
                'The workflow’s user is not authorized to get the Digital Experience scorecard'
              ),
            };
          }
        }

        const end = Date.now();
        const report = await getScorecardReport({
          client: contextManager.getScopedEsClient(),
          logger: coreLogger,
          serviceName,
          start: end - lookbackDays * DAY_MS,
          end,
          environment,
          signal: abortSignal,
        });

        return { output: { report, summary: buildScorecardSummary(report) } };
      } catch (error) {
        logger.error('Could not get the Digital Experience scorecard', error);
        return {
          error: new Error(
            error instanceof Error
              ? error.message
              : 'Could not get the Digital Experience scorecard'
          ),
        };
      }
    },
  });
