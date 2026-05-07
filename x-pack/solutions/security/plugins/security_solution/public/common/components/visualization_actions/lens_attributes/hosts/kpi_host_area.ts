/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestEntitiesIndexName } from '@kbn/entity-store/common';
import { UNIQUE_COUNT } from '../../translations';
import type { LensAttributes, GetLensAttributes } from '../../types';

import {
  ENTITY_STORE_V2_HOSTS_KPI_LENS_AD_HOC_ID,
  getEntityStoreV2HostOnlyFilter,
} from './entity_store_v2_hosts_kpi_lens_shared';

const columnTimestamp = '5eea817b-67b7-4268-8ecb-7688d1094721';
const columnHostName = 'b00c65ea-32be-4163-bfc8-f795b1ef9d06';

const layerHostName = '416b6fad-1923-4f6a-a2df-b223bb287e30';

const getLegacyKpiHostAreaLensAttributes = (): LensAttributes => {
  return {
    description: '',
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            [layerHostName]: {
              columnOrder: [columnTimestamp, columnHostName],
              columns: {
                [columnTimestamp]: {
                  dataType: 'date',
                  isBucketed: true,
                  label: '@timestamp',
                  operationType: 'date_histogram',
                  params: { interval: 'auto' },
                  scale: 'interval',
                  sourceField: '@timestamp',
                },
                [columnHostName]: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: UNIQUE_COUNT('host.name'),
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
        axisTitlesVisibilitySettings: { x: false, yLeft: false, yRight: false },
        fittingFunction: 'None',
        gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
        labelsOrientation: { x: 0, yLeft: 0, yRight: 0 },
        layers: [
          {
            accessors: [columnHostName],
            layerId: layerHostName,
            layerType: 'data',
            seriesType: 'area',
            xAccessor: columnTimestamp,
          },
        ],
        legend: { isVisible: false, position: 'right' },
        preferredSeriesType: 'area',
        tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
        valueLabels: 'hide',
        yLeftExtent: { mode: 'full' },
        yRightExtent: { mode: 'full' },
      },
    },
    title: '[Host] Hosts - area',
    visualizationType: 'lnsXY',
    references: [
      {
        id: '{dataViewId}',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: '{dataViewId}',
        name: `indexpattern-datasource-layer-${layerHostName}`,
        type: 'index-pattern',
      },
    ],
  } as LensAttributes;
};

const getEntityStoreV2KpiHostAreaLensAttributes = (spaceId?: string): LensAttributes => {
  const indexTitle = getLatestEntitiesIndexName(spaceId ?? 'default');

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
            [layerHostName]: {
              columnOrder: [columnTimestamp, columnHostName],
              columns: {
                [columnTimestamp]: {
                  dataType: 'date',
                  isBucketed: true,
                  label: '@timestamp',
                  operationType: 'date_histogram',
                  params: { interval: 'auto' },
                  scale: 'interval',
                  sourceField: '@timestamp',
                },
                [columnHostName]: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: UNIQUE_COUNT('entity.id'),
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
          name: `indexpattern-datasource-layer-${layerHostName}`,
          type: 'index-pattern',
        },
      ],
      query: { language: 'kuery', query: '' },
      visualization: {
        axisTitlesVisibilitySettings: { x: false, yLeft: false, yRight: false },
        fittingFunction: 'None',
        gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
        labelsOrientation: { x: 0, yLeft: 0, yRight: 0 },
        layers: [
          {
            accessors: [columnHostName],
            layerId: layerHostName,
            layerType: 'data',
            seriesType: 'area',
            xAccessor: columnTimestamp,
          },
        ],
        legend: { isVisible: false, position: 'right' },
        preferredSeriesType: 'area',
        tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
        valueLabels: 'hide',
        yLeftExtent: { mode: 'full' },
        yRightExtent: { mode: 'full' },
      },
    },
    title: '[Host] Hosts - area',
    visualizationType: 'lnsXY',
    references: [],
  } as LensAttributes;
};

export const getKpiHostAreaLensAttributes: GetLensAttributes = ({ extraOptions }) => {
  if (extraOptions?.entityStoreV2Enabled === true) {
    return getEntityStoreV2KpiHostAreaLensAttributes(extraOptions.spaceId);
  }
  return getLegacyKpiHostAreaLensAttributes();
};
