/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetLensAttributes, LensAttributes } from '../../types';
import { SOURCE_CHART_LABEL, DESTINATION_CHART_LABEL, UNIQUE_COUNT } from '../../translations';
import { getDestinationIpColor, getSourceIpColor } from '../common/utils/unique_ips_palette';
const columnSourceIp = '32f66676-f4e1-48fd-b7f8-d4de38318601';
const columnSourceFilter = 'f8bfa719-5c1c-4bf2-896e-c318d77fc08e';

const columnDestinationIp = 'b7e59b08-96e6-40d1-84fd-e97b977d1c47';
const columnDestinationFilter = 'c72aad6a-fc9c-43dc-9194-e13ca3ee8aff';

const layerSourceIp = '8be0156b-d423-4a39-adf1-f54d4c9f2e69';
const layerDestinationIp = 'ec84ba70-2adb-4647-8ef0-8ad91a0e6d4e';

export const getKpiUniqueIpsBarLensAttributes: GetLensAttributes = ({ euiTheme }) => {
  return {
    description: '',
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            [layerSourceIp]: {
              columnOrder: [columnSourceFilter, columnSourceIp],
              columns: {
                [columnSourceIp]: {
                  dataType: 'number',
                  isBucketed: false,
                  label: UNIQUE_COUNT('source.ip'),
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'source.ip',
                },
                [columnSourceFilter]: {
                  dataType: 'string',
                  isBucketed: true,
                  label: 'Filters',
                  operationType: 'filters',
                  params: {
                    filters: [
                      {
                        input: { language: 'kuery', query: 'source.ip: *' },
                        label: SOURCE_CHART_LABEL,
                      },
                    ],
                  },
                  scale: 'ordinal',
                },
              },
              incompleteColumns: {},
            },
            [layerDestinationIp]: {
              columnOrder: [columnDestinationFilter, columnDestinationIp],
              columns: {
                [columnDestinationIp]: {
                  dataType: 'number',
                  isBucketed: false,
                  label: UNIQUE_COUNT('destination.ip'),
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'destination.ip',
                },
                [columnDestinationFilter]: {
                  customLabel: true,
                  dataType: 'string',
                  isBucketed: true,
                  label: DESTINATION_CHART_LABEL,
                  operationType: 'filters',
                  params: {
                    filters: [
                      { input: { language: 'kuery', query: 'destination.ip: *' }, label: 'Dest.' },
                    ],
                  },
                  scale: 'ordinal',
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
            accessors: [columnSourceIp],
            layerId: layerSourceIp,
            layerType: 'data',
            seriesType: 'bar_horizontal_stacked',
            xAccessor: columnSourceFilter,
            yConfig: [{ color: getSourceIpColor(euiTheme), forAccessor: columnSourceIp }],
          },
          {
            accessors: [columnDestinationIp],
            layerId: layerDestinationIp,
            layerType: 'data',
            seriesType: 'bar_horizontal_stacked',
            xAccessor: columnDestinationFilter,
            yConfig: [{ color: getDestinationIpColor(euiTheme), forAccessor: columnDestinationIp }],
          },
        ],
        legend: { isVisible: false, position: 'right', showSingleSeries: false },
        preferredSeriesType: 'bar_horizontal_stacked',
        tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
        valueLabels: 'hide',
        yLeftExtent: { mode: 'full' },
        yRightExtent: { mode: 'full' },
      },
    },
    title: '[Host] Unique IPs - bar chart',
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
  } as LensAttributes;
};
