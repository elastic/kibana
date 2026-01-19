/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { GetLensAttributes } from '../../../../../common/components/visualization_actions/types';

const layerId = uuidv4();
export const columnTimestampId = uuidv4();
export const columnResultId = uuidv4();
export const dataViewId = uuidv4();
export const columnUserId = uuidv4();

export const getLensAttributes: GetLensAttributes = ({ esql, stackByField, extraOptions = {} }) => {
  return {
    title: 'Events',
    description: '',
    visualizationType: 'lnsXY',
    state: {
      visualization: {
        legend: {
          isVisible: true,
          position: 'right',
          legendSize: 'xlarge',
          legendStats: ['total'],
          maxLines: 1,
          showSingleSeries: true,
          layout: 'list',
        },
        valueLabels: 'hide',
        fittingFunction: 'Linear',
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: true,
        },
        gridlinesVisibilitySettings: {
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
        preferredSeriesType: 'bar_stacked',
        layers: [
          {
            layerId,
            seriesType: 'bar_stacked',
            xAccessor: columnTimestampId,
            accessors: [columnResultId],
            splitAccessor: columnUserId,
            layerType: 'data',
            showGridlines: false,
          },
        ],
      },
      filters: [], // empty, because filters are applied directly to the lens.EmbeddableComponent
      query: {
        esql: '', // empty, because filters are applied directly to the lens.EmbeddableComponent
      },
      datasourceStates: {
        textBased: {
          layers: {
            [layerId]: {
              index: dataViewId,
              query: {
                esql: esql ?? '',
              },
              columns: [
                {
                  columnId: columnTimestampId,
                  fieldName: 'timestamp',
                  meta: {
                    type: 'date',
                  },
                },
                {
                  columnId: columnResultId,
                  fieldName: 'results',
                  meta: {
                    type: 'number',
                  },
                  inMetricDimension: true,
                },
                {
                  columnId: columnUserId,
                  fieldName: stackByField ?? '',
                  meta: {
                    type: 'string',
                    esType: 'keyword',
                  },
                },
              ],
              timeField: '@timestamp',
            },
          },
        },
      },
      internalReferences: [
        {
          type: 'index-pattern',
          id: dataViewId,
          name: `indexpattern-datasource-layer-${layerId}`,
        },
      ],
      adHocDataViews: {
        [dataViewId]: {
          id: dataViewId,
        },
      },
    },
    references: [],
  };
};
