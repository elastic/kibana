/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { FAIL_CHART_LABEL, SUCCESS_CHART_LABEL } from '../../translations';
import type { LensAttributes, GetLensAttributes } from '../../types';

const columnEventOutcomeFailure = `column-event-outcome-failure-id-${uuidv4()}`;
const columnEventOutcomeFailureTimestamp = `column-event-outcome-failure-timestamp-id-${uuidv4()}`;

const columnEventOutcomeSuccess = `column-event-outcome-success-id-${uuidv4()}`;
const columnEventOutcomeSuccessTimestamp = `column-event-outcome-success-timestamp-id-${uuidv4()}`;
const layoutEventOutcomeSuccess = `layout-event-outcome-success-id-${uuidv4()}`;
const layoutEventOutcomeFailure = `layout-event-outcome-failure-id-${uuidv4()}`;

export const getKpiUserAuthenticationsAreaLensAttributes: GetLensAttributes = ({ euiTheme }) =>
  ({
    title: '[Host] User authentications - area ',
    description: '',
    visualizationType: 'lnsXY',
    state: {
      visualization: {
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: true,
        },
        fittingFunction: 'None',
        gridlinesVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: true,
        },
        labelsOrientation: {
          x: 0,
          yLeft: 0,
          yRight: 0,
        },
        layers: [
          {
            accessors: [columnEventOutcomeSuccess],
            layerId: layoutEventOutcomeSuccess,
            layerType: 'data',
            seriesType: 'area',
            xAccessor: columnEventOutcomeSuccessTimestamp,
            yConfig: [
              {
                color: euiTheme.colors.vis.euiColorVis0,
                forAccessor: columnEventOutcomeSuccess,
              },
            ],
          },
          {
            accessors: [columnEventOutcomeFailure],
            layerId: layoutEventOutcomeFailure,
            layerType: 'data',
            seriesType: 'area',
            xAccessor: columnEventOutcomeFailureTimestamp,
            yConfig: [
              {
                color: euiTheme.colors.vis.euiColorVis4,
                forAccessor: columnEventOutcomeFailure,
              },
            ],
          },
        ],
        legend: {
          isVisible: false,
          position: 'right',
          showSingleSeries: false,
        },
        preferredSeriesType: 'area',
        tickLabelsVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: true,
        },
        valueLabels: 'hide',
        yLeftExtent: {
          mode: 'full',
        },
        yRightExtent: {
          mode: 'full',
        },
      },
      query: {
        language: 'kuery',
        query: '',
      },
      filters: [
        {
          $state: {
            store: 'appState',
          },
          meta: {
            alias: null,
            disabled: false,
            // @ts-expect-error upgrade typescript v4.9.5
            indexRefName: 'filter-index-pattern-0',
            key: 'query',
            negate: false,
            type: 'custom',
            value: '{"bool":{"filter":[{"term":{"event.category":"authentication"}}]}}',
          },
          query: {
            bool: {
              filter: [
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
            [layoutEventOutcomeFailure]: {
              columnOrder: [columnEventOutcomeFailureTimestamp, columnEventOutcomeFailure],
              columns: {
                [columnEventOutcomeFailure]: {
                  customLabel: true,
                  dataType: 'number',
                  filter: {
                    language: 'kuery',
                    query: 'event.outcome: "failure" ',
                  },
                  isBucketed: false,
                  label: FAIL_CHART_LABEL,
                  operationType: 'count',
                  scale: 'ratio',
                  sourceField: '___records___',
                },
                [columnEventOutcomeFailureTimestamp]: {
                  dataType: 'date',
                  isBucketed: true,
                  label: '@timestamp',
                  operationType: 'date_histogram',
                  params: {
                    interval: 'auto',
                  },
                  scale: 'interval',
                  sourceField: '@timestamp',
                },
              },
              incompleteColumns: {},
            },
            [layoutEventOutcomeSuccess]: {
              columnOrder: [columnEventOutcomeSuccessTimestamp, columnEventOutcomeSuccess],
              columns: {
                [columnEventOutcomeSuccess]: {
                  customLabel: true,
                  dataType: 'number',
                  filter: {
                    language: 'kuery',
                    query: 'event.outcome : "success" ',
                  },
                  isBucketed: false,
                  label: SUCCESS_CHART_LABEL,
                  operationType: 'count',
                  scale: 'ratio',
                  sourceField: '___records___',
                },
                [columnEventOutcomeSuccessTimestamp]: {
                  dataType: 'date',
                  isBucketed: true,
                  label: '@timestamp',
                  operationType: 'date_histogram',
                  params: {
                    interval: 'auto',
                  },
                  scale: 'interval',
                  sourceField: '@timestamp',
                },
              },
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
        name: `indexpattern-datasource-layer-${layoutEventOutcomeFailure}`,
      },
      {
        type: 'index-pattern',
        id: '{dataViewId}',
        name: `indexpattern-datasource-layer-${layoutEventOutcomeSuccess}`,
      },
    ],
  } as LensAttributes);
