/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { i18n } from '@kbn/i18n';
import type { TextBasedLayer } from '@kbn/lens-common';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type {
  DatatableConfigESQL,
  LensAttributes,
  MetricConfigESQL,
  XYConfigESQL,
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

export type FrustrationLensConfig = MetricConfigESQL | XYConfigESQL | DatatableConfigESQL;

export interface FrustrationPanelGrid {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FrustrationPanelConfig {
  id: string;
  title: string;
  grid: FrustrationPanelGrid;
  config: FrustrationLensConfig;
}

/** One color per signal type, as hex strings from the theme. */
export interface FrustrationColors {
  rage: string;
  dead: string;
  error: string;
}

const GRID_ROW_HEIGHT = 7;
const GRID_CHART_HEIGHT = 14;

const SERIES_COLUMNS = ['rage', 'dead', 'error'] as const;

const SERIES_LABELS = {
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

const SIGNALS_LABEL = i18n.translate('xpack.digitalExperience.frustrationDashboard.signalsLabel', {
  defaultMessage: 'Signals',
});

const EXCEPTIONS_TITLE = i18n.translate(
  'xpack.digitalExperience.frustrationDashboard.exceptions.title',
  { defaultMessage: 'Error clicks by exception' }
);

const layerSettings = { sampling: 1, ignore_global_filters: false } as const;

const countMetricPanel = (
  id: string,
  title: string,
  esql: string,
  grid: Pick<FrustrationPanelGrid, 'x' | 'w'>
): FrustrationPanelConfig => ({
  id,
  title,
  grid: { ...grid, y: 0, h: GRID_ROW_HEIGHT },
  config: {
    type: 'metric',
    title,
    ...layerSettings,
    data_source: { type: 'esql', query: esql },
    metrics: [{ type: 'primary', column: 'signals', label: SIGNALS_LABEL }],
  },
});

const sessionsMetricPanel = (
  id: string,
  title: string,
  esql: string,
  grid: Pick<FrustrationPanelGrid, 'x' | 'w'>
): FrustrationPanelConfig => ({
  id,
  title,
  grid: { ...grid, y: 0, h: GRID_ROW_HEIGHT },
  config: {
    type: 'metric',
    title,
    ...layerSettings,
    data_source: { type: 'esql', query: esql },
    styling: { secondary: { label: { visible: true } } },
    metrics: [
      {
        type: 'primary',
        column: 'share',
        label: i18n.translate('xpack.digitalExperience.frustrationDashboard.sessions.share', {
          defaultMessage: 'Share of sessions',
        }),
        format: { type: 'percent', decimals: 0, compact: false },
      },
      {
        type: 'secondary',
        column: 'frustrated',
        label: i18n.translate('xpack.digitalExperience.frustrationDashboard.sessions.frustrated', {
          defaultMessage: 'Frustrated',
        }),
      },
    ],
  },
});

/**
 * Rage, dead and error clicks stacked per value of `xColumn`: a time axis, or horizontal bars
 * for the breakdowns, whose version and browser names read better on the vertical axis.
 */
const stackedBarsPanel = (
  id: string,
  title: string,
  esql: string,
  grid: Pick<FrustrationPanelGrid, 'x' | 'y' | 'w'>,
  {
    xColumn,
    isTime = false,
    isHorizontal = false,
    showLegend = true,
    colors,
  }: {
    xColumn: string;
    isTime?: boolean;
    isHorizontal?: boolean;
    showLegend?: boolean;
    colors?: FrustrationColors;
  }
): FrustrationPanelConfig => ({
  id,
  title,
  grid: { ...grid, h: GRID_CHART_HEIGHT },
  config: {
    type: 'xy',
    title,
    legend: { visibility: showLegend ? 'visible' : 'hidden', position: 'bottom' },
    axis: {
      x: { title: { visible: false }, ...(isTime ? { scale: 'temporal' } : {}) },
      y: { title: { visible: false } },
    },
    layers: [
      {
        type: isHorizontal ? 'bar_horizontal_stacked' : 'bar_stacked',
        ...layerSettings,
        data_source: { type: 'esql', query: esql },
        x: { column: xColumn },
        y: SERIES_COLUMNS.map((column) => ({
          column,
          label: SERIES_LABELS[column],
          ...(colors ? { color: { type: 'static', color: colors[column] } } : {}),
        })),
      },
    ],
  },
});

const exceptionsPanel = (esql: string): FrustrationPanelConfig => ({
  id: 'frustration-error-click-exceptions',
  title: EXCEPTIONS_TITLE,
  grid: { x: 0, y: 35, w: 48, h: GRID_CHART_HEIGHT },
  config: {
    type: 'data_table',
    title: EXCEPTIONS_TITLE,
    ...layerSettings,
    data_source: { type: 'esql', query: esql },
    rows: [
      {
        column: 'type',
        label: i18n.translate('xpack.digitalExperience.frustrationDashboard.exceptions.type', {
          defaultMessage: 'Exception',
        }),
      },
      {
        column: 'message',
        label: i18n.translate('xpack.digitalExperience.frustrationDashboard.exceptions.message', {
          defaultMessage: 'Message',
        }),
      },
    ],
    metrics: [
      { column: 'signals', label: SIGNALS_LABEL },
      {
        column: 'sessions',
        label: i18n.translate('xpack.digitalExperience.frustrationDashboard.exceptions.sessions', {
          defaultMessage: 'Sessions',
        }),
      },
    ],
  },
});

/** The Lens API configs of the dashboard panels, in layout order. */
export const frustrationPanelConfigs = (
  params: FrustrationQueryParams,
  colors?: FrustrationColors
): FrustrationPanelConfig[] => [
  countMetricPanel(
    'frustration-signals',
    i18n.translate('xpack.digitalExperience.frustrationDashboard.signals.title', {
      defaultMessage: 'Frustration signals',
    }),
    signalsQuery(params),
    { x: 0, w: 10 }
  ),
  sessionsMetricPanel(
    'frustration-sessions',
    i18n.translate('xpack.digitalExperience.frustrationDashboard.sessions.title', {
      defaultMessage: 'Frustrated sessions',
    }),
    frustratedSessionsQuery(params),
    { x: 10, w: 10 }
  ),
  countMetricPanel(
    'frustration-rage-clicks',
    i18n.translate('xpack.digitalExperience.frustrationDashboard.rageClicks.title', {
      defaultMessage: 'Rage clicks',
    }),
    signalsOfTypeQuery(params, EVENT_RAGE_CLICK),
    { x: 20, w: 10 }
  ),
  countMetricPanel(
    'frustration-dead-clicks',
    i18n.translate('xpack.digitalExperience.frustrationDashboard.deadClicks.title', {
      defaultMessage: 'Dead clicks',
    }),
    signalsOfTypeQuery(params, EVENT_DEAD_CLICK),
    { x: 30, w: 9 }
  ),
  countMetricPanel(
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
    { xColumn: 'time', isTime: true, colors }
  ),
  stackedBarsPanel(
    'frustration-by-version',
    i18n.translate('xpack.digitalExperience.frustrationDashboard.byVersion.title', {
      defaultMessage: 'Signals by app version',
    }),
    signalsByVersionQuery(params),
    { x: 0, y: 21, w: 24 },
    { xColumn: 'version', isHorizontal: true, colors }
  ),
  stackedBarsPanel(
    'frustration-by-browser',
    i18n.translate('xpack.digitalExperience.frustrationDashboard.byBrowser.title', {
      defaultMessage: 'Signals by browser',
    }),
    signalsByBrowserQuery(params),
    { x: 24, y: 21, w: 12 },
    { xColumn: 'browser', isHorizontal: true, showLegend: false, colors }
  ),
  stackedBarsPanel(
    'frustration-by-device',
    i18n.translate('xpack.digitalExperience.frustrationDashboard.byDevice.title', {
      defaultMessage: 'Signals by device',
    }),
    signalsByDeviceQuery(params),
    { x: 36, y: 21, w: 12 },
    { xColumn: 'device', isHorizontal: true, showLegend: false, colors }
  ),
  exceptionsPanel(errorClicksQuery(params)),
];

const withTextBasedLayers = (
  attributes: LensAttributes,
  update: (layer: TextBasedLayer) => TextBasedLayer
): LensAttributes => {
  const { textBased } = attributes.state.datasourceStates;
  if (!textBased) {
    return attributes;
  }
  return {
    ...attributes,
    state: {
      ...attributes.state,
      datasourceStates: {
        ...attributes.state.datasourceStates,
        textBased: {
          ...textBased,
          layers: Object.fromEntries(
            Object.entries(textBased.layers).map(([layerId, layer]) => [layerId, update(layer)])
          ),
        },
      },
    },
  };
};

/**
 * Lens drops the time buckets that extend past the dashboard's time range, which hides the
 * latest signals whenever the ES|QL bucket is wider than Lens' own interval. The as-code API has
 * no option for it on ES|QL columns.
 */
const keepPartialTimeBuckets = (attributes: LensAttributes): LensAttributes =>
  withTextBasedLayers(attributes, (layer) => ({
    ...layer,
    columns: layer.columns.map((column) =>
      column.meta?.type === 'date'
        ? { ...column, params: { ...column.params, dropPartials: false } }
        : column
    ),
  }));

/** The dashboard panels of the frustration page, with the Lens attributes built from the configs. */
export const buildFrustrationPanels = (
  params: FrustrationQueryParams,
  colors?: FrustrationColors
): DashboardState['panels'] => {
  const builder = new LensConfigBuilder();

  return frustrationPanelConfigs(params, colors).map(({ id, title, grid, config }) => ({
    type: 'lens' as const,
    grid,
    uid: id,
    config: { id, title, attributes: keepPartialTimeBuckets(builder.fromAPIFormat(config)) },
  }));
};
