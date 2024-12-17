/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_LATEST,
  ENTITY_SCHEMA_VERSION_V1,
  entitiesIndexPattern,
} from '@kbn/entities-schema';
import type { DataViewsService, DataView } from '@kbn/data-views-plugin/common';
import type { AppClient } from '../../../../types';
import { getRiskScoreLatestIndex } from '../../../../../common/entity_analytics/risk_engine';
import { getAssetCriticalityIndex } from '../../../../../common/entity_analytics/asset_criticality';
import {
  EntityTypeEnum,
  type EntityType,
} from '../../../../../common/api/entity_analytics/entity_store/common.gen';
import { entityEngineDescriptorTypeName } from '../saved_object';

const identityFieldMap: Record<EntityType, string> = {
  [EntityTypeEnum.host]: 'host.name',
  [EntityTypeEnum.user]: 'user.name',
  [EntityTypeEnum.service]: 'service.name',
};

export const getIdentityFieldForEntityType = (entityType: EntityType) => {
  return identityFieldMap[entityType];
};

export const buildIndexPatterns = async (
  space: string,
  appClient: AppClient,
  dataViewsService: DataViewsService
) => {
  const { alertsIndex, securitySolutionDataViewIndices } = await getSecuritySolutionIndices(
    appClient,
    dataViewsService
  );
  return [
    ...securitySolutionDataViewIndices.filter((item) => item !== alertsIndex),
    getAssetCriticalityIndex(space),
    getRiskScoreLatestIndex(space),
  ];
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

export const getByEntityTypeQuery = (entityType: EntityType) => {
  return `${entityEngineDescriptorTypeName}.attributes.type: ${entityType}`;
};

export const getEntitiesIndexName = (entityType: EntityType, namespace: string) =>
  entitiesIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V1,
    dataset: ENTITY_LATEST,
    definitionId: buildEntityDefinitionId(entityType, namespace),
  });

export const buildEntityDefinitionId = (entityType: EntityType, space: string) => {
  return `security_${entityType}_${space}`;
};

export const isPromiseFulfilled = <T>(
  result: PromiseSettledResult<T>
): result is PromiseFulfilledResult<T> => result.status === 'fulfilled';

export const isPromiseRejected = <T>(
  result: PromiseSettledResult<T>
): result is PromiseRejectedResult => result.status === 'rejected';
