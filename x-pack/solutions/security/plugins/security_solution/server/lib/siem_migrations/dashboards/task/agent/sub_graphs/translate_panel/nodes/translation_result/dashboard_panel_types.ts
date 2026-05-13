/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SavedDashboardGridData {
  x: number;
  y: number;
  w: number;
  h: number;
  i: string;
  sectionId?: string;
}

export interface TextBasedColumn {
  columnId: string;
  fieldName: string;
  meta: {
    type: string;
    [key: string]: unknown;
  };
  inMetricDimension?: boolean;
  [key: string]: unknown;
}

export interface TextBasedLayer {
  query?: { esql: string };
  columns?: TextBasedColumn[];
  [key: string]: unknown;
}

export interface LensVisualizationLayer {
  xAccessor?: string;
  accessors?: string[];
  primaryGroups?: string[];
  metrics?: Array<string | string[]>;
  splitAccessors?: string[];
  [key: string]: unknown;
}

export interface LensVisualization {
  layers?: LensVisualizationLayer[];
  columns?: Array<{ columnId: string }>;
  valueAccessor?: string;
  xAccessor?: string;
  yAccessor?: string;
  metricAccessor?: string;
  [key: string]: unknown;
}

export interface SavedPanelState {
  visualization?: LensVisualization;
  datasourceStates?: {
    textBased?: {
      layers?: Record<string, TextBasedLayer>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  query?: { esql: string };
  [key: string]: unknown;
}

export interface SavedEmbeddableConfig {
  attributes?: {
    type?: string;
    state?: SavedPanelState;
    [key: string]: unknown;
  };
  savedVis?: {
    params?: {
      markdown?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SavedDashboardPanel {
  type: string;
  title?: string;
  gridData: SavedDashboardGridData;
  panelIndex?: string;
  embeddableConfig?: SavedEmbeddableConfig;
  [key: string]: unknown;
}
