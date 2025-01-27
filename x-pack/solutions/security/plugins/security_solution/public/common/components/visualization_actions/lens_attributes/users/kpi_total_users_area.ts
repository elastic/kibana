/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNIQUE_COUNT } from '../../translations';
import type { LensAttributes, GetLensAttributes } from '../../types';

const columnTimestamp = '5eea817b-67b7-4268-8ecb-7688d1094721';
const columnUserName = 'b00c65ea-32be-4163-bfc8-f795b1ef9d06';

const layerUserName = '416b6fad-1923-4f6a-a2df-b223bb287e30';

export const getKpiTotalUsersAreaLensAttributes: GetLensAttributes = () =>
  ({
    description: '',
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            [layerUserName]: {
              columnOrder: [columnTimestamp, columnUserName],
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
                [columnUserName]: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: UNIQUE_COUNT('user.name'),
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'user.name',
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
            accessors: [columnUserName],
            layerId: layerUserName,
            layerType: 'data',
            seriesType: 'area',
            xAccessor: columnTimestamp,
          },
        ],
        legend: { isVisible: true, position: 'right' },
        preferredSeriesType: 'area',
        tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
        valueLabels: 'hide',
        yLeftExtent: { mode: 'full' },
        yRightExtent: { mode: 'full' },
      },
    },
    title: '[User] Users - area',
    visualizationType: 'lnsXY',
    references: [
      {
        id: '{dataViewId}',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: '{dataViewId}',
        name: `indexpattern-datasource-layer-${layerUserName}`,
        type: 'index-pattern',
      },
    ],
  } as LensAttributes);
