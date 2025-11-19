/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { AggregateQuery } from '@kbn/es-query';

/**
 * Column definition for ESQL panels
 */
interface ESQLColumn {
  columnId: string;
  fieldName: string;
  label?: string;
  customLabel?: boolean;
  meta: {
    type: string;
    esType?: string;
    sourceParams?: {
      indexPattern: string;
      sourceField: string;
    };
    params?: {
      id: string;
    };
  };
  inMetricDimension?: boolean;
}

/**
 * Configuration for creating an ESQL dashboard panel
 */
export interface ESQLPanelConfig {
  esqlQuery: string;
  title: string;
  description: string;
  indexPattern: string;
  gridPosition: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  visualizationType: 'lnsXY' | 'lnsDatatable' | 'lnsMetric';
  columns: ESQLColumn[];
  visualizationConfig: {
    // For lnsXY (line/bar charts)
    xAccessor?: string;
    accessors?: string[];
    seriesType?: 'line' | 'bar' | 'bar_stacked' | 'area';
    // For lnsDatatable
    tableColumns?: Array<{
      columnId: string;
      isTransposed?: boolean;
      width?: number;
    }>;
    // For lnsMetric
    metricAccessor?: string;
  };
  timeField?: string;
  includeTimeFieldInLayer?: boolean;
}

/**
 * Utility function to create an ESQL-based Lens dashboard panel
 */
export function createESQLPanel(config: ESQLPanelConfig): DashboardPanel {
  const layerId = uuidv4();
  const adHocDataViewId = uuidv4();
  const timeField = config.timeField ?? '@timestamp';
  const includeTimeField = config.includeTimeFieldInLayer !== false;
  const isMetric = config.visualizationType === 'lnsMetric';
  const esqlQuery: AggregateQuery = { esql: config.esqlQuery };

  // Build visualization config based on type using a map for cleaner code
  const visualization = buildVisualizationConfig(
    config.visualizationType,
    config.visualizationConfig,
    layerId
  );

  // Build layer config with conditional properties
  const layerConfig = {
    index: adHocDataViewId,
    query: esqlQuery,
    columns: config.columns,
    ...(includeTimeField && { timeField }),
  };

  // Build index pattern ref with conditional properties
  const indexPatternRef = {
    id: adHocDataViewId,
    title: config.indexPattern,
    ...(includeTimeField && { timeField }),
  };

  // Build ad hoc data view with conditional properties
  const adHocDataView: DataViewSpec = {
    id: adHocDataViewId,
    title: config.indexPattern,
    name: config.indexPattern,
    ...(isMetric
      ? {
          sourceFilters: [],
          fieldFormats: {},
          runtimeFieldMap: {},
          allowNoIndex: false,
          allowHidden: false,
        }
      : { timeFieldName: timeField }),
  };

  // Build common lens attributes structure
  const lensAttributes = {
    title: config.title,
    description: config.description,
    visualizationType: config.visualizationType,
    references: [],
    state: {
      query: esqlQuery,
      filters: [],
      datasourceStates: {
        textBased: {
          layers: {
            [layerId]: layerConfig,
          },
          indexPatternRefs: [indexPatternRef],
        },
      },
      visualization,
      adHocDataViews: {
        [adHocDataViewId]: adHocDataView,
      },
    },
    ...(isMetric && { version: 1, type: 'lens' }),
  };

  // Return panel with conditional config wrapper for metrics
  return {
    type: 'lens',
    grid: config.gridPosition,
    config: isMetric
      ? {
          enhancements: {
            dynamicActions: {
              events: [],
            },
          },
          syncColors: false,
          syncCursor: true,
          syncTooltips: false,
          filters: [],
          query: esqlQuery,
          attributes: lensAttributes,
        }
      : { attributes: lensAttributes },
  };
}

/**
 * Builds the visualization configuration based on the visualization type
 */
function buildVisualizationConfig(
  visualizationType: ESQLPanelConfig['visualizationType'],
  visualizationConfig: ESQLPanelConfig['visualizationConfig'],
  layerId: string
): Record<string, unknown> {
  const visualizationBuilders = {
    lnsXY: () => ({
      legend: {
        isVisible: true,
        position: 'right',
      },
      valueLabels: 'hide',
      fittingFunction: 'Linear',
      axisTitlesVisibilitySettings: {
        x: true,
        yLeft: true,
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
      preferredSeriesType: visualizationConfig.seriesType ?? 'line',
      layers: [
        {
          layerId,
          seriesType: visualizationConfig.seriesType ?? 'line',
          xAccessor: visualizationConfig.xAccessor,
          accessors: visualizationConfig.accessors,
          layerType: 'data',
        },
      ],
    }),
    lnsDatatable: () => ({
      layerId,
      layerType: 'data',
      columns: visualizationConfig.tableColumns ?? [],
    }),
    lnsMetric: () => ({
      layerId,
      layerType: 'data',
      metricAccessor: visualizationConfig.metricAccessor,
    }),
  } as const;

  const builder = visualizationBuilders[visualizationType];
  return builder ? builder() : {};
}
