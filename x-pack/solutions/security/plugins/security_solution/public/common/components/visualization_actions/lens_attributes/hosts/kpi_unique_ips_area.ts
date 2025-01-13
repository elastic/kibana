/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DESTINATION_CHART_LABEL, SOURCE_CHART_LABEL } from '../../translations';
import type { GetLensAttributes, LensAttributes } from '../../types';
import { getDestinationIpColor, getSourceIpColor } from '../common/utils/unique_ips_palette';

const columnSourceTimestamp = 'a0cb6400-f708-46c3-ad96-24788f12dae4';
const columnSourceUniqueIp = 'd9a6eb6b-8b78-439e-98e7-a718f8ffbebe';

const columnDestinationIp = 'e7052671-fb9e-481f-8df3-7724c98cfc6f';
const columnDestinationTimestamp = '95e74e6-99dd-4b11-8faf-439b4d959df9';

const layerDestinationIp = 'ca05ecdb-0fa4-49a8-9305-b23d91012a46';
const layerSourceIp = '8be0156b-d423-4a39-adf1-f54d4c9f2e69';

export const getKpiUniqueIpsAreaLensAttributes: GetLensAttributes = ({ euiTheme }) => {
  return {
    description: '',
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            [layerSourceIp]: {
              columnOrder: [columnSourceTimestamp, columnSourceUniqueIp],
              columns: {
                [columnSourceTimestamp]: {
                  dataType: 'date',
                  isBucketed: true,
                  label: '@timestamp',
                  operationType: 'date_histogram',
                  params: { interval: 'auto' },
                  scale: 'interval',
                  sourceField: '@timestamp',
                },
                [columnSourceUniqueIp]: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: SOURCE_CHART_LABEL,
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'source.ip',
                },
              },
              incompleteColumns: {},
            },
            [layerDestinationIp]: {
              columnOrder: [columnDestinationTimestamp, columnDestinationIp],
              columns: {
                [columnDestinationIp]: {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: DESTINATION_CHART_LABEL,
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'destination.ip',
                },
                [columnDestinationTimestamp]: {
                  dataType: 'date',
                  isBucketed: true,
                  label: '@timestamp',
                  operationType: 'date_histogram',
                  params: { interval: 'auto' },
                  scale: 'interval',
                  sourceField: '@timestamp',
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
        axisTitlesVisibilitySettings: { x: false, yLeft: false, yRight: true },
        fittingFunction: 'None',
        gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
        labelsOrientation: { x: 0, yLeft: 0, yRight: 0 },
        layers: [
          {
            accessors: [columnSourceUniqueIp],
            layerId: layerSourceIp,
            layerType: 'data',
            seriesType: 'area',
            xAccessor: columnSourceTimestamp,
            yConfig: [{ color: getSourceIpColor(euiTheme), forAccessor: columnSourceUniqueIp }],
          },
          {
            accessors: [columnDestinationIp],
            layerId: layerDestinationIp,
            layerType: 'data',
            seriesType: 'area',
            xAccessor: columnDestinationTimestamp,
            yConfig: [{ color: getDestinationIpColor(euiTheme), forAccessor: columnDestinationIp }],
          },
        ],
        legend: { isVisible: false, position: 'right', showSingleSeries: false },
        preferredSeriesType: 'area',
        tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
        valueLabels: 'hide',
        yLeftExtent: { mode: 'full' },
        yRightExtent: { mode: 'full' },
      },
    },
    title: '[Host] Unique IPs - area',
    visualizationType: 'lnsXY',
    references: [
      {
        id: '{dataViewId}',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: '{dataViewId}',
        name: `indexpattern-datasource-layer-${layerSourceIp}`,
        type: 'index-pattern',
      },
      {
        id: '{dataViewId}',
        name: `indexpattern-datasource-layer-${layerDestinationIp}`,
        type: 'index-pattern',
      },
    ],
    type: 'lens',
    updated_at: '2022-02-09T17:44:03.359Z',
    version: 'WzI5MTI5OSwzXQ==',
  } as LensAttributes;
};
