/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import {
  getVulnerabilitiesQuery,
  buildMisconfigurationsFindingsQuery,
} from '@kbn/cloud-security-posture-common/utils/findings_query_builders';
import {
  buildGenericEntityFlyoutPreviewQuery,
  buildVulnerabilityEntityFlyoutPreviewQuery,
} from '@kbn/cloud-security-posture-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';
import type { Replacements } from '@kbn/elastic-assistant-common';
import {
  AnonymizationFieldResponse,
  getAnonymizedValue,
  getRawDataOrDefault,
  transformRawData,
} from '@kbn/elastic-assistant-common';
import { forOwn, isPlainObject, omit } from 'lodash';
import { getAnonymizedValues } from '@kbn/elastic-assistant-common/impl/data_anonymization/get_anonymized_values';
import { getAnonymizedData } from '@kbn/elastic-assistant-common/impl/data_anonymization/get_anonymized_data';
import { getCsvFromData } from '@kbn/elastic-assistant-common/impl/data_anonymization/get_csv_from_data';
import type { EntityRiskScoreRecord } from '../../../../../common/api/entity_analytics/common';
import { getThreshold } from '../../../../../common/utils/ml';
import { isSecurityJob } from '../../../../../common/machine_learning/is_security_job';
import { ENTITY_DETAILS_HIGHLIGH_INTERNAL_URL } from '../../../../../common/entity_analytics/entity_analytics/constants';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import { EntityTypeToIdentifierField } from '../../../../../common/entity_analytics/types';
import { type AssetCriticalityGetPrivilegesResponse } from '../../../../../common/api/entity_analytics';
import { APP_ID, API_VERSIONS, DEFAULT_ANOMALY_SCORE } from '../../../../../common/constants';

import type { EntityAnalyticsRoutesDeps } from '../../types';
import { createGetRiskScores } from '../../risk_score/get_risk_score';

export const RouteRequestBody = z.object({
  entityType: z.string(),
  entityIdentifier: z.string(),
  anonymizationFields: z.array(AnonymizationFieldResponse),
  from: z.number(),
  to: z.number(),
});

export const highlightEntityDetailsAIRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger,
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'],
  ml: EntityAnalyticsRoutesDeps['ml']
) => {
  router.versioned
    .post({
      access: 'internal',
      path: ENTITY_DETAILS_HIGHLIGH_INTERNAL_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(RouteRequestBody),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<AssetCriticalityGetPrivilegesResponse>> => {
        const siemResponse = buildSiemResponse(response);
        try {
          const entityType: EntityType = request.body.entityType;
          const entityIdentifier: string = request.body.entityIdentifier;
          const anonymizationFields = request.body.anonymizationFields;
          const entityField = EntityTypeToIdentifierField[entityType];
          const fromDate = request.body.from;
          const toDate = request.body.to;

          const [coreStart, { security }] = await getStartServices();
          const securitySolution = await context.securitySolution;
          const esClient = coreStart.elasticsearch.client.asInternalUser;
          const spaceId = securitySolution.getSpaceId();

          const coreContext = await context.core;
          const soClient = coreContext.savedObjects.client;

          const getRiskScore = createGetRiskScores({
            logger,
            esClient,
            spaceId,
          });

          const assetCriticalityClient = securitySolution.getAssetCriticalityDataClient();
          const assetCriticality = await assetCriticalityClient.get({
            idField: entityField,
            idValue: entityIdentifier,
          });
          let localReplacements: Replacements = {};
          const localOnNewReplacements = (newReplacements: Replacements) => {
            localReplacements = { ...localReplacements, ...newReplacements };
          };

          const riskEngineClient = securitySolution.getRiskEngineDataClient();
          const engineStatus = await riskEngineClient.getStatus({ namespace: spaceId });

          let latestRiskScore: EntityRiskScoreRecord | null = null;
          if (engineStatus.riskEngineStatus === 'ENABLED') {
            const riskScore = await getRiskScore({
              entityType,
              entityIdentifier,
              pagination: { querySize: 1, cursorStart: 0 },
            });
            latestRiskScore = riskScore[0];
          }

          const anonymizedRiskScore = latestRiskScore
            ? {
                score: [latestRiskScore.calculated_score_norm],
                id_field: [latestRiskScore.id_field],
                inputs: latestRiskScore.inputs.map((input) =>
                  getCsvFromData({
                    risk_score: [input.risk_score?.toString() ?? ''],
                    contribution_score: [input.contribution_score?.toString() ?? ''],
                    description: [input.description ?? ''],
                    timestamp: [input.timestamp ?? ''],
                  })
                ),
              }
            : undefined;

          const assetCriticalityAnonymized = assetCriticality
            ? transformRawData({
                anonymizationFields,
                currentReplacements: localReplacements,
                getAnonymizedValue,
                onNewReplacements: localOnNewReplacements,
                rawData: getRawDataOrDefault(flattenObject(assetCriticality)),
              })
            : null;

          const misconfigurationQuery = buildMisconfigurationsFindingsQuery(
            {
              query: buildGenericEntityFlyoutPreviewQuery(
                entityField,
                entityIdentifier,
                'failed', // Only returns failed misconfigurations
                'result.evaluation'
              ),
            },
            {}
          ); // second param is rulesStates which is only available inside cloud posture plugin server

          const fields = anonymizationFields
            .filter((fieldItem) => fieldItem.allowed)
            .map((fieldItem) => ({
              field: fieldItem.field,
              include_unmapped: true,
            }));

          const misconfigurations = await esClient.search<unknown, unknown>({
            ...misconfigurationQuery,
            _source: false,
            fields,
            size: 10,
          });

          const vulnerabilitiesQuery = getVulnerabilitiesQuery({
            query: buildVulnerabilityEntityFlyoutPreviewQuery(entityField, entityIdentifier),
            enabled: true,
            pageSize: 1,
          });
          const vulnerabilities = await esClient.search<unknown, unknown>({
            ...vulnerabilitiesQuery,
            _source: false,
            fields,
            size: 10,
          });

          const misconfigurationsAnonymized = misconfigurations.hits.hits.map((hit) =>
            transformRawData({
              anonymizationFields,
              currentReplacements: localReplacements,
              getAnonymizedValue,
              onNewReplacements: localOnNewReplacements,
              rawData: getRawDataOrDefault(hit.fields),
            })
          );

          const vulnerabilitiesAnonymized = vulnerabilities.hits.hits.map((hit) =>
            transformRawData({
              anonymizationFields,
              currentReplacements: localReplacements,
              getAnonymizedValue,
              onNewReplacements: localOnNewReplacements,
              rawData: getRawDataOrDefault(hit.fields),
            })
          );

          let anomaliesAnonymized: string[] = [];
          if (ml) {
            const jobs = await ml.jobServiceProvider(request, soClient).jobsSummary();
            const securityJobIds = jobs.filter(isSecurityJob).map((j) => j.id);
            const { getAnomaliesTableData } = ml.resultsServiceProvider(request, soClient);

            const anomalyScore = await coreContext.uiSettings.client.get<number>(
              DEFAULT_ANOMALY_SCORE
            );

            const anomaliesData = await getAnomaliesTableData(
              securityJobIds,
              [{ fieldName: entityField, fieldValue: entityIdentifier }],
              [],
              'auto',
              [{ min: getThreshold(anomalyScore, -1) }],
              fromDate,
              toDate,
              Intl.DateTimeFormat().resolvedOptions().timeZone,
              500,
              10,
              undefined
            );

            const jobNameById = jobs.reduce<Record<string, { name: string; description: string }>>(
              (acc, job) => {
                acc[job.id] = {
                  name: job.customSettings.security_app_display_name,
                  description: job.description,
                };
                return acc;
              },
              {}
            );

            anomaliesAnonymized = anomaliesData.anomalies.map((anomaly) => {
              // remove fields that could leak user data
              const formattedAnomaly = omit(anomaly.source, [
                'partition_field_value',
                'influencers',
                'entityValue',
              ]);

              // the only ECS fields inside anomalies are entities data (user, host, ip)
              const relatedEntities = getAnonymizedData({
                anonymizationFields,
                currentReplacements: localReplacements,
                rawData: getRawDataOrDefault(flattenObject(formattedAnomaly)),
                getAnonymizedValue,
                getAnonymizedValues,
              });
              localOnNewReplacements(relatedEntities.replacements);

              return getCsvFromData(
                flattenObject({
                  id: formattedAnomaly.job_id,
                  score: formattedAnomaly.record_score,
                  job: jobNameById[anomaly.jobId],
                  entities: relatedEntities.anonymizedData,
                })
              );
            });
          }

          return response.ok({
            body: {
              summary: {
                assetCriticalityAnonymized,
                anonymizedRiskScore,
                misconfigurationsAnonymized,
                vulnerabilitiesAnonymized,
                anomaliesAnonymized,
              },
              replacements: localReplacements,
            },
          });
        } catch (e) {
          const error = transformError(e);

          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};

function flattenObject(obj, parentKey = '', result = {}) {
  forOwn(obj, (value, key) => {
    const newKey = parentKey ? `${parentKey}.${key}` : key;
    if (isPlainObject(value)) {
      flattenObject(value, newKey, result);
    } else {
      result[newKey] = Array.isArray(value) ? value : [value];
    }
  });
  return result;
}
