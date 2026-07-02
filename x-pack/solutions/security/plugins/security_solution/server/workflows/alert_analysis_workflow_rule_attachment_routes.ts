/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { StartServicesAccessor } from '@kbn/core/server';
import { RULES_API_ALL, RULES_API_READ } from '@kbn/security-solution-features/constants';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  ALERT_ANALYSIS_WORKFLOW_API_VERSION,
  ALERT_ANALYSIS_WORKFLOW_RULE_SELECTION_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULE_STATS_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULE_UPDATE_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULES_ROUTE,
  AlertAnalysisWorkflowRuleAttachmentListRequestQuery,
  AlertAnalysisWorkflowRuleAttachmentSelectionRequestBody,
  AlertAnalysisWorkflowRuleAttachmentStatsRequestBody,
  AlertAnalysisWorkflowRuleAttachmentUpdateRequestBody,
  MANAGED_ALERT_ANALYSIS_WORKFLOW_FEATURE_FLAG,
  MANAGED_ALERT_ANALYSIS_WORKFLOW_FEATURE_FLAG_DEFAULT,
  type AlertAnalysisWorkflowRuleAttachmentListRequestQuery as AlertAnalysisWorkflowRuleAttachmentListRequestQueryType,
  type AlertAnalysisWorkflowRuleAttachmentSelectionRequestBody as AlertAnalysisWorkflowRuleAttachmentSelectionRequestBodyType,
  type AlertAnalysisWorkflowRuleAttachmentStatsRequestBody as AlertAnalysisWorkflowRuleAttachmentStatsRequestBodyType,
  type AlertAnalysisWorkflowRuleAttachmentUpdateRequestBody as AlertAnalysisWorkflowRuleAttachmentUpdateRequestBodyType,
} from '@kbn/workflows/common/alert_analysis_workflow';
import type { StartPlugins } from '../plugin';
import type { SecuritySolutionPluginRouter, SecuritySolutionRequestHandlerContext } from '../types';
import { buildSiemResponse } from '../lib/detection_engine/routes/utils';
import { createPrebuiltRuleAssetsClient } from '../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { getSecurityAlertAnalysisWorkflowIdForSpace } from './managed_workflows';
import { createAlertAnalysisWorkflowRuleAttachmentService } from './alert_analysis_workflow_rule_attachments';

export {
  ALERT_ANALYSIS_WORKFLOW_RULE_SELECTION_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULE_STATS_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULE_UPDATE_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULES_ROUTE,
};

const isAlertAnalysisWorkflowEnabled = async (
  getStartServices: StartServicesAccessor<StartPlugins>
): Promise<boolean> => {
  const [coreStart] = await getStartServices();

  return coreStart.featureFlags.getBooleanValue(
    MANAGED_ALERT_ANALYSIS_WORKFLOW_FEATURE_FLAG,
    MANAGED_ALERT_ANALYSIS_WORKFLOW_FEATURE_FLAG_DEFAULT
  );
};

const createReadService = async (context: SecuritySolutionRequestHandlerContext) => {
  const ctx = await context.resolve(['securitySolution', 'alerting']);
  const rulesClient = await ctx.alerting.getRulesClient();
  const spaceId = ctx.securitySolution.getSpaceId();

  return createAlertAnalysisWorkflowRuleAttachmentService({
    rulesClient,
    workflowId: getSecurityAlertAnalysisWorkflowIdForSpace(spaceId),
  });
};

const createWriteService = async (context: SecuritySolutionRequestHandlerContext) => {
  const ctx = await context.resolve(['core', 'securitySolution', 'alerting', 'actions']);
  const rulesClient = await ctx.alerting.getRulesClient();
  const actionsClient = ctx.actions.getActionsClient();
  const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();
  const spaceId = ctx.securitySolution.getSpaceId();

  return createAlertAnalysisWorkflowRuleAttachmentService({
    rulesClient,
    workflowId: getSecurityAlertAnalysisWorkflowIdForSpace(spaceId),
    bulkEditDependencies: {
      actionsClient,
      prebuiltRuleAssetClient: createPrebuiltRuleAssetsClient(ctx.core.savedObjects.client),
      mlAuthz: ctx.securitySolution.getMlAuthz(),
      rulesAuthz: ctx.securitySolution.getRulesAuthz(),
      ruleCustomizationStatus: detectionRulesClient.getRuleCustomizationStatus(),
    },
  });
};

