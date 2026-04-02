/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtraOptions, LensAttributes } from '../../types';

import {
  ENTITY_STORE_V2_USERS_KPI_LENS_AD_HOC_ID,
  getEntityStoreV2LatestUsersIndexTitle,
  getEntityStoreV2UserOnlyFilter,
} from './entity_store_v2_users_kpi_lens_shared';

const layerId = '416b6fad-1923-4f6a-a2df-b223bb287e30';
const columnUserUnique = '3e51b035-872c-4b44-824b-fe069c222e91';

const getLegacyKpiTotalUsersMetricLensAttributes = (): LensAttributes => {
  return {
    description: '',
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            [layerId]: {
              columnOrder: [columnUserUnique],
              columns: {
                [columnUserUnique]: {
                  dataType: 'number',
                  isBucketed: false,
                  label: ' ',
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'user.name',
                  customLabel: true,
                },
              },
              incompleteColumns: {},
            },
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: {
        accessor: columnUserUnique,
        layerId,
        layerType: 'data',
      },
    },
    title: '[User] Users - metric',
    visualizationType: 'lnsLegacyMetric',
    references: [
      {
        id: '{dataViewId}',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: '{dataViewId}',
        name: `indexpattern-datasource-layer-${layerId}`,
        type: 'index-pattern',
      },
    ],
  } as LensAttributes;
};

const getEntityStoreV2KpiTotalUsersMetricLensAttributes = (spaceId?: string): LensAttributes => {
  const indexTitle = getEntityStoreV2LatestUsersIndexTitle(spaceId);

  return {
    description: '',
    state: {
      adHocDataViews: {
        [ENTITY_STORE_V2_USERS_KPI_LENS_AD_HOC_ID]: {
          allowHidden: false,
          allowNoIndex: false,
          fieldAttrs: {},
          fieldFormats: {},
          id: ENTITY_STORE_V2_USERS_KPI_LENS_AD_HOC_ID,
          name: indexTitle,
          runtimeFieldMap: {},
          sourceFilters: [],
          timeFieldName: '@timestamp',
          title: indexTitle,
        },
      },
      datasourceStates: {
        formBased: {
          layers: {
            [layerId]: {
              columnOrder: [columnUserUnique],
              columns: {
                [columnUserUnique]: {
                  dataType: 'number',
                  isBucketed: false,
                  label: ' ',
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'entity.id',
                  customLabel: true,
                },
              },
              incompleteColumns: {},
            },
          },
        },
      },
      filters: [getEntityStoreV2UserOnlyFilter()],
      internalReferences: [
        {
          id: ENTITY_STORE_V2_USERS_KPI_LENS_AD_HOC_ID,
          name: 'indexpattern-datasource-current-indexpattern',
          type: 'index-pattern',
        },
        {
          id: ENTITY_STORE_V2_USERS_KPI_LENS_AD_HOC_ID,
          name: `indexpattern-datasource-layer-${layerId}`,
          type: 'index-pattern',
        },
      ],
      query: { language: 'kuery', query: '' },
      visualization: {
        accessor: columnUserUnique,
        layerId,
        layerType: 'data',
      },
    },
    title: '[User] Users - metric',
    visualizationType: 'lnsLegacyMetric',
    references: [],
  } as LensAttributes;
};

/**
 * Users KPI metric Lens attributes. When `entityStoreV2Enabled` is true, uses Entity Store v2
 * latest index as an ad-hoc data source (same as the users KPI area chart).
 */
export const buildKpiTotalUsersMetricLensAttributes = (
  extraOptions?: Pick<ExtraOptions, 'entityStoreV2Enabled' | 'spaceId'>
): LensAttributes => {
  if (extraOptions?.entityStoreV2Enabled === true) {
    return getEntityStoreV2KpiTotalUsersMetricLensAttributes(extraOptions.spaceId);
  }
  return getLegacyKpiTotalUsersMetricLensAttributes();
};

/** Default (sourcerer data view) attributes — used where Entity Store v2 is off or unknown. */
export const kpiTotalUsersMetricLensAttributes: LensAttributes =
  buildKpiTotalUsersMetricLensAttributes();
