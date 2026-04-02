/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtraOptions, LensAttributes } from '../../types';

import {
  ENTITY_STORE_V2_HOSTS_KPI_LENS_AD_HOC_ID,
  getEntityStoreV2HostOnlyFilter,
  getEntityStoreV2LatestHostsIndexTitle,
} from './entity_store_v2_hosts_kpi_lens_shared';

const layerId = '416b6fad-1923-4f6a-a2df-b223bb287e30';
const columnHostUnique = 'b00c65ea-32be-4163-bfc8-f795b1ef9d06';

const getLegacyKpiHostMetricLensAttributes = (): LensAttributes => {
  return {
    description: '',
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            [layerId]: {
              columnOrder: [columnHostUnique],
              columns: {
                [columnHostUnique]: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: ' ',
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'host.name',
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
        accessor: columnHostUnique,
        layerId,
        layerType: 'data',
      },
    },
    title: '[Host] Hosts - metric',
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

const getEntityStoreV2KpiHostMetricLensAttributes = (spaceId?: string): LensAttributes => {
  const indexTitle = getEntityStoreV2LatestHostsIndexTitle(spaceId);

  return {
    description: '',
    state: {
      adHocDataViews: {
        [ENTITY_STORE_V2_HOSTS_KPI_LENS_AD_HOC_ID]: {
          allowHidden: false,
          allowNoIndex: false,
          fieldAttrs: {},
          fieldFormats: {},
          id: ENTITY_STORE_V2_HOSTS_KPI_LENS_AD_HOC_ID,
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
              columnOrder: [columnHostUnique],
              columns: {
                [columnHostUnique]: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: ' ',
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'entity.id',
                },
              },
              incompleteColumns: {},
            },
          },
        },
      },
      filters: [getEntityStoreV2HostOnlyFilter()],
      internalReferences: [
        {
          id: ENTITY_STORE_V2_HOSTS_KPI_LENS_AD_HOC_ID,
          name: 'indexpattern-datasource-current-indexpattern',
          type: 'index-pattern',
        },
        {
          id: ENTITY_STORE_V2_HOSTS_KPI_LENS_AD_HOC_ID,
          name: `indexpattern-datasource-layer-${layerId}`,
          type: 'index-pattern',
        },
      ],
      query: { language: 'kuery', query: '' },
      visualization: {
        accessor: columnHostUnique,
        layerId,
        layerType: 'data',
      },
    },
    title: '[Host] Hosts - metric',
    visualizationType: 'lnsLegacyMetric',
    references: [],
  } as LensAttributes;
};

/**
 * Hosts KPI metric Lens attributes. When `entityStoreV2Enabled` is true, uses Entity Store v2
 * latest index as an ad-hoc data source (same as the hosts KPI area chart).
 */
export const buildKpiHostMetricLensAttributes = (
  extraOptions?: Pick<ExtraOptions, 'entityStoreV2Enabled' | 'spaceId'>
): LensAttributes => {
  if (extraOptions?.entityStoreV2Enabled === true) {
    return getEntityStoreV2KpiHostMetricLensAttributes(extraOptions.spaceId);
  }
  return getLegacyKpiHostMetricLensAttributes();
};

/** Default (sourcerer data view) attributes — used where Entity Store v2 is off or unknown. */
export const kpiHostMetricLensAttributes: LensAttributes = buildKpiHostMetricLensAttributes();
