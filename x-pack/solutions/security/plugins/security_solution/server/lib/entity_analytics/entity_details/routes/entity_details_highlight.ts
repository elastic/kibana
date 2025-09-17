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
} from '@kbn/elastic-assistant-common';
import { omit } from 'lodash';
import { getAnonymizedValues } from '@kbn/elastic-assistant-common/impl/data_anonymization/get_anonymized_values';
import { getAnonymizedData } from '@kbn/elastic-assistant-common/impl/data_anonymization/get_anonymized_data';
import { transformRawDataToRecord } from '@kbn/elastic-assistant-common/impl/data_anonymization/transform_raw_data';
import { flattenObject } from '@kbn/object-utils/src/flatten_object';
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
import type { IdentifierValuesByField } from '../../asset_criticality';
import { buildCriticalitiesQuery } from '../../asset_criticality';

export const RouteRequestBody = z.object({
  entityType: z.string(),
  entityIdentifier: z.string(),
  anonymizationFields: z.array(AnonymizationFieldResponse),
  from: z.number(),
  to: z.number(),
});

export const entityDetailsHighlightsRoute = (
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

          const fields = anonymizationFields
            .filter((fieldItem) => fieldItem.allowed)
            .map((fieldItem) => ({
              field: fieldItem.field,
              include_unmapped: true,
            }));

          const param: IdentifierValuesByField = {
            [entityField]: [entityIdentifier],
          };

          const criticalitiesQuery = buildCriticalitiesQuery(param);

          const criticalitySearchResponse = await assetCriticalityClient.search({
            query: criticalitiesQuery,
            size: 1,
            fields,
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
            ? [
                {
                  score: [latestRiskScore.calculated_score_norm],
                  id_field: [latestRiskScore.id_field],
                  inputs: latestRiskScore.inputs.map((input) => ({
                    risk_score: [input.risk_score?.toString() ?? ''],
                    contribution_score: [input.contribution_score?.toString() ?? ''],
                    description: [input.description ?? ''],
                    timestamp: [input.timestamp ?? ''],
                  })),
                },
              ]
            : [];

          const assetCriticalityAnonymized = criticalitySearchResponse.hits.hits.map((hit) =>
            transformRawDataToRecord({
              anonymizationFields,
              currentReplacements: localReplacements,
              getAnonymizedValue,
              onNewReplacements: localOnNewReplacements,
              rawData: getRawDataOrDefault(hit.fields),
            })
          );

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
            transformRawDataToRecord({
              anonymizationFields,
              currentReplacements: localReplacements,
              getAnonymizedValue,
              onNewReplacements: localOnNewReplacements,
              rawData: getRawDataOrDefault(hit.fields),
            })
          );

          // TODO: got a bug where agent.id was anonymized but not present into replacements
          const vulnerabilitiesAnonymized = vulnerabilities.hits.hits.map((hit) =>
            transformRawDataToRecord({
              anonymizationFields,
              currentReplacements: localReplacements,
              getAnonymizedValue,
              onNewReplacements: localOnNewReplacements,
              rawData: getRawDataOrDefault(hit.fields),
            })
          );

          let anomaliesAnonymized: Record<string, string[]>[] = [];
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

              return flattenObject({
                id: formattedAnomaly.job_id,
                score: formattedAnomaly.record_score,
                job: jobNameById[anomaly.jobId],
                entities: relatedEntities.anonymizedData,
              });
            });
          }

          return response.ok({
            body: {
              summary: {
                assetCriticality: assetCriticalityAnonymized,
                riskScore: anonymizedRiskScore,
                misconfigurations: misconfigurationsAnonymized,
                vulnerabilities: vulnerabilitiesAnonymized,
                anomalies: anomaliesAnonymized,
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
