/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import type { LensAttributes, GetLensAttributes } from '../../types';
import { FAIL_CHART_LABEL, SUCCESS_CHART_LABEL } from '../../translations';

const columnEventOutcomeFailure = `column-event-outcome-failure-id-${uuidv4()}`;
const columnEventOutcomeFailureFilter = `column-event-outcome-failure-filter-id-${uuidv4()}`;

const columnEventOutcomeSuccess = `column-event-outcome-success-id-${uuidv4()}`;
const columnEventOutcomeSuccessFilter = `column-event-outcome-success-filter-id-${uuidv4()}`;

const layerEventOutcomeFailure = `layer-event-outcome-failure-id-${uuidv4()}`;
const layerEventOutcomeSuccess = `layer-event-outcome-success-id-${uuidv4()}`;

export const getKpiUserAuthenticationsBarLensAttributes: GetLensAttributes = ({ euiTheme }) =>
  ({
    title: '[Host] User authentications - bar ',
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
            layerId: layerEventOutcomeSuccess,
            layerType: 'data',
            seriesType: 'bar_horizontal_stacked',
            xAccessor: columnEventOutcomeSuccessFilter,
            yConfig: [
              {
                color: euiTheme.colors.vis.euiColorVis0,
                forAccessor: columnEventOutcomeSuccess,
              },
            ],
          },
          {
            accessors: [columnEventOutcomeFailure],
            layerId: layerEventOutcomeFailure,
            layerType: 'data',
            seriesType: 'bar_horizontal_stacked',
            xAccessor: columnEventOutcomeFailureFilter,
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
        preferredSeriesType: 'bar_horizontal_stacked',
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
            [layerEventOutcomeSuccess]: {
              columnOrder: [columnEventOutcomeSuccessFilter, columnEventOutcomeSuccess],
              columns: {
                [columnEventOutcomeSuccessFilter]: {
                  dataType: 'string',
                  isBucketed: true,
                  label: 'Filters',
                  operationType: 'filters',
                  params: {
                    filters: [
                      {
                        input: {
                          language: 'kuery',
                          query: 'event.outcome : "success" ',
                        },
                        label: SUCCESS_CHART_LABEL,
                      },
                    ],
                  },
                  scale: 'ordinal',
                },
                [columnEventOutcomeSuccess]: {
                  dataType: 'number',
                  isBucketed: false,
                  label: SUCCESS_CHART_LABEL,
                  operationType: 'count',
                  scale: 'ratio',
                  sourceField: '___records___',
                },
              },
              incompleteColumns: {},
            },
            [layerEventOutcomeFailure]: {
              columnOrder: [columnEventOutcomeFailureFilter, columnEventOutcomeFailure],
              columns: {
                [columnEventOutcomeFailure]: {
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Fail',
                  operationType: 'count',
                  scale: 'ratio',
                  sourceField: '___records___',
                },
                [columnEventOutcomeFailureFilter]: {
                  customLabel: true,
                  dataType: 'string',
                  isBucketed: true,
                  label: FAIL_CHART_LABEL,
                  operationType: 'filters',
                  params: {
                    filters: [
                      {
                        input: {
                          language: 'kuery',
                          query: 'event.outcome:"failure" ',
                        },
                        label: FAIL_CHART_LABEL,
                      },
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
        name: `indexpattern-datasource-layer-${layerEventOutcomeSuccess}`,
      },
      {
        type: 'index-pattern',
        id: '{dataViewId}',
        name: `indexpattern-datasource-layer-${layerEventOutcomeFailure}`,
      },
    ],
  } as LensAttributes);
