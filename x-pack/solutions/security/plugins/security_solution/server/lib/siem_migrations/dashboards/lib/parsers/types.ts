/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ParsedPanel {
  /** The generated panel uuid */
  id: string;
  /** The panel title extracted */
  title: string;
  /** The extracted query */
  query: string;
  /** The visualization type */
  viz_type: VizType;
  /** The computed position */
  position: PanelPosition;
}

export type VizType =
  | 'area_stacked'
  | 'area'
  | 'bar_horizontal_stacked'
  | 'bar_horizontal'
  | 'bar_vertical_stacked'
  | 'bar_vertical'
  | 'donut'
  | 'gauge'
  | 'heatmap'
  | 'line'
  | 'markdown'
  | 'metric'
  | 'pie'
  | 'table'
  | 'treemap';

export interface PanelPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}
