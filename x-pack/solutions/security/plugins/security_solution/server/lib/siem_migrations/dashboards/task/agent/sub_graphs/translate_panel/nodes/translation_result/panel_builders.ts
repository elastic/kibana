/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import type { LensApiConfig } from '@kbn/lens-embeddable-utils';
import type {
  ParsedPanel,
  VizType,
} from '../../../../../../../../../../common/siem_migrations/parsers/types';
import type { EsqlColumn } from '../../types';
import type { SavedDashboardPanel, SavedEmbeddableConfig } from './dashboard_panel_types';

export interface ColumnRoles {
  metricCol: string | undefined;
  xCol: string | undefined;
  breakdownCol: string | undefined;
}

export type XYVizType = Extract<
  VizType,
  | 'area'
  | 'area_stacked'
  | 'bar_horizontal'
  | 'bar_horizontal_stacked'
  | 'bar_vertical'
  | 'bar_vertical_stacked'
  | 'line'
>;

type XYSeriesType = Extract<
  XYConfig['layers'][number]['type'],
  | 'area'
  | 'area_stacked'
  | 'bar'
  | 'bar_stacked'
  | 'bar_horizontal'
  | 'bar_horizontal_stacked'
  | 'line'
>;

type XYConfig = Extract<LensApiConfig, { type: 'xy' }>;
type MetricConfig = Extract<LensApiConfig, { type: 'metric' }>;
type GaugeConfig = Extract<LensApiConfig, { type: 'gauge' }>;
type PieConfig = Extract<LensApiConfig, { type: 'pie' }>;
type HeatmapConfig = Extract<LensApiConfig, { type: 'heatmap' }>;
type TreemapConfig = Extract<LensApiConfig, { type: 'treemap' }>;
type TableConfig = Extract<LensApiConfig, { type: 'data_table' }>;

interface EsqlDataSource {
  type: 'esql';
  query: string;
}

interface EsqlColumnReference {
  column: string;
}

interface PrimaryMetricColumnReference extends EsqlColumnReference {
  type: 'primary';
}

interface MetricBreakdownColumnReference extends EsqlColumnReference {
  columns: number;
}

const xyVizTypeToSeriesType: Record<XYVizType, XYSeriesType> = {
  area: 'area',
  area_stacked: 'area_stacked',
  bar_vertical: 'bar',
  bar_vertical_stacked: 'bar_stacked',
  bar_horizontal: 'bar_horizontal',
  bar_horizontal_stacked: 'bar_horizontal_stacked',
  line: 'line',
};

const isXYVizType = (vizType: VizType): vizType is XYVizType => vizType in xyVizTypeToSeriesType;

const createEsqlDataSource = (query: string): EsqlDataSource => ({ type: 'esql', query });

const createColumnReference = (column: string): EsqlColumnReference => ({ column });

const createPrimaryMetricReference = (column: string): PrimaryMetricColumnReference => ({
  type: 'primary',
  column,
});

const createMetricBreakdownReference = (column: string): MetricBreakdownColumnReference => ({
  column,
  columns: 3,
});

export function buildGrid(parsedPanel: ParsedPanel): DashboardPanel['grid'] {
  return {
    x: parsedPanel.position.x,
    y: parsedPanel.position.y,
    w: parsedPanel.position.w,
    h: parsedPanel.position.h,
  };
}

/**
 * Preserves the positional heuristic used by the old template processor:
 * first = metric, last = x, penultimate = breakdown when >2 cols.
 */
export function assignColumnRoles(columns: EsqlColumn[]): ColumnRoles {
  const names = columns.map((c) => c.name);
  if (names.length === 0) {
    return { metricCol: undefined, xCol: undefined, breakdownCol: undefined };
  }
  if (names.length === 1) {
    return { metricCol: names[0], xCol: names[0], breakdownCol: undefined };
  }
  return {
    metricCol: names[0],
    breakdownCol: names.length > 2 ? names[names.length - 2] : undefined,
    xCol: names[names.length - 1],
  };
}

/**
 * Lens transformIn treats attributes with a top-level `type: lens` marker as API config; strip it so legacy template attributes flow through.
 */
