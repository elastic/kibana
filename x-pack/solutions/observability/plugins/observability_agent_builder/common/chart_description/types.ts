/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ChartDescriptionPoint {
  x: number;
  y: number | null | undefined;
}

export interface ChartDescriptionSeries {
  title: string;
  data: ChartDescriptionPoint[];
}

export interface BuildDeterministicChartSummaryParams {
  chartTitle: string;
  series: ChartDescriptionSeries[];
  timestampFormatter?: (timestamp: number) => string;
  locale?: string;
  valueFormatter?: (value: number) => string;
}
