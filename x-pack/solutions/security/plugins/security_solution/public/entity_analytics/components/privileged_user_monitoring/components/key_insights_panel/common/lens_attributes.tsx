/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { ESBoolQuery } from '../../../../../../../common/typed_json';

interface KeyInsightsPanelParams {
  title: string;
  label: string;
  esqlQuery: string;
  dataViewId: string;
  filterQuery: ESBoolQuery | undefined;
  trendEsqlQuery?: string;
  trendSourceField?: string; // Add optional field for trendline source
}

export const createKeyInsightsPanelLensAttributes = ({
  title,
  label,
  esqlQuery,
  dataViewId,
  filterQuery,
  trendEsqlQuery,
  trendSourceField,
}: KeyInsightsPanelParams): LensAttributes => {
  // Create stable IDs based on the content to prevent continuous re-renders
  const baseId = `${title}-${label}`.replace(/\s+/g, '-').toLowerCase();
  const layerIds = [`layer-id1-${baseId}`, `layer-id2-${baseId}`];
  const internalReferenceId = `internal-reference-id-${baseId}`;
  const columnIds = [`column-id1-${baseId}`, `column-id2-${baseId}`, `column-id3-${baseId}`];

  const visualization = {
    layerId: layerIds[0],
    layerType: 'data' as const,
    metricAccessor: columnIds[0],
    ...(trendEsqlQuery && {
      showTrendline: true,
      trendlineLayerId: layerIds[1],
      trendlineLayerType: 'metricTrendline' as const,
      trendlineTimeAccessor: columnIds[1],
      trendlineMetricAccessor: columnIds[2],
    }),
  };

  const textBasedLayers = {
    // Main metric layer using ESQL
    [layerIds[0]]: {
      columns: [
        {
          columnId: columnIds[0],
          fieldName: 'count',
          label,
          customLabel: true,
          params: {
            format: {
              id: 'number',
              params: {
                decimals: 0,
                compact: false,
              },
            },
          },
        },
      ],
      query: {
        esql: esqlQuery,
      },
    },
  };

  const formBasedLayers = {} as Record<string, unknown>;

  // Add trendline functionality if trendEsqlQuery is provided
  if (trendEsqlQuery) {
    // Add the trendline layer using formBased (similar to risk_score_summary)
    formBasedLayers[layerIds[1]] = {
      linkToLayers: [layerIds[0]],
      columns: {
        [columnIds[1]]: {
          label: 'Time',
          dataType: 'date',
          operationType: 'date_histogram',
          sourceField: '@timestamp',
          isBucketed: true,
          scale: 'interval',
          params: {
            interval: 'auto',
            includeEmptyRows: true,
            dropPartials: false,
          },
        },
        [columnIds[2]]: {
          label: `${label} Trend`,
          dataType: 'number',
          operationType: trendSourceField ? 'unique_count' : 'count',
          isBucketed: false,
          scale: 'ratio',
          sourceField: trendSourceField || '___records___',
          params: {
            format: {
              id: 'number',
              params: {
                decimals: 0,
                compact: false,
              },
            },
          },
          customLabel: true,
        },
      },
      columnOrder: [columnIds[1], columnIds[2]],
      sampling: 1,
      ignoreGlobalFilters: false,
      incompleteColumns: {},
    };
  }

  return {
    title,
    description: '',
    visualizationType: 'lnsMetric',
    state: {
      visualization,
      query: {
        query: esqlQuery,
        language: 'esql',
      },
      filters: [{ query: filterQuery, meta: {} }],
      datasourceStates: {
        textBased: {
          layers: textBasedLayers,
        },
        ...(trendEsqlQuery
          ? {
              formBased: {
                layers: formBasedLayers,
              },
            }
          : {}),
      },
      internalReferences: trendEsqlQuery
        ? [
            {
              type: 'index-pattern',
              id: internalReferenceId,
              name: `indexpattern-datasource-layer-${layerIds[1]}`,
            },
          ]
        : [],
      adHocDataViews: {
        [dataViewId]: {
          id: dataViewId,
          title: `logs-*`,
          timeFieldName: '@timestamp',
          sourceFilters: [],
          fieldFormats: {},
          runtimeFieldMap: {},
          fieldAttrs: {},
          allowNoIndex: false,
          name: `logs-*`,
        },
        ...(trendEsqlQuery
          ? {
              [internalReferenceId]: {
                id: internalReferenceId,
                title: `logs-*`,
                timeFieldName: '@timestamp',
                sourceFilters: [],
                fieldFormats: {},
                runtimeFieldMap: {},
                fieldAttrs: {},
                allowNoIndex: false,
                name: `logs-*`,
              },
            }
          : {}),
      },
    },
    references: [],
  } as LensAttributes;
};
