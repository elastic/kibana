/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getQueryColumnsFromESQLQuery } from '@kbn/esql-utils';
import type { ParsedPanel } from '../../../../../../../../../../common/siem_migrations/parsers/types';

interface ColumnInfo {
  columnId: string;
  fieldName: string;
  meta: {
    type: string;
  };
  inMetricDimension?: boolean;
}

interface PanelJSON {
  title?: string;
  gridData?: {
    x: number;
    y: number;
    w: number;
    h: number;
    i: string;
  };
  panelIndex?: string;
  embeddableConfig?: {
    attributes?: {
      state?: {
        visualization?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
        datasourceStates?: {
          textBased?: {
            layers?: {
              [key: string]: {
                query?: { esql: string };
                columns?: ColumnInfo[];
              };
            };
          };
        };
        query?: { esql: string };
      };
    };
  };
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// Process the panel and return the modified panelJSON
export const processPanel = (panel: object, query: string, parsedPanel: ParsedPanel): object => {
  const panelJSON = structuredClone(panel) as PanelJSON;

  const { columnList, columns } = parseColumns(query);
  const vizType = parsedPanel.viz_type;

  // Set panel basic properties
  panelJSON.title = parsedPanel.title;

  // Set position from parsed_panel.position
  if (parsedPanel.position) {
    panelJSON.gridData = {
      x: parsedPanel.position.x,
      y: parsedPanel.position.y,
      w: parsedPanel.position.w,
      h: parsedPanel.position.h,
      i: parsedPanel.id,
    };
    panelJSON.panelIndex = parsedPanel.id;
  }

  // Configure visualization-specific properties
  configureVixTypeProperties(panelJSON, vizType, query, columns);
  configureStackedProperties(panelJSON, vizType, columns);
  configureDatasourceProperties(panelJSON, query, columnList);

  return panelJSON;
};

// Parse columns from ESQL query and build column array for panel JSON
function parseColumns(query: string): { columnList: ColumnInfo[]; columns: string[] } {
  const columnNames = getQueryColumnsFromESQLQuery(query);
  const columnList: ColumnInfo[] = [];
  const columns: string[] = [];

  let metricIndex = 0;

  columnNames.forEach((columnName) => {
    // For now, assume numeric columns are metrics (first columns) and string columns are dimensions. This is a simplification.
    // TODO: Determine column types of the ESQL query using the LLM
    const isNumeric = metricIndex === 0; // First column is "typically" the metric

    if (isNumeric) {
      columnList.splice(metricIndex, 0, {
        columnId: columnName,
        fieldName: columnName,
        meta: { type: 'number' },
        inMetricDimension: true,
      });
      columns.splice(metricIndex, 0, columnName);
      metricIndex++;
    } else {
      columnList.push({
        columnId: columnName,
        fieldName: columnName,
        meta: { type: 'string' },
      });
      columns.push(columnName);
    }
  });

  // Ensure at least one column has inMetricDimension if no numeric columns
  if (metricIndex === 0 && columnList.length > 0) {
    columnList[0].inMetricDimension = true;
  }

  return { columnList, columns };
}

// Configure chart-specific properties
function configureVixTypeProperties(
  panelJSON: PanelJSON,
  vizType: string,
  query: string,
  columns: string[]
): void {
  const chartTypes = [
    'bar',
    'bar_vertical',
    'bar_horizontal',
    'bar_vertical_stacked',
    'bar_horizontal_stacked',
    'area',
    'area_stacked',
    'line',
    'heatmap',
  ];

  if (chartTypes.includes(vizType)) {
    if (panelJSON.embeddableConfig?.attributes?.state?.visualization?.layers?.[0]) {
      panelJSON.embeddableConfig.attributes.state.visualization.layers[0].xAccessor =
        columns[columns.length - 1];
      panelJSON.embeddableConfig.attributes.state.visualization.layers[0].accessors = [columns[0]];
    }
  }

  if (vizType === 'pie') {
    if (panelJSON.embeddableConfig?.attributes?.state?.visualization?.layers?.[0]) {
      panelJSON.embeddableConfig.attributes.state.visualization.layers[0].primaryGroups = [
        columns[columns.length - 1],
      ];
      panelJSON.embeddableConfig.attributes.state.visualization.layers[0].metrics = [[columns[0]]];
    }
  }

  if (vizType === 'table') {
    if (panelJSON.embeddableConfig?.attributes?.state?.visualization) {
      panelJSON.embeddableConfig.attributes.state.visualization.columns = columns.map((column) => ({
        columnId: column,
      }));
    }
  }

  if (vizType === 'heatmap') {
    configureHeatmapProperties(panelJSON, columns);
  }

  if (vizType === 'treemap') {
    configureTreemapProperties(panelJSON, columns);
  }

  // Handle metric visualization
  if (vizType === 'metric') {
    if (panelJSON.embeddableConfig?.attributes?.state?.visualization) {
      panelJSON.embeddableConfig.attributes.state.visualization.metricAccessor = columns[0];
    }
  }

  // Handle gauge visualization
  if (vizType === 'gauge') {
    configureGaugeProperties(panelJSON, query, columns);
  }
}

// Configure heatmap specific properties
function configureHeatmapProperties(panelJSON: PanelJSON, columns: string[]): void {
  if (panelJSON.embeddableConfig?.attributes?.state?.visualization) {
    panelJSON.embeddableConfig.attributes.state.visualization.valueAccessor = columns[0];
    panelJSON.embeddableConfig.attributes.state.visualization.xAccessor =
      columns[columns.length - 1];
    if (columns.length > 1) {
      panelJSON.embeddableConfig.attributes.state.visualization.yAccessor =
        columns[columns.length - 2];
    }
  }
}

// Configure treemap specific properties
function configureTreemapProperties(panelJSON: PanelJSON, columns: string[]): void {
  if (panelJSON.embeddableConfig?.attributes?.state?.visualization?.layers?.[0]) {
    if (panelJSON.embeddableConfig.attributes.state.visualization.layers[0].metrics) {
      panelJSON.embeddableConfig.attributes.state.visualization.layers[0].metrics.push(columns[0]);
    }
    if (panelJSON.embeddableConfig.attributes.state.visualization.layers[0].primaryGroups) {
      for (let i = 1; i < columns.length - 1; i++) {
        panelJSON.embeddableConfig.attributes.state.visualization.layers[0].primaryGroups.push(
          columns[i]
        );
      }
    }
  }
}

// Configure gauge visualization
function configureGaugeProperties(panelJSON: PanelJSON, query: string, columns: string[]): void {
  const gaugeLayerId = '3b1b0102-bb45-40f5-9ef2-419d2eaaa56c';
  if (
    panelJSON.embeddableConfig?.attributes?.state?.datasourceStates?.textBased?.layers?.[
      gaugeLayerId
    ]
  ) {
    const gaugeLayer =
      panelJSON.embeddableConfig.attributes.state.datasourceStates.textBased.layers[gaugeLayerId];
    if (gaugeLayer.columns?.[0]) {
      gaugeLayer.columns[0].fieldName = columns[0];
      gaugeLayer.columns[0].columnId = columns[0];
    }
    gaugeLayer.query = { esql: query };
  }
  if (panelJSON.embeddableConfig?.attributes?.state?.visualization) {
    panelJSON.embeddableConfig.attributes.state.visualization.metricAccessor = columns[0];
  }
}

// Configure stacked chart properties
function configureStackedProperties(
  panelJSON: PanelJSON,
  vizType: string,
  columns: string[]
): void {
  if ((vizType.includes('stacked') || vizType.includes('line')) && columns.length > 2) {
    if (panelJSON.embeddableConfig?.attributes?.state?.visualization?.layers?.[0]) {
      panelJSON.embeddableConfig.attributes.state.visualization.layers[0].splitAccessor =
        columns[columns.length - 2];
    }
  }

  if (vizType.includes('stacked') && columns.length === 2) {
    if (panelJSON.embeddableConfig?.attributes?.state?.visualization?.layers?.[0]) {
      panelJSON.embeddableConfig.attributes.state.visualization.layers[0].splitAccessor =
        columns[columns.length - 1];
    }
  }
}

// Configure datasource properties
function configureDatasourceProperties(
  panelJSON: PanelJSON,
  query: string,
  columnList: ColumnInfo[]
): void {
  if (panelJSON.embeddableConfig?.attributes?.state?.datasourceStates?.textBased?.layers) {
    const layerId = '3a5310ab-2832-41db-bdbe-1b6939dd5651';
    if (panelJSON.embeddableConfig.attributes.state.datasourceStates.textBased.layers[layerId]) {
      panelJSON.embeddableConfig.attributes.state.datasourceStates.textBased.layers[layerId].query =
        { esql: query };
      panelJSON.embeddableConfig.attributes.state.datasourceStates.textBased.layers[
        layerId
      ].columns = columnList;
    }
  }

  if (panelJSON.embeddableConfig?.attributes?.state?.query) {
    panelJSON.embeddableConfig.attributes.state.query.esql = query;
  }
}
