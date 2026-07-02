/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { Logger, StartServicesAccessor } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { RULES_API_ALL } from '@kbn/security-solution-features/constants';
import { WorkflowsManagementApiActions } from '@kbn/workflows';
import {
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_CONFIDENCE_SCORE_MAX_THRESHOLD,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_CONFIDENCE_SCORE_MIN_THRESHOLD,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_ENABLED,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_CONNECTOR_ID,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_CREATE_CONVERSATION,
  SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_ENABLED,
} from '@kbn/management-settings-ids';
import {
  ALERT_ANALYSIS_WORKFLOW_API_VERSION,
  ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE,
  AlertAnalysisWorkflowSettings,
} from '@kbn/workflows/common/alert_analysis_workflow';
import { ALERT_ANALYSIS_WORKFLOW_SETTINGS_UPDATED_EVENT } from '../lib/telemetry/event_based/events';
import type { SecuritySolutionPluginRouter } from '../types';
import type { StartPlugins } from '../plugin';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../lib/entity_analytics/audit';
import { AlertAnalysisWorkflowAuditActions } from './audit';
import {
  getSecurityAlertAnalysisWorkflowIdForSpace,
  initSecurityManagedWorkflowsClient,
  installSecurityAlertAnalysisWorkflow,
  isAlertAnalysisWorkflowEnabled,
  readSecurityAlertAnalysisWorkflowSettings,
  type SecurityAlertAnalysisWorkflowSettings,
} from './managed_workflows';

export { ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE };

const REQUIRED_PRIVILEGES = [
  'manage_advanced_settings',
  RULES_API_ALL,
  WorkflowsManagementApiActions.updateManaged,
];

const LICENSE_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.alertAnalysisWorkflow.settingsRoute.licenseError',
  { defaultMessage: 'Your license does not support this feature.' }
);

const AlertAnalysisWorkflowSettingsWithConnectorRequestBody = AlertAnalysisWorkflowSettings.extend({
  connectorId: z.string().optional(),
  workflowEnabled: z.boolean().optional(),
  createConversation: z.boolean().optional(),
}).refine(
  ({ autoCloseConfidenceScoreMinThreshold, autoCloseConfidenceScoreMaxThreshold }) =>
    autoCloseConfidenceScoreMinThreshold < autoCloseConfidenceScoreMaxThreshold,
  {
    message: 'Minimum confidence score must be lower than maximum confidence score',
    path: ['autoCloseConfidenceScoreMaxThreshold'],
  }
);

type AlertAnalysisWorkflowSettingsWithConnectorRequestBodyType = z.infer<
  typeof AlertAnalysisWorkflowSettingsWithConnectorRequestBody
>;

const toWorkflowSettings = ({
  autoCloseEnabled,
  autoCloseConfidenceScoreMinThreshold,
  autoCloseConfidenceScoreMaxThreshold,
  connectorId,
  workflowEnabled,
  createConversation,
}: AlertAnalysisWorkflowSettingsWithConnectorRequestBodyType): SecurityAlertAnalysisWorkflowSettings => ({
  autoCloseEnabled,
  autoCloseConfidenceScoreMinThreshold,
  autoCloseConfidenceScoreMaxThreshold,
  connectorId: connectorId ?? '',
  workflowEnabled: workflowEnabled ?? true,
  createConversation: createConversation ?? true,
});

