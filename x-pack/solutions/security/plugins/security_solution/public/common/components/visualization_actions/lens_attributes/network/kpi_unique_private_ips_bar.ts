/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { SOURCE_CHART_LABEL, DESTINATION_CHART_LABEL, UNIQUE_COUNT } from '../../translations';
import type { LensAttributes, GetLensAttributes } from '../../types';
import { getDestinationIpColor, getSourceIpColor } from '../common/utils/unique_ips_palette';

const columnSourceIp = `column-source-ip-id-${uuidv4()}`;
const columnSourceIpFilter = `column-source-ip-filter-id-${uuidv4()}`;

const columnDestinationIp = `column-destination-ip-id-${uuidv4()}`;
const columnDestinationIpFilter = `column-destination-ip-filter-id-${uuidv4()}`;

const layerSourceIp = `layer-source-ip-id-${uuidv4()}`;
const layerDestinationIp = `layer-destination-ip-id-${uuidv4()}`;

export const getKpiUniquePrivateIpsBarLensAttributes: GetLensAttributes = ({ euiTheme }) => {
  return {
    title: '[Network] Unique private IPs - bar chart',
    description: '',
    visualizationType: 'lnsXY',
    state: {
      visualization: {
        legend: {
          isVisible: false,
          position: 'right',
          showSingleSeries: false,
        },
        valueLabels: 'hide',
        fittingFunction: 'None',
        yLeftExtent: {
          mode: 'full',
        },
        yRightExtent: {
          mode: 'full',
        },
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: true,
        },
        tickLabelsVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: true,
        },
        labelsOrientation: {
          x: 0,
          yLeft: 0,
          yRight: 0,
        },
        gridlinesVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: true,
        },
        preferredSeriesType: 'bar_horizontal_stacked',
        layers: [
          {
            layerId: layerSourceIp,
            accessors: [columnSourceIp],
            position: 'top',
            seriesType: 'bar_horizontal_stacked',
            showGridlines: false,
            layerType: 'data',
            yConfig: [
              {
                forAccessor: columnSourceIp,
                color: getSourceIpColor(euiTheme),
              },
            ],
            xAccessor: columnSourceIpFilter,
          },
          {
            layerId: layerDestinationIp,
            seriesType: 'bar_horizontal_stacked',
            accessors: [columnDestinationIp],
            layerType: 'data',
            yConfig: [
              {
                forAccessor: columnDestinationIp,
                color: getDestinationIpColor(euiTheme),
              },
            ],
            xAccessor: columnDestinationIpFilter,
          },
        ],
      },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [],
      datasourceStates: {
        formBased: {
          layers: {
            [layerSourceIp]: {
              columns: {
                [columnSourceIp]: {
                  label: UNIQUE_COUNT('source.ip'),
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'source.ip',
                  filter: {
                    query:
                      'source.ip: "10.0.0.0/8" or source.ip: "192.168.0.0/16" or source.ip: "172.16.0.0/12" or source.ip: "fd00::/8"',
                    language: 'kuery',
                  },
                },
                [columnSourceIpFilter]: {
                  label: 'Filters',
                  dataType: 'string',
                  operationType: 'filters',
                  scale: 'ordinal',
                  isBucketed: true,
                  params: {
                    filters: [
                      {
                        input: { language: 'kuery', query: 'source.ip: *' },
                        label: SOURCE_CHART_LABEL,
                      },
                    ],
                  },
                },
              },
              columnOrder: [columnSourceIpFilter, columnSourceIp],
              incompleteColumns: {},
            },
            [layerDestinationIp]: {
              columns: {
                [columnDestinationIp]: {
                  label: UNIQUE_COUNT('destination.ip'),
                  dataType: 'number',
                  isBucketed: false,
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'destination.ip',
                  filter: {
                    query:
                      '"destination.ip": "10.0.0.0/8" or "destination.ip": "192.168.0.0/16" or "destination.ip": "172.16.0.0/12" or "destination.ip": "fd00::/8"',
                    language: 'kuery',
                  },
                },
                [columnDestinationIpFilter]: {
                  label: 'Filters',
                  dataType: 'string',
                  operationType: 'filters',
                  scale: 'ordinal',
                  isBucketed: true,
                  params: {
                    filters: [
                      {
                        input: { language: 'kuery', query: 'destination.ip: *' },
                        label: DESTINATION_CHART_LABEL,
                      },
                    ],
                  },
                },
              },
              columnOrder: [columnDestinationIpFilter, columnDestinationIp],
              incompleteColumns: {},
            },
          },
        },
      },
    },
    references: [
      {
        type: 'index-pattern',
        id: '{dataViewId}',
        name: 'indexpattern-datasource-current-indexpattern',
      },
      {
        type: 'index-pattern',
        id: '{dataViewId}',
        name: `indexpattern-datasource-layer-${layerSourceIp}`,
      },
      {
        type: 'index-pattern',
        id: '{dataViewId}',
        name: `indexpattern-datasource-layer-${layerDestinationIp}`,
      },
    ],
  } as LensAttributes;
};
