/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { KibanaRequest } from '@kbn/core/server';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  HUNT_THREAT_INTEL_SUPPLY_RESTORE_URL,
  HUNT_THREAT_INTEL_SUPPLY_URL,
} from '@kbn/alertzero-common';
import {
  ALERTZERO_API_PRIVILEGE_READ,
  ALERTZERO_API_PRIVILEGE_WRITE,
} from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { withAlertZeroEnabled } from '../with_alertzero_enabled';
import { hasManageSecurity } from '../workers/has_manage_security';
import {
  ThreatIntelSupplyHardGateError,
  ThreatIntelSupplyHuntDisabledError,
  ThreatIntelSupplyNotInstalledError,
} from '../../services/threat_intel_supply';

const hasManagedWorkflowUpdatePrivilege = (request: KibanaRequest): boolean =>
  WorkflowsManagementOperationPrivileges.updateManaged.every(
    (privilege) => request.authzResult?.[privilege] === true
  );

const supplyUnavailableMessage = () =>
  i18n.translate('xpack.alertzero.huntThreatIntelSupplyUnavailableErrorMessage', {
    defaultMessage: 'Threat intel supply status is temporarily unavailable',
  });

export const registerHuntThreatIntelSupplyRoutes = ({
  router,
  logger,
  getSpaceId,
  getThreatIntelSupplyService,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: HUNT_THREAT_INTEL_SUPPLY_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ],
        },
      },
      summary: 'Get Hunt Watch threat intel supply status for the current space',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: false,
      },
      withAlertZeroEnabled(async (_context, request, response) => {
        try {
          const supply = getThreatIntelSupplyService();
          if (!supply) {
            return response.customError({
              statusCode: 503,
              body: { message: supplyUnavailableMessage() },
            });
          }
          const body = await supply.getSupplyStatus(getSpaceId(request), request);
          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to read Hunt threat intel supply status: ${error}`);
          return response.customError({
            statusCode: 500,
            body: {
              message: i18n.translate(
                'xpack.alertzero.huntThreatIntelSupplyStatusFailedErrorMessage',
                { defaultMessage: 'Failed to read threat intel supply status' }
              ),
            },
          });
        }
      })
    );

  router.versioned
    .post({
      path: HUNT_THREAT_INTEL_SUPPLY_RESTORE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_WRITE],
          extendedPrivileges: [...WorkflowsManagementOperationPrivileges.updateManaged],
        },
      },
      summary: 'Restore Hunt Watch threat intel supply while Continuous Threat Hunt is enabled',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: false,
      },
      withAlertZeroEnabled(async (context, request, response) => {
        try {
          if (!(await hasManageSecurity(context))) {
            return response.forbidden({
              body: {
                message: i18n.translate(
                  'xpack.alertzero.huntThreatIntelSupplyRestoreForbiddenErrorMessage',
                  {
                    defaultMessage:
                      'Restoring threat intel supply requires the manage_security cluster privilege',
                  }
                ),
              },
            });
          }

          if (!hasManagedWorkflowUpdatePrivilege(request)) {
            return response.forbidden({
              body: {
                message: i18n.translate(
                  'xpack.alertzero.huntThreatIntelSupplyRestoreWorkflowForbiddenErrorMessage',
                  {
                    defaultMessage:
                      'Restoring threat intel supply requires update access to managed workflows',
                  }
                ),
              },
            });
          }

          const supply = getThreatIntelSupplyService();
          if (!supply) {
            return response.customError({
              statusCode: 503,
              body: { message: supplyUnavailableMessage() },
            });
          }

          const body = await supply.restoreSupplyForSpace(getSpaceId(request), request);
          return response.ok({ body });
        } catch (error) {
          if (error instanceof ThreatIntelSupplyHardGateError) {
            return response.badRequest({
              body: {
                message: i18n.translate(
                  'xpack.alertzero.huntThreatIntelSupplyRestoreHardGateErrorMessage',
                  {
                    defaultMessage:
                      'Hunt Watch needs Machine Learning embedding support for threat intel report supply. Finish ML and threat intel setup, then try again.',
                  }
                ),
              },
            });
          }
          if (error instanceof ThreatIntelSupplyHuntDisabledError) {
            return response.badRequest({
              body: {
                message: i18n.translate(
                  'xpack.alertzero.huntThreatIntelSupplyRestoreHuntOffErrorMessage',
                  {
                    defaultMessage: 'Turn on Hunt Watch before restoring threat intel supply.',
                  }
                ),
              },
            });
          }
          if (error instanceof ThreatIntelSupplyNotInstalledError) {
            return response.badRequest({
              body: {
                message: i18n.translate(
                  'xpack.alertzero.huntThreatIntelSupplyRestoreNotInstalledErrorMessage',
                  {
                    defaultMessage:
                      'Threat intel supply workflows are not installed in this deployment yet. Wait until setup finishes (Machine Learning embeddings available), then try again. If this persists after a restart, contact an administrator.',
                  }
                ),
              },
            });
          }
          logger.error(`Failed to restore Hunt threat intel supply: ${error}`);
          return response.customError({
            statusCode: 500,
            body: {
              message: i18n.translate(
                'xpack.alertzero.huntThreatIntelSupplyRestoreFailedErrorMessage',
                { defaultMessage: 'Failed to restore threat intel supply' }
              ),
            },
          });
        }
      })
    );
};
