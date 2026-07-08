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
import { VULNERABILITIES_RESULT_EVALUATION } from '@kbn/cloud-security-posture-common/utils/findings_query_builders';
import type { Replacements } from '@kbn/elastic-assistant-common';
import { getAnonymizedValue, getRawDataOrDefault } from '@kbn/elastic-assistant-common';
import { omit } from 'lodash';
import { getAnonymizedValues } from '@kbn/elastic-assistant-common/impl/data_anonymization/get_anonymized_values';
import { getAnonymizedData } from '@kbn/elastic-assistant-common/impl/data_anonymization/get_anonymized_data';
import { transformRawDataToRecord } from '@kbn/elastic-assistant-common/impl/data_anonymization/transform_raw_data';
import { flattenObject } from '@kbn/object-utils/src/flatten_object';
import type { QueryDslFieldAndFormat } from '@elastic/elasticsearch/lib/api/types';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import type { RiskEngineDataClient } from '../risk_engine/risk_engine_data_client';
import type { EntityDetailsHighlightsRequestBody } from '../../../../common/api/entity_analytics/entity_details/highlights.gen';
import { type EntityIdentifierFields } from '../../../../common/entity_analytics/types';
import type { EntityAnalyticsRoutesDeps } from '../types';
import type { AssetCriticalityDataClient } from '../asset_criticality';
import type { EnrichedEntity } from '../enriched_entity';
import { EnrichEntityService } from '../enriched_entity';

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
  entityStoreClient: EntityStoreCRUDClient;
  esClient: ElasticsearchClient;
  experimentalFeatures: EntityAnalyticsRoutesDeps['config']['experimentalFeatures'];
  spaceId: string;
  logger: Logger;
  request: KibanaRequest;
  assetCriticalityClient: AssetCriticalityDataClient;
  soClient: SavedObjectsClientContract;
  uiSettingsClient: IUiSettingsClient;
  ml: EntityAnalyticsRoutesDeps['ml'];
  anonymizationFields: EntityDetailsHighlightsRequestBody['anonymizationFields'];
}

interface GetDataFnOpts {
  entityType: string;
  entityIdentifier: string;
  anomalyFromDate: number;
  anomalyToDate: number;
}

export const entityDetailsHighlightsServiceFactory = ({
  logger,
  riskEngineClient,
  entityStoreClient,
  experimentalFeatures,
  request,
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

  const getLocalReplacements = (entityField: EntityIdentifierFields, entityIdentifier: string) => {
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
  };

  const applyAnonymizationToData = (enrichedEntity: EnrichedEntity) => {
    const anonymizedRiskScore = enrichedEntity.riskScore
      ? [
          {
            score: [enrichedEntity.riskScore.calculated_score_norm],
            id_field: [enrichedEntity.riskScore.id_field],
            alert_inputs: enrichedEntity.riskScore.inputs.map((input) => ({
              risk_score: [input.risk_score?.toString() ?? ''],
              contribution_score: [input.contribution_score?.toString() ?? ''],
              description: [input.description ?? ''],
              timestamp: [input.timestamp ?? ''],
            })),
            asset_criticality_contribution_score:
              enrichedEntity.riskScore.category_2_score?.toString() ?? '0',
          },
        ]
      : [];

    const assetCriticalityAnonymized_ = transformRawDataToRecord({
      anonymizationFields,
      currentReplacements: localReplacements,
      getAnonymizedValue,
      onNewReplacements: localOnNewReplacements,
      rawData: getRawDataOrDefault(omit(enrichedEntity.fields, '_id')), // We need to exclude _id because asset criticality id contains user data
    });
    const assetCriticalityAnonymized = assetCriticalityAnonymized_
      ? [assetCriticalityAnonymized_]
      : [];

    const vulnerabilitiesAnonymized = (enrichedEntity.vulnerabilities ?? []).map((hit) =>
      transformRawDataToRecord({
        anonymizationFields,
        currentReplacements: localReplacements,
        getAnonymizedValue,
        onNewReplacements: localOnNewReplacements,
        rawData: getRawDataOrDefault(hit.fields),
      })
    );

    const anomaliesAnonymized = (enrichedEntity.anomalies ?? []).map((anomaly) => {
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
        id: formattedAnomaly.job_id ?? formattedAnomaly.jobId,
        score: formattedAnomaly.record_score ?? formattedAnomaly.recordScore,
        job: anomaly.job,
        threat_tactics: formattedAnomaly.threatTactics ?? [],
        entities: relatedEntities.anonymizedData,
      });
    });

    return {
      riskScore: anonymizedRiskScore ?? undefined,
      assetCriticality: assetCriticalityAnonymized,
      vulnerabilities: vulnerabilitiesAnonymized ?? [],
      vulnerabilitiesTotal: enrichedEntity.vulnerabilitiesTotal, // Prevents the UI from displaying the wrong number of vulnerabilities
      anomalies: anomaliesAnonymized,
    };
  };

  const getV2Data = async ({ entityIdentifier, anomalyFromDate, anomalyToDate }: GetDataFnOpts) => {
    const enrichedEntityService = new EnrichEntityService({
      entityStoreClient,
      esClient,
      experimentalFeatures,
      logger,
      ml,
      request,
      soClient,
      spaceId,
      uiSettingsClient,
    });

    const { entities: enrichedEntities } = await enrichedEntityService.getEnrichedEntities({
      anomalyFromDate,
      anomalyToDate,
      filter: { term: { 'entity.id': entityIdentifier } },
      size: 1,
      fields,
      getAlertInputsForRiskScore: false,
    });

    if (!enrichedEntities || enrichedEntities.length === 0) {
      return {
        riskScore: [],
        assetCriticality: [],
        vulnerabilities: [],
        vulnerabilitiesTotal: getEmptyVulnerabilitiesTotal(),
        anomalies: [],
      };
    }

    return applyAnonymizationToData(enrichedEntities[0]);
  };

  return {
    getLocalReplacements,
    getV2Data,
  };
};
