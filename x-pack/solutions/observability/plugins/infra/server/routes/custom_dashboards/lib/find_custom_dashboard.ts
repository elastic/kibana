/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type {
  InfraCustomDashboard,
  InfraCustomDashboardAssetType,
} from '../../../../common/custom_dashboards';

export async function findCustomDashboard(
  assetType: InfraCustomDashboardAssetType,
  savedObjectsClient: SavedObjectsClientContract
) {
  const result = await savedObjectsClient.find<InfraCustomDashboard>({
    type: INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
    search: assetType,
    searchFields: ['assetType'] as [keyof InfraCustomDashboard],
    page: 1,
    perPage: 1000,
    sortField: 'updated_at',
    sortOrder: 'desc',
  });

  return result.saved_objects.map(({ id, attributes }) => ({
    id,
    ...attributes,
  }));
}
