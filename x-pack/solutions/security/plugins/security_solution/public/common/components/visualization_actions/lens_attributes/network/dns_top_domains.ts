/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { TOP_VALUE, UNIQUE_COUNT } from '../../translations';
import type { LensAttributes, GetLensAttributes } from '../../types';

const layerId = `layer-id-${uuidv4()}`;
const columnTopValue = `column-top-value-id-${uuidv4()}`;
const columnTimestamp = `column-timestamp-id-${uuidv4()}`;
const columnDNSQuestionName = `column-dns-question-name-id-${uuidv4()}`;

/* Exported from Kibana Saved Object */
export const getDnsTopDomainsLensAttributes: GetLensAttributes = ({
  stackByField = 'dns.question.registered_domain',
  extraOptions,
}) =>
  ({
    title: 'Top domains by dns.question.registered_domain',
    visualizationType: 'lnsXY',
    state: {
      visualization: {
        legend: {
          isVisible: true,
          position: 'right',
          legendSize: 'xlarge',
          legendStats: ['currentAndLastValue'],
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
          yRight: false,
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
        preferredSeriesType: 'bar_stacked',
        layers: [
          {
            layerId,
            accessors: [columnDNSQuestionName],
            position: 'top',
            seriesType: 'bar_stacked',
            showGridlines: false,
            layerType: 'data',
            xAccessor: columnTimestamp,
            splitAccessor: columnTopValue,
          },
        ],
      },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: extraOptions?.dnsIsPtrIncluded
        ? []
        : [
            // exclude PTR record
            {
              meta: {
                alias: null,
                negate: true,
                disabled: false,
                type: 'phrase',
                key: 'dns.question.type',
                params: {
                  query: 'PTR',
                },
                // @ts-expect-error upgrade typescript v4.9.5
                indexRefName: 'filter-index-pattern-0',
              },
              query: {
                match_phrase: {
                  'dns.question.type': 'PTR',
                },
              },
              $state: {
                store: 'appState',
              },
            },
          ],
      datasourceStates: {
        formBased: {
          layers: {
            [layerId]: {
              columns: {
                [columnTopValue]: {
                  label: TOP_VALUE(stackByField),
                  dataType: 'string',
                  operationType: 'terms',
                  scale: 'ordinal',
                  sourceField: stackByField,
                  isBucketed: true,
                  params: {
                    size: 10,
                    orderBy: {
                      type: 'column',
                      columnId: columnDNSQuestionName,
                    },
                    orderDirection: 'desc',
                    otherBucket: true,
                    missingBucket: false,
                    secondaryFields: [],
                    parentFormat: {
                      id: 'terms',
                    },
                    accuracyMode: true,
                  },
                },
                [columnTimestamp]: {
                  label: '@timestamp',
                  dataType: 'date',
                  operationType: 'date_histogram',
                  sourceField: '@timestamp',
                  isBucketed: true,
                  scale: 'interval',
                  params: {
                    interval: 'auto',
                    includeEmptyRows: true,
                  },
                },
                [columnDNSQuestionName]: {
                  label: UNIQUE_COUNT('dns.question.name'),
                  dataType: 'number',
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'dns.question.name',
                  isBucketed: false,
                  params: { emptyAsNull: true },
                },
              },
              columnOrder: [columnTopValue, columnTimestamp, columnDNSQuestionName],
              incompleteColumns: {},
            },
          },
        },
      },
      internalReferences: [],
      adHocDataViews: {},
    },
    references: [
      {
        type: 'index-pattern',
        id: '{dataViewId}',
        name: `indexpattern-datasource-layer-${layerId}`,
      },
    ],
  } as LensAttributes);