export const registerAlertAnalysisWorkflowRuleAttachmentRoutes = (
  router: SecuritySolutionPluginRouter,
  getStartServices: StartServicesAccessor<StartPlugins>
): void => {
  router.versioned
    .get({
      path: ALERT_ANALYSIS_WORKFLOW_RULES_ROUTE,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [RULES_API_READ],
        },
      },
    })
    .addVersion(
      {
        version: ALERT_ANALYSIS_WORKFLOW_API_VERSION,
        validate: {
          request: {
            query: buildRouteValidationWithZod(AlertAnalysisWorkflowRuleAttachmentListRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          if (!(await isAlertAnalysisWorkflowEnabled(getStartServices))) {
            return response.notFound();
          }

          const {
            search,
            page,
            per_page: perPage,
          } = request.query as AlertAnalysisWorkflowRuleAttachmentListRequestQueryType;
          const service = await createReadService(context);
          const body = await service.getRuleAttachments({ search, page, perPage });

          return response.ok({ body });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );

  router.versioned
    .post({
      path: ALERT_ANALYSIS_WORKFLOW_RULE_STATS_ROUTE,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [RULES_API_READ],
        },
      },
    })
    .addVersion(
      {
        version: ALERT_ANALYSIS_WORKFLOW_API_VERSION,
        validate: {
          request: {
            body: buildRouteValidationWithZod(AlertAnalysisWorkflowRuleAttachmentStatsRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          if (!(await isAlertAnalysisWorkflowEnabled(getStartServices))) {
            return response.notFound();
          }

          const { search } =
            request.body as AlertAnalysisWorkflowRuleAttachmentStatsRequestBodyType;
          const service = await createReadService(context);
          const body = await service.getRuleAttachmentStats({ search });

          return response.ok({ body });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );

  router.versioned
    .post({
      path: ALERT_ANALYSIS_WORKFLOW_RULE_SELECTION_ROUTE,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [RULES_API_READ],
        },
      },
    })
    .addVersion(
      {
        version: ALERT_ANALYSIS_WORKFLOW_API_VERSION,
        validate: {
          request: {
            body: buildRouteValidationWithZod(
              AlertAnalysisWorkflowRuleAttachmentSelectionRequestBody
            ),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          if (!(await isAlertAnalysisWorkflowEnabled(getStartServices))) {
            return response.notFound();
          }

          const { search } =
            request.body as AlertAnalysisWorkflowRuleAttachmentSelectionRequestBodyType;
          const service = await createReadService(context);
          const body = await service.getRuleAttachmentSelection({ search });

          return response.ok({ body });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );

  router.versioned
    .post({
      path: ALERT_ANALYSIS_WORKFLOW_RULE_UPDATE_ROUTE,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [RULES_API_ALL],
        },
      },
    })
    .addVersion(
      {
        version: ALERT_ANALYSIS_WORKFLOW_API_VERSION,
        validate: {
          request: {
            body: buildRouteValidationWithZod(AlertAnalysisWorkflowRuleAttachmentUpdateRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          if (!(await isAlertAnalysisWorkflowEnabled(getStartServices))) {
            return response.notFound();
          }

          const { attachRuleIds, detachRuleIds, dryRun } =
            request.body as AlertAnalysisWorkflowRuleAttachmentUpdateRequestBodyType;
          const service = await createWriteService(context);
          const body = await service.updateRuleAttachments({
            attachRuleIds,
            detachRuleIds,
            dryRun,
          });

          return response.ok({ body });
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