export function prepareLensPanelConfigForDashboardApi(
  panelType: string,
  embeddableConfig: SavedEmbeddableConfig = {}
): DashboardPanel['config'] {
  if (panelType !== 'lens') {
    return embeddableConfig;
  }
  const cfg = structuredClone(embeddableConfig);
  const attrs = cfg.attributes;
  if (attrs && attrs.type === 'lens') {
    const { type: _ignored, ...restAttrs } = attrs;
    cfg.attributes = restAttrs;
  }
  return cfg;
}

/**
 * Converts a legacy saved-object row (type, gridData, panelIndex, embeddableConfig, title) into a Dashboard API panel.
 */
export function savedDashboardRowToDashboardPanel(panel: SavedDashboardPanel): DashboardPanel {
  const type = panel.type;
  const gridData = panel.gridData;
  const { i, sectionId: _sectionId, ...grid } = gridData;
  const panelIndex = panel.panelIndex ?? i;
  const config = prepareLensPanelConfigForDashboardApi(type, panel.embeddableConfig);

  const base: DashboardPanel = {
    type,
    id: panelIndex,
    grid,
    config,
    ...(panel.title !== undefined ? { title: panel.title } : {}),
  };

  return base;
}

const createLensDashboardPanel = (
  parsedPanel: ParsedPanel,
  config: LensApiConfig
): DashboardPanel => ({
  type: 'lens',
  id: parsedPanel.id,
  grid: buildGrid(parsedPanel),
  config,
});

export const buildXYPanel = (
  vizType: XYVizType,
  query: string,
  columns: EsqlColumn[],
  parsedPanel: ParsedPanel
): DashboardPanel => {
  const { metricCol, xCol, breakdownCol } = assignColumnRoles(columns);
  if (!metricCol) {
    throw new Error(`Cannot build XY Lens panel "${parsedPanel.title}" without a metric column`);
  }

  const isStacked = vizType.includes('stacked');
  const x = isStacked && columns.length === 2 ? undefined : xCol;
  const breakdownBy = breakdownCol ?? (isStacked && columns.length === 2 ? xCol : undefined);
  const config: XYConfig = {
    type: 'xy',
    title: parsedPanel.title,
    layers: [
      {
        type: xyVizTypeToSeriesType[vizType],
        data_source: { type: 'esql', query },
        ignore_global_filters: false,
        sampling: 1,
        ...(x ? { x: createColumnReference(x) } : {}),
        y: [{ column: metricCol }],
        ...(breakdownBy ? { breakdown_by: createColumnReference(breakdownBy) } : {}),
      },
    ],
  };

  return createLensDashboardPanel(parsedPanel, config);
};

export const buildMetricPanel = (
  query: string,
  columns: EsqlColumn[],
  parsedPanel: ParsedPanel
): DashboardPanel => {
  const { metricCol, breakdownCol } = assignColumnRoles(columns);
  if (!metricCol) {
    throw new Error(
      `Cannot build Metric Lens panel "${parsedPanel.title}" without a metric column`
    );
  }

  const config: MetricConfig = {
    type: 'metric',
    title: parsedPanel.title,
    data_source: createEsqlDataSource(query),
    ignore_global_filters: false,
    sampling: 1,
    metrics: [createPrimaryMetricReference(metricCol)],
    ...(breakdownCol ? { breakdown_by: createMetricBreakdownReference(breakdownCol) } : {}),
  };

  return createLensDashboardPanel(parsedPanel, config);
};

export const buildGaugePanel = (
  query: string,
  columns: EsqlColumn[],
  parsedPanel: ParsedPanel
): DashboardPanel => {
  const { metricCol } = assignColumnRoles(columns);
  if (!metricCol) {
    throw new Error(`Cannot build Gauge Lens panel "${parsedPanel.title}" without a metric column`);
  }

  const config: GaugeConfig = {
    type: 'gauge',
    title: parsedPanel.title,
    data_source: createEsqlDataSource(query),
    ignore_global_filters: false,
    sampling: 1,
    metric: createColumnReference(metricCol),
  };

  return createLensDashboardPanel(parsedPanel, config);
};