export const registerAlertAnalysisWorkflowSettingsRoutes = (
  router: SecuritySolutionPluginRouter,
  getStartServices: StartServicesAccessor<StartPlugins>,
  logger: Logger
): void => {
  router.versioned
    .get({
      path: ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [{ allRequired: REQUIRED_PRIVILEGES }],
        },
      },
    })
    .addVersion(
      {
        version: ALERT_ANALYSIS_WORKFLOW_API_VERSION,
        validate: false,
      },
      async (context, request, response) => {
        const { license } = await context.licensing;
        if (!license.hasAtLeast('enterprise')) {
          return response.forbidden({ body: LICENSE_ERROR_MESSAGE });
        }

        const [coreStart] = await getStartServices();
        const uiSettingsClient = coreStart.uiSettings.asScopedToClient(
          coreStart.savedObjects.getScopedClient(request)
        );

        // Installing the workflow for the space is handled by the
        // init-alert-analysis-workflow initialization flow, which runs the first
        // time the Security Solution app loads in a space (see server/lib/initialization).
        const settings = await readSecurityAlertAnalysisWorkflowSettings(uiSettingsClient);
        const spaceId = (await context.securitySolution).getSpaceId();

        return response.ok({
          body: {
            settings,
            workflowId: getSecurityAlertAnalysisWorkflowIdForSpace(spaceId),
          },
        });
      }
    );

  router.versioned
    .put({
      path: ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [{ allRequired: REQUIRED_PRIVILEGES }],
        },
      },
    })
    .addVersion(
      {
        version: ALERT_ANALYSIS_WORKFLOW_API_VERSION,
        validate: {
          request: {
            body: buildRouteValidationWithZod(
              AlertAnalysisWorkflowSettingsWithConnectorRequestBody
            ),
          },
        },
      },
      async (context, request, response) => {
        const { license } = await context.licensing;
        if (!license.hasAtLeast('enterprise')) {
          return response.forbidden({ body: LICENSE_ERROR_MESSAGE });
        }

        const [coreStart, pluginsStart] = await getStartServices();

        if (!(await isAlertAnalysisWorkflowEnabled(coreStart))) {
          return response.notFound();
        }

        const { workflowsExtensions } = pluginsStart;
        if (!workflowsExtensions) {
          return response.customError({
            statusCode: 503,
            body: {
              message: 'Managed workflows are unavailable',
            },
          });
        }

        const settings = toWorkflowSettings(request.body);
        const securitySolution = await context.securitySolution;
        const spaceId = securitySolution.getSpaceId();

        const reportSettingsUpdatedEvent = (status: 'success' | 'error') => {
          try {
            coreStart.analytics.reportEvent(
              ALERT_ANALYSIS_WORKFLOW_SETTINGS_UPDATED_EVENT.eventType,
              {
                status,
                workflowEnabled: settings.workflowEnabled,
                autoCloseEnabled: settings.autoCloseEnabled,
                createConversation: settings.createConversation,
                connectorConfigured: Boolean(settings.connectorId),
                autoCloseConfidenceScoreMinThreshold: settings.autoCloseConfidenceScoreMinThreshold,
                autoCloseConfidenceScoreMaxThreshold: settings.autoCloseConfidenceScoreMaxThreshold,
              }
            );
          } catch (telemetryError) {
            logger.warn('Failed to report alert analysis workflow settings telemetry event', {
              error: telemetryError,
            });
          }
        };

        try {
          const uiSettingsClient = coreStart.uiSettings.asScopedToClient(
            coreStart.savedObjects.getScopedClient(request)
          );
          await uiSettingsClient.set(
            SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_ENABLED,
            settings.workflowEnabled
          );
          await uiSettingsClient.set(
            SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_ENABLED,
            settings.autoCloseEnabled
          );
          await uiSettingsClient.set(
            SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_CONFIDENCE_SCORE_MIN_THRESHOLD,
            settings.autoCloseConfidenceScoreMinThreshold
          );
          await uiSettingsClient.set(
            SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_AUTO_CLOSE_CONFIDENCE_SCORE_MAX_THRESHOLD,
            settings.autoCloseConfidenceScoreMaxThreshold
          );
          await uiSettingsClient.set(
            SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_CONNECTOR_ID,
            settings.connectorId
          );
          await uiSettingsClient.set(
            SECURITY_SOLUTION_ALERT_ANALYSIS_WORKFLOW_CREATE_CONVERSATION,
            settings.createConversation
          );

          const managedWorkflowsClient = await initSecurityManagedWorkflowsClient(
            workflowsExtensions
          );
          await installSecurityAlertAnalysisWorkflow({
            managedWorkflowsClient,
            spaceId,
            settings,
          });

          securitySolution.getAuditLogger()?.log({
            message: 'User updated the alert analysis workflow settings',
            event: {
              action: AlertAnalysisWorkflowAuditActions.ALERT_ANALYSIS_WORKFLOW_SETTINGS_UPDATE,
              category: [AUDIT_CATEGORY.DATABASE],
              type: [AUDIT_TYPE.CHANGE],
              outcome: AUDIT_OUTCOME.SUCCESS,
            },
          });
          reportSettingsUpdatedEvent('success');

          return response.ok({
            body: {
              settings,
              workflowId: getSecurityAlertAnalysisWorkflowIdForSpace(spaceId),
            },
          });
        } catch (error) {
          logger.warn('Failed to save alert analysis workflow settings', { error });

          securitySolution.getAuditLogger()?.log({
            message: 'User attempted to update the alert analysis workflow settings',
            event: {
              action: AlertAnalysisWorkflowAuditActions.ALERT_ANALYSIS_WORKFLOW_SETTINGS_UPDATE,
              category: [AUDIT_CATEGORY.DATABASE],
              type: [AUDIT_TYPE.CHANGE],
              outcome: AUDIT_OUTCOME.FAILURE,
            },
            error: {
              code: error instanceof Error ? error.name : 'Error',
              message: error instanceof Error ? error.message : String(error),
            },
          });
          reportSettingsUpdatedEvent('error');

          return response.customError({
            statusCode: 500,
            body: {
              message: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }
    );
};
