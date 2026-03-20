/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  IUiSettingsClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import {
  getVulnerabilitiesQuery,
  VULNERABILITIES_RESULT_EVALUATION,
} from '@kbn/cloud-security-posture-common/utils/findings_query_builders';
import { buildVulnerabilityEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common';
import type { Replacements } from '@kbn/elastic-assistant-common';
import { getAnonymizedValue, getRawDataOrDefault } from '@kbn/elastic-assistant-common';
import { omit } from 'lodash';
import { getAnonymizedValues } from '@kbn/elastic-assistant-common/impl/data_anonymization/get_anonymized_values';
import { getAnonymizedData } from '@kbn/elastic-assistant-common/impl/data_anonymization/get_anonymized_data';
import { transformRawDataToRecord } from '@kbn/elastic-assistant-common/impl/data_anonymization/transform_raw_data';
import { flattenObject } from '@kbn/object-utils/src/flatten_object';
import type {
  QueryDslQueryContainer,
  QueryDslFieldAndFormat,
} from '@elastic/elasticsearch/lib/api/types';
import type { MlSummaryJob } from '@kbn/ml-plugin/server';
import { createGetRiskScores } from '../risk_score/get_risk_score';
import type { EntityRiskScoreRecord } from '../../../../common/api/entity_analytics/common';
import type { RiskEngineDataClient } from '../risk_engine/risk_engine_data_client';
import type { EntityDetailsHighlightsRequestBody } from '../../../../common/api/entity_analytics/entity_details/highlights.gen';
import { getThreshold } from '../../../../common/utils/ml';
import { isSecurityJob } from '../../../../common/machine_learning/is_security_job';
import type { EntityIdentifierFields, EntityType } from '../../../../common/entity_analytics/types';
import { DEFAULT_ANOMALY_SCORE } from '../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../types';
import type { AssetCriticalityDataClient, IdentifierValuesByField } from '../asset_criticality';
import { buildCriticalitiesQuery } from '../asset_criticality';
import type { AggregationBucket } from '../../asset_inventory/telemetry/type';

// Always return a new object to prevent mutation
const getEmptyVulnerabilitiesTotal = (): Record<string, number> => ({
  [VULNERABILITIES_RESULT_EVALUATION.NONE]: 0,
  [VULNERABILITIES_RESULT_EVALUATION.CRITICAL]: 0,
  [VULNERABILITIES_RESULT_EVALUATION.HIGH]: 0,
  [VULNERABILITIES_RESULT_EVALUATION.MEDIUM]: 0,
  [VULNERABILITIES_RESULT_EVALUATION.LOW]: 0,
});

interface EntityDetailsHighlightsServiceFactoryOptions {
  riskEngineClient: RiskEngineDataClient;
  esClient: ElasticsearchClient;
  spaceId: string;
  logger: Logger;
  assetCriticalityClient: AssetCriticalityDataClient;
  soClient: SavedObjectsClientContract;
  uiSettingsClient: IUiSettingsClient;
  ml: EntityAnalyticsRoutesDeps['ml'];
  anonymizationFields: EntityDetailsHighlightsRequestBody['anonymizationFields'];
}

export const entityDetailsHighlightsServiceFactory = ({
  logger,
  riskEngineClient,
  spaceId,
  esClient,
  assetCriticalityClient,
  soClient,
  uiSettingsClient,
  ml,
  anonymizationFields,
}: EntityDetailsHighlightsServiceFactoryOptions) => {
  let localReplacements: Replacements = {};
  const localOnNewReplacements = (newReplacements: Replacements) => {
    localReplacements = { ...localReplacements, ...newReplacements };
  };
  const fields: QueryDslFieldAndFormat[] = anonymizationFields
    .filter((fieldItem) => fieldItem.allowed)
    .map((fieldItem) => ({
      field: fieldItem.field,
      include_unmapped: true,
    }));

  return {
    async getRiskScoreData(entityType: string, entityIdentifier: string) {
      const engineStatus = await riskEngineClient.getStatus({ namespace: spaceId });

      const getRiskScore = createGetRiskScores({
        logger,
        esClient,
        spaceId,
      });

      let latestRiskScore: EntityRiskScoreRecord | null = null;
      if (engineStatus.riskEngineStatus === 'ENABLED') {
        const riskScore = await getRiskScore({
          entityType: entityType as EntityType,
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
              alert_inputs: latestRiskScore.inputs.map((input) => ({
                risk_score: [input.risk_score?.toString() ?? ''],
                contribution_score: [input.contribution_score?.toString() ?? ''],
                description: [input.description ?? ''],
                timestamp: [input.timestamp ?? ''],
              })),
              asset_criticality_contribution_score:
                latestRiskScore.category_2_score?.toString() ?? '0',
            },
          ]
        : [];
      return anonymizedRiskScore;
    },
    async getAssetCriticalityData(entityField: EntityIdentifierFields, entityIdentifier: string) {
      const param: IdentifierValuesByField = {
        [entityField]: [entityIdentifier],
      };
      const criticalitiesQuery = buildCriticalitiesQuery(param);

      const criticalitySearchResponse = await assetCriticalityClient.search({
        query: criticalitiesQuery,
        size: 1,
        fields,
      });

      const assetCriticalityAnonymized = criticalitySearchResponse.hits.hits.map((hit) =>
        transformRawDataToRecord({
          anonymizationFields,
          currentReplacements: localReplacements,
          getAnonymizedValue,
          onNewReplacements: localOnNewReplacements,
          rawData: getRawDataOrDefault(omit(hit.fields, '_id')), // We need to exclude _id because asset criticality id contains user data
        })
      );
      return assetCriticalityAnonymized;
    },
    async getAnomaliesData(
      request: KibanaRequest,
      entityField: EntityIdentifierFields,
      entityIdentifier: string,
      fromDate: number,
      toDate: number
    ) {
      let anomaliesAnonymized: Record<string, string[]>[] = [];
      if (ml) {
        const jobs: MlSummaryJob[] = await ml.jobServiceProvider(request, soClient).jobsSummary();
        const securityJobIds = jobs.filter(isSecurityJob).map((j) => j.id);
        const { getAnomaliesTableData } = ml.resultsServiceProvider(request, soClient);
        const anomalyScore = await uiSettingsClient.get<number>(DEFAULT_ANOMALY_SCORE);

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
              name: job.customSettings?.security_app_display_name ?? job.id,
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
      return anomaliesAnonymized;
    },
    async getVulnerabilityData(entityField: EntityIdentifierFields, entityIdentifier: string) {
      const vulnerabilitiesQuery = getVulnerabilitiesQuery({
        query: buildVulnerabilityEntityFlyoutPreviewQuery(entityField, entityIdentifier),
        enabled: true,
        pageSize: 1,
        sort: [{ 'vulnerability.score.base': 'desc' }],
      });

      const vulnerabilities =
        entityField === 'host.name' // only hosts have vulnerabilities
          ? await esClient.search<unknown, { count: { buckets: AggregationBucket[] } }>({
              ...vulnerabilitiesQuery,
              query: vulnerabilitiesQuery.query as QueryDslQueryContainer,
              _source: false,
              fields,
              size: 100,
            })
          : null;

      const vulnerabilitiesAggregations = vulnerabilities?.aggregations?.count?.buckets;
      const vulnerabilitiesTotal = vulnerabilitiesAggregations
        ? Object.entries(vulnerabilitiesAggregations).reduce<Record<string, number>>(
            (acc, [key, value]) => {
              acc[key] = value.doc_count;
              return acc;
            },
            getEmptyVulnerabilitiesTotal()
          )
        : getEmptyVulnerabilitiesTotal();

      const vulnerabilitiesAnonymized = vulnerabilities?.hits.hits.map((hit) =>
        transformRawDataToRecord({
          anonymizationFields,
          currentReplacements: localReplacements,
          getAnonymizedValue,
          onNewReplacements: localOnNewReplacements,
          rawData: getRawDataOrDefault(hit.fields),
        })
      );
      return { vulnerabilitiesAnonymized, vulnerabilitiesTotal };
    },
    getLocalReplacements(entityField: EntityIdentifierFields, entityIdentifier: string) {
      // Ensure the entity identifier is present in the replacements
      const anonymizedEntityIdentifier = getAnonymizedData({
        anonymizationFields,
        currentReplacements: {},
        rawData: { [entityField]: [entityIdentifier] },
        getAnonymizedValue,
        getAnonymizedValues,
      });

      localOnNewReplacements(anonymizedEntityIdentifier.replacements);

      return localReplacements;
    },
  };
};
