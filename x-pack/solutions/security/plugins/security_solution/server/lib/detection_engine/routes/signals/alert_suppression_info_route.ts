/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { Alert } from '@kbn/alerts-as-data-utils';
import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_INTERNAL_GET_ALERT_SUPPRESSION_INFO_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import { AlertSuppressionInfoRequestBody } from '../../../../../common/api/detection_engine';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { transform } from '../../rule_management/utils/utils';

export const alertSuppressionInfoRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  ruleDataClient: IRuleDataClient | null
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_INTERNAL_GET_ALERT_SUPPRESSION_INFO_URL,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidation(AlertSuppressionInfoRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const siemResponse = buildSiemResponse(response);

        try {
          const spaceId = (await context.securitySolution).getSpaceId();
          const indexPattern = ruleDataClient?.indexNameWithNamespace(spaceId);
          const query =
            'alert_ids' in request.body
              ? {
                  bool: {
                    filter: {
                      terms: {
                        _id: request.body.alert_ids,
                      },
                    },
                  },
                }
              : JSON.parse(request.body.query);

          const result = await esClient.search<Alert>({
            index: indexPattern,
            query,
            ignore_unavailable: true,
          });
          const alertsByRuleId: Record<string, string[]> = {};
          result.hits.hits.forEach((alert) => {
            const ruleId = alert._source?.['kibana.alert.rule.uuid'] as string;
            const alertId = alert._id as string;
            if (!alertsByRuleId[ruleId]) {
              alertsByRuleId[ruleId] = [];
            }
            alertsByRuleId[ruleId].push(alertId);
          });

          const rulesClient = await (await context.alerting).getRulesClient();
          const { rules, errors } = await rulesClient.bulkGetRules({
            ids: Object.keys(alertsByRuleId),
          });

          if (errors.length > 0) {
            logger.error(
              `Errors while resolving rules: ${errors.map(({ error }) => error.message).join(', ')}`
            );
          }

          const hasSuppressionWindowMap = rules.map(transform).reduce((acc, transformedRule) => {
            if (!transformedRule) {
              return acc;
            }
            acc[transformedRule.id] = transformedRule?.alert_suppression?.duration !== undefined;
            return acc;
          }, {} as Record<string, boolean>);
          const suppressionInfo: Record<string, { has_active_suppression_window: boolean }> = {};
          Object.keys(alertsByRuleId).forEach((ruleId) => {
            const hasActiveSuppressionWindow = hasSuppressionWindowMap[ruleId];
            return alertsByRuleId[ruleId].forEach((alertId) => {
              suppressionInfo[alertId] = {
                has_active_suppression_window: hasActiveSuppressionWindow,
              };
            });
          });
          return response.ok({
            body: {
              alerts: suppressionInfo,
            },
          });
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
