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
import type { QueryDslFieldAndFormat } from '@elastic/elasticsearch/lib/api/types';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import type { RiskEngineDataClient } from '../risk_engine/risk_engine_data_client';
import type { EntityDetailsHighlightsRequestBody } from '../../../../common/api/entity_analytics/entity_details/highlights.gen';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import type { EntityAnalyticsRoutesDeps } from '../types';
import type { AssetCriticalityDataClient } from '../../asset_criticality';

interface EntityDetailsHighlightsServiceFactoryOptions {
  riskEngineClient: RiskEngineDataClient;
  entityStoreClient: EntityStoreCRUDClient;
  esClient: ElasticsearchClient;
  spaceId: string;
  logger: Logger;
  assetCriticalityClient: AssetCriticalityDataClient;
  soClient: SavedObjectsClientContract;
  uiSettingsClient: IUiSettingsClient;
  ml: EntityAnalyticsRoutesDeps['ml'];
  anonymizationFields: EntityDetailsHighlightsRequestBody['anonymizationFields'];
}

interface GetEnrichedEntitiesParams {
  entityTypes: EntityType[];
  fields?: QueryDslFieldAndFormat[];
  filterQuery?: string;
  page?: number;
  perPage?: number;
  request: KibanaRequest;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export const entityEnrichmentServiceFactory = ({
  logger,
  entityStoreClient,
  spaceId,
  esClient,
  soClient,
  uiSettingsClient,
  ml,
}: EntityDetailsHighlightsServiceFactoryOptions) => {
  const getEnrichedEntities = async ({
    entityTypes,
    filterQuery,
    fields,
    page,
    perPage,
    request,
    sortField,
    sortOrder,
  }: GetEnrichedEntitiesParams) => {
    // Proxy the listEntities call to the entity store
    const { entities, fields: entitiesFields } = await entityStoreClient.listEntities({
      entityTypes,
      page: page ?? 1,
      perPage: perPage ?? 10,
      sortField: sortField ?? '@timestamp',
      sortOrder: sortOrder ?? 'desc',
      ...(filterQuery ? { filterQuery } : {}),
      ...(fields ? { fields } : {}),
    });

    if (!entities || entities.length === 0) {
      return null;
    }

    // // For each entity returned, enrich with additional details
    // for (const entity of entities) {
    //   if (!entity.entity?.EngineMetadata?.Type || !entity.entity.id) {
    //     continue;
    //   }

    //   const entityType = entity.entity.EngineMetadata.Type as EntityType;
    //   const entityIdentifier = entity.entity.id;
    //   // Get risk score details
    //   const riskScore = await getRiskScoreData(entityType, entityIdentifier);
    //   const euidEntityFilter = euid.dsl.getEuidFilterBasedOnDocument(entityType, entity.entity);
    //   const query = { bool: { filter: [euidEntityFilter] } };

    //   // Get vulnerabilities details
    //   const { vulnerabilities, vulnerabilitiesTotal } = await getVulnerabilityData(
    //     entityType,
    //     query
    //   );
    //   // Get anomaly details

    //   const anomaliesAnonymized: Record<string, string[]>[] = await getAnomaliesData(
    //     request,
    //     [],
    //     query
    //   );
    // }

    // return {
    //   riskScore: anonymizedRiskScore ?? undefined,
    //   assetCriticality: assetCriticalityAnonymized,
    //   vulnerabilities: vulnerabilitiesAnonymized ?? [],
    //   vulnerabilitiesTotal, // Prevents the UI from displaying the wrong number of vulnerabilities
    //   anomalies: anomaliesAnonymized,
    // };
  };

  return {
    getEnrichedEntities,
  };
};
