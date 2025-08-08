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
import { uniq } from 'lodash/fp';
import type { AppClient } from '../../../../types';
import { getRiskScoreLatestIndex } from '../../../../../common/entity_analytics/risk_engine';
import { getAssetCriticalityIndex } from '../../../../../common/entity_analytics/asset_criticality';
import { type EntityType as EntityTypeOpenAPI } from '../../../../../common/api/entity_analytics/entity_store/common.gen';
import { entityEngineDescriptorTypeName } from '../saved_object';

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

export const getByEntityTypeQuery = (entityType: EntityTypeOpenAPI) => {
  return `${entityEngineDescriptorTypeName}.attributes.type: ${entityType}`;
};

export const getEntitiesIndexName = (entityType: EntityTypeOpenAPI, namespace: string) =>
  entitiesIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V1,
    dataset: ENTITY_LATEST,
    definitionId: buildEntityDefinitionId(entityType, namespace),
  });

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
