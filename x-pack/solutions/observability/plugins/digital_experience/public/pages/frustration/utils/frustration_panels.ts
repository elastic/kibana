/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import type { TextBasedLayer, TextBasedLayerColumn } from '@kbn/lens-common';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type {
  LensAttributes,
  LensBreakdownConfig,
  LensESQLDataset,
  LensMetricConfig,
  LensTableConfig,
  LensXYConfig,
} from '@kbn/lens-embeddable-utils';
import {
  EVENT_DEAD_CLICK,
  EVENT_ERROR_CLICK,
  EVENT_RAGE_CLICK,
} from '../../../../common/otel_data';
import {
  errorClicksQuery,
  frustratedSessionsQuery,
  signalsByBrowserQuery,
  signalsByDeviceQuery,
  signalsByVersionQuery,
  signalsOfTypeQuery,
  signalsOverTimeQuery,
  signalsQuery,
  type FrustrationQueryParams,
} from './frustration_esql';

type EsqlConfig<T> = T & { dataset: LensESQLDataset };

export type FrustrationLensConfig =
  | EsqlConfig<LensMetricConfig>
  | EsqlConfig<LensXYConfig>
  | EsqlConfig<LensTableConfig>;

export interface FrustrationPanelGrid {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * What the Lens config can't express for an ES|QL layer, applied to the built attributes:
 * stacked bars, column labels and percent formatting.
 */
export interface FrustrationPanelAppearance {
  stacked?: 'vertical' | 'horizontal';
  columns?: Readonly<Record<string, { label?: string; percent?: boolean }>>;
}

export interface FrustrationPanelConfig {
  id: string;
  title: string;
  grid: FrustrationPanelGrid;
  config: FrustrationLensConfig;
  appearance?: FrustrationPanelAppearance;
}

/** One color per signal type, as hex strings from the theme. */
export interface FrustrationColors {
  rage: string;
  dead: string;
  error: string;
}

const GRID_ROW_HEIGHT = 7;
const GRID_CHART_HEIGHT = 14;

const labels = {
  rage: i18n.translate('xpack.digitalExperience.frustrationDashboard.series.rage', {
    defaultMessage: 'Rage',
  }),
  dead: i18n.translate('xpack.digitalExperience.frustrationDashboard.series.dead', {
    defaultMessage: 'Dead',
  }),
  error: i18n.translate('xpack.digitalExperience.frustrationDashboard.series.error', {
    defaultMessage: 'Error',
  }),
};

const signalsLabel = i18n.translate('xpack.digitalExperience.frustrationDashboard.signalsLabel', {
  defaultMessage: 'Signals',
});

const SERIES_COLUMNS = ['rage', 'dead', 'error'] as const;

const seriesAppearance = (
  stacked: FrustrationPanelAppearance['stacked']
): FrustrationPanelAppearance => ({
  stacked,
  columns: Object.fromEntries(SERIES_COLUMNS.map((column) => [column, { label: labels[column] }])),
});

const metricPanel = (
  id: string,
  title: string,
  esql: string,
  grid: Pick<FrustrationPanelGrid, 'x' | 'w'>,
  options: Pick<LensMetricConfig, 'value' | 'querySecondaryMetric'> = { value: 'signals' },
  columns: NonNullable<FrustrationPanelAppearance['columns']> = { signals: { label: signalsLabel } }
): FrustrationPanelConfig => ({
  id,
  title,
  grid: { ...grid, y: 0, h: GRID_ROW_HEIGHT },
  config: { chartType: 'metric', title, dataset: { esql }, ...options },
  appearance: { columns },
});

const stackedBarsPanel = (
  id: string,
  title: string,
  esql: string,
  grid: Pick<FrustrationPanelGrid, 'x' | 'y' | 'w'>,
  {
    xAxis,
    horizontal,
    showLegend,
    colors,
  }: {
    xAxis: LensBreakdownConfig;
    horizontal: boolean;
    showLegend: boolean;
    colors?: FrustrationColors;
  }
): FrustrationPanelConfig => ({
  id,
  title,
  grid: { ...grid, h: GRID_CHART_HEIGHT },
  config: {
    chartType: 'xy',
    title,
    dataset: { esql },
    legend: { show: showLegend, position: 'bottom' },
    axisTitleVisibility: { showXAxisTitle: false, showYAxisTitle: false },
    layers: [
      {
        type: 'series',
        seriesType: 'bar',
        xAxis,
        yAxis: SERIES_COLUMNS.map((column) => ({
          label: labels[column],
          value: column,
          seriesColor: colors?.[column],
        })),
      },
    ],
  },
  appearance: seriesAppearance(horizontal ? 'horizontal' : 'vertical'),
});

/** The Lens ES|QL configs of the dashboard panels, in layout order. */
export const frustrationPanelConfigs = (
  params: FrustrationQueryParams,
  colors?: FrustrationColors
): FrustrationPanelConfig[] => [
  metricPanel(
    'frustration-signals',
    i18n.translate('xpack.digitalExperience.frustrationDashboard.signals.title', {
      defaultMessage: 'Frustration signals',
    }),
    signalsQuery(params),
    { x: 0, w: 10 }
  ),
  metricPanel(
    'frustration-sessions',
    i18n.translate('xpack.digitalExperience.frustrationDashboard.sessions.title', {
      defaultMessage: 'Frustrated sessions',
    }),
    frustratedSessionsQuery(params),
    { x: 10, w: 10 },
    { value: 'share', querySecondaryMetric: 'frustrated' },
    {
      share: {
        percent: true,
        label: i18n.translate('xpack.digitalExperience.frustrationDashboard.sessions.share', {
          defaultMessage: 'Share of sessions',
        }),
      },
      frustrated: {
        label: i18n.translate('xpack.digitalExperience.frustrationDashboard.sessions.frustrated', {
          defaultMessage: 'Frustrated',
        }),
      },
    }
  ),
  metricPanel(
    'frustration-rage-clicks',
    i18n.translate('xpack.digitalExperience.frustrationDashboard.rageClicks.title', {
      defaultMessage: 'Rage clicks',
    }),
    signalsOfTypeQuery(params, EVENT_RAGE_CLICK),
    { x: 20, w: 10 }
  ),
  metricPanel(
    'frustration-dead-clicks',
    i18n.translate('xpack.digitalExperience.frustrationDashboard.deadClicks.title', {
      defaultMessage: 'Dead clicks',
    }),
    signalsOfTypeQuery(params, EVENT_DEAD_CLICK),
    { x: 30, w: 9 }
  ),
  metricPanel(
    'frustration-error-clicks',
    i18n.translate('xpack.digitalExperience.frustrationDashboard.errorClicks.title', {
      defaultMessage: 'Error clicks',
    }),
    signalsOfTypeQuery(params, EVENT_ERROR_CLICK),
    { x: 39, w: 9 }
  ),
  stackedBarsPanel(
    'frustration-over-time',
    i18n.translate('xpack.digitalExperience.frustrationDashboard.overTime.title', {
      defaultMessage: 'Signals over time',
    }),
    signalsOverTimeQuery(params),
    { x: 0, y: 7, w: 48 },
    { xAxis: { type: 'dateHistogram', field: 'time' }, horizontal: false, showLegend: true, colors }
  ),
  stackedBarsPanel(
    'frustration-by-version',
    i18n.translate('xpack.digitalExperience.frustrationDashboard.byVersion.title', {
      defaultMessage: 'Signals by app version',
    }),
    signalsByVersionQuery(params),
    { x: 0, y: 21, w: 24 },
    { xAxis: 'version', horizontal: true, showLegend: true, colors }
  ),
  stackedBarsPanel(
    'frustration-by-browser',
    i18n.translate('xpack.digitalExperience.frustrationDashboard.byBrowser.title', {
      defaultMessage: 'Signals by browser',
    }),
    signalsByBrowserQuery(params),
    { x: 24, y: 21, w: 12 },
    { xAxis: 'browser', horizontal: true, showLegend: false, colors }
  ),
  stackedBarsPanel(
    'frustration-by-device',
    i18n.translate('xpack.digitalExperience.frustrationDashboard.byDevice.title', {
      defaultMessage: 'Signals by device',
    }),
    signalsByDeviceQuery(params),
    { x: 36, y: 21, w: 12 },
    { xAxis: 'device', horizontal: true, showLegend: false, colors }
  ),
  {
    id: 'frustration-error-click-exceptions',
    title: i18n.translate('xpack.digitalExperience.frustrationDashboard.exceptions.title', {
      defaultMessage: 'Error clicks by exception',
    }),
    grid: { x: 0, y: 35, w: 48, h: GRID_CHART_HEIGHT },
    config: {
      chartType: 'table',
      title: i18n.translate('xpack.digitalExperience.frustrationDashboard.exceptions.title', {
        defaultMessage: 'Error clicks by exception',
      }),
      dataset: { esql: errorClicksQuery(params) },
      // The table lists its value column first, then the breakdowns in order.
      value: 'type',
      breakdown: ['message', 'signals', 'sessions'],
    },
    appearance: {
      columns: {
        type: {
          label: i18n.translate('xpack.digitalExperience.frustrationDashboard.exceptions.type', {
            defaultMessage: 'Exception',
          }),
        },
        message: {
          label: i18n.translate('xpack.digitalExperience.frustrationDashboard.exceptions.message', {
            defaultMessage: 'Message',
          }),
        },
        signals: {
          label: i18n.translate('xpack.digitalExperience.frustrationDashboard.exceptions.signals', {
            defaultMessage: 'Signals',
          }),
        },
        sessions: {
          label: i18n.translate(
            'xpack.digitalExperience.frustrationDashboard.exceptions.sessions',
            { defaultMessage: 'Sessions' }
          ),
        },
      },
    },
  },
];

const STACKED_SERIES_TYPE = {
  vertical: 'bar_stacked',
  horizontal: 'bar_horizontal_stacked',
} as const;

interface XYVisualizationLike {
  preferredSeriesType?: string;
  layers?: Array<{ seriesType?: string }>;
}

const applyColumns = (
  layer: TextBasedLayer,
  columns: NonNullable<FrustrationPanelAppearance['columns']>
): TextBasedLayer => ({
  ...layer,
  columns: layer.columns.map((column): TextBasedLayerColumn => {
    const { label, percent } = columns[column.fieldName] ?? {};
    return {
      ...column,
      ...(label ? { label, customLabel: true } : {}),
      ...(percent ? { params: { format: { id: 'percent', params: { decimals: 0 } } } } : {}),
    };
  }),
});

const applyAppearance = (
  attributes: LensAttributes,
  { stacked, columns }: FrustrationPanelAppearance
): LensAttributes => {
  const { datasourceStates, visualization } = attributes.state;
  const textBased = datasourceStates.textBased;
  const stackedType = stacked ? STACKED_SERIES_TYPE[stacked] : undefined;
  const xy = visualization as XYVisualizationLike;

  return {
    ...attributes,
    state: {
      ...attributes.state,
      datasourceStates: {
        ...datasourceStates,
        ...(textBased && columns
          ? {
              textBased: {
                ...textBased,
                layers: Object.fromEntries(
                  Object.entries(textBased.layers).map(([layerId, layer]) => [
                    layerId,
                    applyColumns(layer, columns),
                  ])
                ),
              },
            }
          : {}),
      },
      ...(stackedType
        ? {
            visualization: {
              ...xy,
              preferredSeriesType: stackedType,
              layers: xy.layers?.map((layer) => ({ ...layer, seriesType: stackedType })),
            },
          }
        : {}),
    },
  };
};

/** The dashboard panels of the frustration page, with the Lens attributes built from the configs. */
export const buildFrustrationPanels = async (
  dataViews: DataViewsPublicPluginStart,
  params: FrustrationQueryParams,
  colors?: FrustrationColors
): Promise<DashboardState['panels']> => {
  const builder = new LensConfigBuilder(dataViews);

  return Promise.all(
    frustrationPanelConfigs(params, colors).map(async ({ id, title, grid, config, appearance }) => {
      const built = (await builder.build(config, {
        query: { esql: config.dataset.esql },
      })) as LensAttributes;
      const attributes = appearance ? applyAppearance(built, appearance) : built;

      return { type: 'lens' as const, grid, uid: id, config: { id, title, attributes } };
    })
  );
};
