/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { i18n } from '@kbn/i18n';
import { RULES_API_ALL, RULES_API_READ } from '@kbn/security-solution-features/constants';
import { transformError } from '@kbn/securitysolution-es-utils';
import { SECURITY_ALERT_ANALYSIS_WORKFLOW_ID } from '@kbn/workflows/managed';
import {
  ALERT_ANALYSIS_WORKFLOW_API_VERSION,
  ALERT_ANALYSIS_WORKFLOW_RULE_SELECTION_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULE_STATS_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULE_UPDATE_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULES_ROUTE,
  AlertAnalysisWorkflowRuleAttachmentListRequestQuery,
  AlertAnalysisWorkflowRuleAttachmentSelectionRequestQuery,
  AlertAnalysisWorkflowRuleAttachmentStatsRequestQuery,
  AlertAnalysisWorkflowRuleAttachmentUpdateRequestBody,
  type AlertAnalysisWorkflowRuleAttachmentListRequestQuery as AlertAnalysisWorkflowRuleAttachmentListRequestQueryType,
  type AlertAnalysisWorkflowRuleAttachmentSelectionRequestQuery as AlertAnalysisWorkflowRuleAttachmentSelectionRequestQueryType,
  type AlertAnalysisWorkflowRuleAttachmentStatsRequestQuery as AlertAnalysisWorkflowRuleAttachmentStatsRequestQueryType,
  type AlertAnalysisWorkflowRuleAttachmentUpdateRequestBody as AlertAnalysisWorkflowRuleAttachmentUpdateRequestBodyType,
} from '../../../common/workflows/alert_analysis_workflow';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../types';
import { buildSiemResponse } from '../../lib/detection_engine/routes/utils';
import { createPrebuiltRuleAssetsClient } from '../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { createAlertAnalysisWorkflowRuleAttachmentService } from './rule_attachments';

export {
  ALERT_ANALYSIS_WORKFLOW_RULE_SELECTION_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULE_STATS_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULE_UPDATE_ROUTE,
  ALERT_ANALYSIS_WORKFLOW_RULES_ROUTE,
};

const LICENSE_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.ruleAttachmentRoute.licenseError',
  { defaultMessage: 'Your license does not support this feature.' }
);

// The alert analysis workflow is an Enterprise feature (the settings routes enforce the same
// gate), so its rule-attachment routes require an Enterprise license too.
const hasEnterpriseLicense = async (
  context: SecuritySolutionRequestHandlerContext
): Promise<boolean> => {
  const { license } = await context.licensing;
  return license.hasAtLeast('enterprise');
};

const createReadService = async (context: SecuritySolutionRequestHandlerContext) => {
  const ctx = await context.resolve(['securitySolution', 'alerting']);
  const rulesClient = await ctx.alerting.getRulesClient();

  return createAlertAnalysisWorkflowRuleAttachmentService({
    rulesClient,
    workflowId: SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
  });
};

const createWriteService = async (context: SecuritySolutionRequestHandlerContext) => {
  const ctx = await context.resolve(['core', 'securitySolution', 'alerting', 'actions']);
  const rulesClient = await ctx.alerting.getRulesClient();
  const actionsClient = ctx.actions.getActionsClient();
  const detectionRulesClient = ctx.securitySolution.getDetectionRulesClient();

  return createAlertAnalysisWorkflowRuleAttachmentService({
    rulesClient,
    workflowId: SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
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
  router: SecuritySolutionPluginRouter
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
          if (!(await hasEnterpriseLicense(context))) {
            return response.forbidden({ body: LICENSE_ERROR_MESSAGE });
          }

          const {
            search,
            attachment_filter: attachmentFilter,
            page,
            per_page: perPage,
          } = request.query as AlertAnalysisWorkflowRuleAttachmentListRequestQueryType;
          const service = await createReadService(context);
          const body = await service.getRuleAttachments({
            search,
            attachmentFilter,
            page,
            perPage,
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

  router.versioned
    .get({
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
            query: buildRouteValidationWithZod(
              AlertAnalysisWorkflowRuleAttachmentStatsRequestQuery
            ),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          if (!(await hasEnterpriseLicense(context))) {
            return response.forbidden({ body: LICENSE_ERROR_MESSAGE });
          }

          const { search, attachment_filter: attachmentFilter } =
            request.query as AlertAnalysisWorkflowRuleAttachmentStatsRequestQueryType;
          const service = await createReadService(context);
          const body = await service.getRuleAttachmentStats({ search, attachmentFilter });

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
    .get({
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
            query: buildRouteValidationWithZod(
              AlertAnalysisWorkflowRuleAttachmentSelectionRequestQuery
            ),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          if (!(await hasEnterpriseLicense(context))) {
            return response.forbidden({ body: LICENSE_ERROR_MESSAGE });
          }

          const { search, attachment_filter: attachmentFilter } =
            request.query as AlertAnalysisWorkflowRuleAttachmentSelectionRequestQueryType;
          const service = await createReadService(context);
          const body = await service.getRuleAttachmentSelection({ search, attachmentFilter });

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
          if (!(await hasEnterpriseLicense(context))) {
            return response.forbidden({ body: LICENSE_ERROR_MESSAGE });
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
