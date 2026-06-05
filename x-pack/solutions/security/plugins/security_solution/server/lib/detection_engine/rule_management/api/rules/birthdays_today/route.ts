/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { RULES_API_READ } from '@kbn/security-solution-features/constants';
import { RULE_MANAGEMENT_BIRTHDAYS_TODAY_URL } from '../../../../../../../common/api/detection_engine/rule_management/urls';
import {
  BirthdaysTodayRequestQuery,
  type BirthdaysTodayResponse,
} from '../../../../../../../common/api/detection_engine/rule_management';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildSiemResponse } from '../../../../routes/utils';
import {
  findCelebratingRules,
  computeAgeYears,
  buildBirthdayMessage,
} from './utils/birthday_helper';

export const birthdaysTodayRoute = (router: SecuritySolutionPluginRouter, _logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: RULE_MANAGEMENT_BIRTHDAYS_TODAY_URL,
      security: {
        authz: {
          requiredPrivileges: [RULES_API_READ],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: buildRouteValidationWithZod(BirthdaysTodayRequestQuery),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<BirthdaysTodayResponse>> => {
        const siemResponse = buildSiemResponse(response);
        try {
          const ctx = await context.resolve(['core', 'securitySolution']);
          const esClient = ctx.core.elasticsearch.client.asCurrentUser;

          const { birthdayDate, birthdayYear } = request.query;
          const targetDate = birthdayDate ?? new Date().toISOString().slice(0, 10);
          const parts = targetDate.split('-').map((p) => Number(p));
          const month = parts[1];
          const day = parts[2];

          const celebrating = await findCelebratingRules({
            esClient,
            month,
            day,
            birthdayYear,
          });

          const todayMessage =
            celebrating.length > 0
              ? `🎂 Happy birthday to ${celebrating.length} detection rule(s) celebrating today!`
              : '🎂 No detection rules celebrating their birthday today.';

          const responseBody: BirthdaysTodayResponse = {
            celebrating_rule_ids: celebrating.map((r) => r.id),
            celebrating_rules_details: celebrating.map((rule) => {
              const ageYears = computeAgeYears(rule.createdAt);
              return {
                id: rule.id,
                alertTypeId: rule.alertTypeId,
                createdBy: rule.createdBy,
                createdAt: rule.createdAt,
                lastRun: rule.lastRun,
                name: rule.name,
                ageYears,
                birthdayMessage: buildBirthdayMessage(rule.name, ageYears),
              };
            }),
            total: celebrating.length,
            today_message: todayMessage,
          };
          return response.ok({ body: responseBody });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
