/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse } from '@kbn/core-http-server';
import type { ReadRiskEngineSettingsResponse } from '../../../../../common/api/entity_analytics/risk_engine';
import { RISK_ENGINE_SETTINGS_URL, APP_ID } from '../../../../../common/constants';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { RiskEngineAuditActions } from '../audit';
import { getDefaultRiskEngineConfiguration } from '../utils/saved_object_configuration';

export const riskEngineSettingsRoute = (router: EntityAnalyticsRoutesDeps['router']) => {
  router.versioned
    .get({
      access: 'internal',
      path: RISK_ENGINE_SETTINGS_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      { version: '1', validate: {} },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<ReadRiskEngineSettingsResponse>> => {
        const siemResponse = buildSiemResponse(response);

        const securitySolution = await context.securitySolution;
        const riskEngineClient = securitySolution.getRiskEngineDataClient();

        try {
          const result = await riskEngineClient.getConfiguration();
          securitySolution.getAuditLogger()?.log({
            message: 'User accessed risk engine configuration information',
            event: {
              action: RiskEngineAuditActions.RISK_ENGINE_CONFIGURATION_GET,
              category: AUDIT_CATEGORY.DATABASE,
              type: AUDIT_TYPE.ACCESS,
              outcome: AUDIT_OUTCOME.SUCCESS,
            },
          });

          // A risk engine that is not installed yet has no configuration saved object, so report
          // the defaults it will be installed with rather than failing the request.
          const configuration =
            result ??
            getDefaultRiskEngineConfiguration({ namespace: securitySolution.getSpaceId() });

          return response.ok({
            body: {
              range: configuration.range,
              includeClosedAlerts:
                Array.isArray(configuration.excludeAlertStatuses) &&
                !configuration.excludeAlertStatuses.includes('closed'),
              enableResetToZero: configuration.enableResetToZero,
              filters: (configuration.filters || []).map((f) => ({
                entity_types: f.entity_types as Array<'host' | 'user' | 'service'>,
                filter: f.filter,
              })),
            },
          });
        } catch (e) {
          const error = transformError(e);

          return siemResponse.error({
            statusCode: error.statusCode,
            body: { message: error.message, full_error: JSON.stringify(e) },
            bypassErrorFormat: true,
          });
        }
      }
    );
};
