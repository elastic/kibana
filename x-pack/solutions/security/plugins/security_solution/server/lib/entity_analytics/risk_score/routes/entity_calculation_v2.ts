/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { SecuritySolutionRequestHandlerContext } from '../../../../types';
import type { RiskScoresEntityCalculationResponse } from '../../../../../common/api/entity_analytics';
import { RiskScoresEntityCalculationRequest } from '../../../../../common/api/entity_analytics';
import { APP_ID, RISK_SCORE_ENTITY_CALCULATION_V2_URL } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { RiskScoreAuditActions } from '../audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../../audit';
import { withRiskEnginePrivilegeCheck } from '../../risk_engine/risk_engine_privileges';
import { withMinimumLicense } from '../../utils/with_minimum_license';
import { getIsIdBasedRiskScoringEnabled } from '../is_id_based_risk_scoring_enabled';
import { recalculateEntityRiskScore } from '../recalculate_entity_risk_score';

type Handler = (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<unknown, unknown, RiskScoresEntityCalculationRequest>,
  response: KibanaResponseFactory
) => Promise<IKibanaResponse<RiskScoresEntityCalculationResponse>>;

const handler: (logger: Logger) => Handler = (logger) => async (context, request, response) => {
  const securityContext = await context.securitySolution;
  const coreContext = await context.core;
  const securityConfig = securityContext.getConfig();
  const siemResponse = buildSiemResponse(response);

  if (!securityConfig.experimentalFeatures.entityAnalyticsEntityStoreV2) {
    return siemResponse.error({
      statusCode: 400,
      body: 'Entity Store V2 is not enabled',
    });
  }

  const { identifier_type: identifierType, entity_id: entityId } = request.body;

  if (!entityId) {
    return siemResponse.error({
      statusCode: 400,
      body: 'Entity ID is required',
    });
  }

  securityContext.getAuditLogger()?.log({
    message: 'User triggered custom manual scoring',
    event: {
      action: RiskScoreAuditActions.RISK_ENGINE_ENTITY_MANUAL_SCORING,
      category: AUDIT_CATEGORY.DATABASE,
      type: AUDIT_TYPE.CHANGE,
      outcome: AUDIT_OUTCOME.UNKNOWN,
    },
  });

  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asCurrentUser;
  const namespace = securityContext.getSpaceId();

  try {
    const idBasedRiskScoringEnabled = await getIsIdBasedRiskScoringEnabled(
      coreContext.uiSettings.client
    );
    const riskScoreDataClient = securityContext.getRiskScoreDataClient();

    await recalculateEntityRiskScore({
      esClient,
      soClient,
      crudClient: securityContext.getEntityStoreUpdateClient(),
      namespace,
      entityId,
      identifierType,
      getWriter: (ns) => riskScoreDataClient.getWriter({ namespace: ns }),
      idBasedRiskScoringEnabled,
      logger,
      alertSampleSizePerShard: securityConfig.entityAnalytics?.riskEngine?.alertSampleSizePerShard,
    });

    return response.ok({ body: { success: true } });
  } catch (e) {
    const error = transformError(e);
    return siemResponse.error({
      statusCode: error.statusCode,
      body: { message: error.message, full_error: JSON.stringify(e) },
      bypassErrorFormat: true,
    });
  }
};

export const riskScoreEntityCalculationRouteV2 = (
  router: EntityAnalyticsRoutesDeps['router'],
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'],
  logger: Logger
) => {
  router.versioned
    .post({
      path: RISK_SCORE_ENTITY_CALCULATION_V2_URL,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(RiskScoresEntityCalculationRequest),
          },
        },
      },
      withMinimumLicense(
        withRiskEnginePrivilegeCheck(getStartServices, handler(logger)),
        'platinum'
      )
    );
};
