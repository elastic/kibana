/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * copyright elasticsearch b.v. and/or licensed to elasticsearch b.v. under one
 * or more contributor license agreements. licensed under the elastic license
 * 2.0; you may not use this file except in compliance with the elastic license
 * 2.0.
 */

export interface parsedpanel {
  /** the generated panel uuid */
  id: string;
  /** the panel title extracted */
  title: string;
  /** the extracted query */
  query: string;
  /** the visualization type */
  viz_type: viztype;
  /** the computed position */
  position: panelposition;
}

export type viztype =
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

export interface panelposition {
  x: number;
  y: number;
  w: number;
  h: number;
}
