/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import {
  AUTHENTICATION_FAILURE_CHART_LABEL,
  AUTHENTICATION_SUCCESS_CHART_LABEL,
} from '../../translations';
import type { LensAttributes, GetLensAttributes } from '../../types';

const layerAuthenticationSuccess = `layer-authentication-success-id-${uuidv4()}`;
const layerAuthenticationFailure = `layer-authentication-failure-id-${uuidv4()}`;
const columnTimestampFailure = `column-timestamp-failure-id-${uuidv4()}`;
const columnEventOutcomeFailure = `column-event-outcome-failure-id-${uuidv4()}`;
const columnTimestampSuccess = `column-timestamp-success-id-${uuidv4()}`;
const columnEventOutcomeSuccess = `column-event-outcome-success-id-${uuidv4()}`;

export const getAuthenticationLensAttributes: GetLensAttributes = ({ euiTheme }) =>
  ({
    title: 'Authentication',
    description: '',
    visualizationType: 'lnsXY',
    state: {
      visualization: {
        title: 'Empty XY chart',
        legend: {
          isVisible: true,
          position: 'right',
          legendSize: 'xlarge',
        },
        valueLabels: 'hide',
        preferredSeriesType: 'bar_stacked',
        layers: [
          {
            layerId: layerAuthenticationSuccess,
            accessors: [columnEventOutcomeSuccess],
            position: 'top',
            seriesType: 'bar_stacked',
            showGridlines: false,
            layerType: 'data',
            xAccessor: columnTimestampSuccess,
            yConfig: [
              {
                forAccessor: columnEventOutcomeSuccess,
                color: euiTheme.colors.vis.euiColorVis0,
              },
            ],
          },
          {
            layerId: layerAuthenticationFailure,
            seriesType: 'bar_stacked',
            accessors: [columnEventOutcomeFailure],
            layerType: 'data',
            xAccessor: columnTimestampFailure,
            yConfig: [
              {
                forAccessor: columnEventOutcomeFailure,
                color: euiTheme.colors.vis.euiColorVis7,
              },
            ],
          },
        ],
        yRightExtent: {
          mode: 'full',
        },
        yLeftExtent: {
          mode: 'full',
        },
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: true,
        },
      },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [
        {
          meta: {
            index: '6f4dbdc7-35b6-4e20-ac53-1272167e3919',
            type: 'custom',
            disabled: false,
            negate: false,
            alias: null,
            key: 'query',
            value: '{"bool":{"must":[{"term":{"event.category":"authentication"}}]}}',
          },
          $state: {
            store: 'appState',
          },
          query: {
            bool: {
              must: [
                {
                  term: {
                    'event.category': 'authentication',
                  },
                },
              ],
            },
          },
        },
      ],
      datasourceStates: {
        formBased: {
          layers: {
            [layerAuthenticationSuccess]: {
              columns: {
                [columnTimestampSuccess]: {
                  label: '@timestamp',
                  dataType: 'date',
                  operationType: 'date_histogram',
                  sourceField: '@timestamp',
                  isBucketed: true,
                  scale: 'interval',
                  params: {
                    interval: 'auto',
                  },
                },
                [columnEventOutcomeSuccess]: {
                  label: AUTHENTICATION_SUCCESS_CHART_LABEL,
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: '___records___',
                  filter: {
                    query: 'event.outcome : "success"',
                    language: 'kuery',
                  },
                  customLabel: true,
                },
              },
              columnOrder: [columnTimestampSuccess, columnEventOutcomeSuccess],
              incompleteColumns: {},
            },
            [layerAuthenticationFailure]: {
              columns: {
                [columnTimestampFailure]: {
                  label: '@timestamp',
                  dataType: 'date',
                  operationType: 'date_histogram',
                  sourceField: '@timestamp',
                  isBucketed: true,
                  scale: 'interval',
                  params: {
                    interval: 'auto',
                  },
                },
                [columnEventOutcomeFailure]: {
                  label: AUTHENTICATION_FAILURE_CHART_LABEL,
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: '___records___',
                  filter: {
                    query: 'event.outcome : "failure"',
                    language: 'kuery',
                  },
                  customLabel: true,
                },
              },
              columnOrder: [columnTimestampFailure, columnEventOutcomeFailure],
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
        name: `indexpattern-datasource-layer-${layerAuthenticationSuccess}`,
      },
      {
        type: 'index-pattern',
        id: '{dataViewId}',
        name: `indexpattern-datasource-layer-${layerAuthenticationFailure}`,
      },
      {
        type: 'index-pattern',
        name: '6f4dbdc7-35b6-4e20-ac53-1272167e3919',
        id: '{dataViewId}',
      },
    ],
  } as LensAttributes);
