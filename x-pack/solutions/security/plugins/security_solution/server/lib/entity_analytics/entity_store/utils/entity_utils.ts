/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_LATEST,
  ENTITY_HISTORY,
  ENTITY_RESET,
  ENTITY_SCHEMA_VERSION_V1,
  entitiesIndexPattern,
} from '@kbn/entities-schema';
import type { DataViewsService, DataView } from '@kbn/data-views-plugin/common';
import { uniq } from 'lodash/fp';
import type { AppClient } from '../../../../types';
import { getRiskScoreLatestIndex } from '../../../../../common/entity_analytics/risk_engine';
import { getAssetCriticalityIndex } from '../../../../../common/entity_analytics/asset_criticality';
import { EntityType as EntityTypeOpenAPI } from '../../../../../common/api/entity_analytics/entity_store/common.gen';
import { entityEngineDescriptorTypeName } from '../saved_object';
import { getEntityUpdatesDataStreamName } from '../elasticsearch_assets/updates_entity_data_stream';
import { getPrivilegedMonitorUsersIndex } from '../../../../../common/entity_analytics/privileged_user_monitoring/utils';

export const buildIndexPatterns = async (
  space: string,
  appClient: AppClient,
  dataViewsService: DataViewsService,
  onlyForType?: EntityTypeOpenAPI
) => {
  const { alertsIndex, securitySolutionDataViewIndices } = await getSecuritySolutionIndices(
    appClient,
    dataViewsService
  );
  return [
    ...securitySolutionDataViewIndices.filter((item) => item !== alertsIndex),
    ...(onlyForType === 'user' ? [getPrivilegedMonitorUsersIndex(space)] : []),
    getAssetCriticalityIndex(space),
    getRiskScoreLatestIndex(space),
  ];
};

export const buildIndexPatternsByEngine = async (
  space: string,
  entityType: EntityTypeOpenAPI,
  appClient: AppClient,
  dataViewsService: DataViewsService
) => {
  const patterns = await buildIndexPatterns(space, appClient, dataViewsService, entityType);
  patterns.push(getEntitiesResetIndexName(entityType, space).concat('*'));
  patterns.push(...getEntityUpdatesIndexPatterns(space, entityType));
  return patterns;
};

const getSecuritySolutionIndices = async (
  appClient: AppClient,
  dataViewsService: DataViewsService
) => {
  const securitySolutionDataViewId = appClient.getSourcererDataViewId();
  let dataView: DataView;
  try {
    dataView = await dataViewsService.get(securitySolutionDataViewId);
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      throw new Error(`Data view not found '${securitySolutionDataViewId}'`);
    }
    throw e;
  }

  const dataViewIndexPattern = dataView.getIndexPattern();
  return {
    securitySolutionDataViewIndices: dataViewIndexPattern.split(','),
    alertsIndex: appClient.getAlertsIndex(),
  };
};

export const getByEntityTypeQuery = (entityType: EntityTypeOpenAPI) => {
  return `${entityEngineDescriptorTypeName}.attributes.type: ${entityType}`;
};

export const getEntitiesIndexName = (entityType: EntityTypeOpenAPI, namespace: string) =>
  entitiesIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V1,
    dataset: ENTITY_LATEST,
    definitionId: buildEntityDefinitionId(entityType, namespace),
  });

export function getEntitiesSnapshotIndexName(
  entityType: EntityTypeOpenAPI,
  snapshotDate: Date,
  namespace: string
) {
  const snapshotId = `${snapshotDate.toISOString().split('T')[0]}.${buildEntityDefinitionId(
    entityType,
    namespace
  )}`;
  return entitiesIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V1,
    dataset: ENTITY_HISTORY,
    definitionId: snapshotId,
  });
}

export function getEntitiesSnapshotIndexPattern(entityType: EntityTypeOpenAPI, namespace: string) {
  const snapshotId = `*.${buildEntityDefinitionId(entityType, namespace)}`;
  return entitiesIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V1,
    dataset: ENTITY_HISTORY,
    definitionId: snapshotId,
  });
}

export function getEntitiesResetIndexName(entityType: EntityTypeOpenAPI, namespace: string) {
  return entitiesIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V1,
    dataset: ENTITY_RESET,
    definitionId: buildEntityDefinitionId(entityType, namespace),
  });
}

export const getEntityUpdatesIndexPatterns = (
  space: string,
  onlyForType?: EntityTypeOpenAPI
): string[] => {
  const types = onlyForType ? [onlyForType] : Object.values(EntityTypeOpenAPI.enum);
  const patterns = [];
  for (let i = 0; i < types.length; i++) {
    const index = getEntityUpdatesDataStreamName(types[i], space);
    patterns.push(`${index}*`);
  }
  return patterns;
};

export const buildEntityDefinitionId = (entityType: EntityTypeOpenAPI, space: string) => {
  return `security_${entityType}_${space}`;
};

export const isPromiseFulfilled = <T>(
  result: PromiseSettledResult<T>
): result is PromiseFulfilledResult<T> => result.status === 'fulfilled';

export const isPromiseRejected = <T>(
  result: PromiseSettledResult<T>
): result is PromiseRejectedResult => result.status === 'rejected';

export const mergeEntityStoreIndices = (indices: string[], indexPattern: string | undefined) =>
  indexPattern ? uniq(indices.concat(indexPattern.split(','))) : indices;