export const buildPiePanel = (
  query: string,
  columns: EsqlColumn[],
  parsedPanel: ParsedPanel,
  isDonut = false
): DashboardPanel => {
  const { metricCol, xCol } = assignColumnRoles(columns);
  if (!metricCol) {
    throw new Error(`Cannot build Pie Lens panel "${parsedPanel.title}" without a metric column`);
  }

  const config: PieConfig = {
    type: 'pie',
    title: parsedPanel.title,
    data_source: createEsqlDataSource(query),
    ignore_global_filters: false,
    sampling: 1,
    metrics: [createColumnReference(metricCol)],
    ...(xCol ? { group_by: [createColumnReference(xCol)] } : {}),
    ...(isDonut ? { styling: { donut_hole: 'm' } } : {}),
  };

  return createLensDashboardPanel(parsedPanel, config);
};

export const buildHeatmapPanel = (
  query: string,
  columns: EsqlColumn[],
  parsedPanel: ParsedPanel
): DashboardPanel => {
  const { metricCol, xCol, breakdownCol } = assignColumnRoles(columns);
  if (!metricCol || !xCol) {
    throw new Error(
      `Cannot build Heatmap Lens panel "${parsedPanel.title}" without metric and x columns`
    );
  }

  const config: HeatmapConfig = {
    type: 'heatmap',
    title: parsedPanel.title,
    data_source: createEsqlDataSource(query),
    ignore_global_filters: false,
    sampling: 1,
    metric: createColumnReference(metricCol),
    x: createColumnReference(xCol),
    ...(breakdownCol ? { y: createColumnReference(breakdownCol) } : {}),
  };

  return createLensDashboardPanel(parsedPanel, config);
};

export const buildTreemapPanel = (
  query: string,
  columns: EsqlColumn[],
  parsedPanel: ParsedPanel
): DashboardPanel => {
  const { metricCol } = assignColumnRoles(columns);
  if (!metricCol) {
    throw new Error(
      `Cannot build Treemap Lens panel "${parsedPanel.title}" without a metric column`
    );
  }

  const config: TreemapConfig = {
    type: 'treemap',
    title: parsedPanel.title,
    data_source: createEsqlDataSource(query),
    ignore_global_filters: false,
    sampling: 1,
    metrics: [createColumnReference(metricCol)],
    ...(columns.length > 1
      ? { group_by: columns.slice(1).map(({ name }) => ({ column: name })) }
      : {}),
  };

  return createLensDashboardPanel(parsedPanel, config);
};

export const buildTablePanel = (
  query: string,
  columns: EsqlColumn[],
  parsedPanel: ParsedPanel
): DashboardPanel => {
  if (columns.length === 0) {
    throw new Error(`Cannot build Table Lens panel "${parsedPanel.title}" without columns`);
  }

  const config: TableConfig = {
    type: 'data_table',
    title: parsedPanel.title,
    data_source: createEsqlDataSource(query),
    ignore_global_filters: false,
    sampling: 1,
    metrics: columns.map(({ name }) => createColumnReference(name)),
  };

  return createLensDashboardPanel(parsedPanel, config);
};

export function buildDashboardPanelForVizType(
  vizType: VizType,
  query: string,
  esqlColumns: EsqlColumn[],
  parsedPanel: ParsedPanel
): DashboardPanel {
  if (isXYVizType(vizType)) {
    return buildXYPanel(vizType, query, esqlColumns, parsedPanel);
  }

  switch (vizType) {
    case 'metric':
      return buildMetricPanel(query, esqlColumns, parsedPanel);
    case 'gauge':
      return buildGaugePanel(query, esqlColumns, parsedPanel);
    case 'pie':
      return buildPiePanel(query, esqlColumns, parsedPanel);
    case 'donut':
      return buildPiePanel(query, esqlColumns, parsedPanel, true);
    case 'heatmap':
      return buildHeatmapPanel(query, esqlColumns, parsedPanel);
    case 'treemap':
      return buildTreemapPanel(query, esqlColumns, parsedPanel);
    case 'table':
      return buildTablePanel(query, esqlColumns, parsedPanel);
    default:
      throw new Error(`Unsupported Lens visualization type "${vizType}"`);
  }
}
