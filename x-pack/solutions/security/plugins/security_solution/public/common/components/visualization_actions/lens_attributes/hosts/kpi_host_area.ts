/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNIQUE_COUNT } from '../../translations';
import type { LensAttributes, GetLensAttributes } from '../../types';

const columnTimestamp = '5eea817b-67b7-4268-8ecb-7688d1094721';
const columnHostName = 'b00c65ea-32be-4163-bfc8-f795b1ef9d06';

const layerHostName = '416b6fad-1923-4f6a-a2df-b223bb287e30';
const DATA_VIEW_ID = 'entity-store-host-data-view';

export const getKpiHostAreaLensAttributes = (spaceId?: string): GetLensAttributes => {
  return ({ extraOptions }) => {
    const namespace = spaceId || extraOptions?.spaceId || 'default';
    const entityStoreIndexPattern = `.entities.v2.latest.security_host_${namespace}`;

    // Ad-hoc data view refs must be in state.internalReferences so Lens does not try to load them as saved objects (SavedObjectNotFound)
    const internalReferences = [
      {
        id: DATA_VIEW_ID,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern' as const,
      },
      {
        id: DATA_VIEW_ID,
        name: `indexpattern-datasource-layer-${layerHostName}`,
        type: 'index-pattern' as const,
      },
    ];

    return {
      description: '',
      state: {
        adHocDataViews: {
          [DATA_VIEW_ID]: {
            id: DATA_VIEW_ID,
            title: entityStoreIndexPattern,
            timeFieldName: '@timestamp',
          },
        },
        internalReferences,
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
      references: [],
    } as LensAttributes;
  };
};
