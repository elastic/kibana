/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardPanel, DashboardSection } from '@kbn/as-code-dashboard-schema';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown-schemas';
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
import { SESSIONS_LABEL } from '../../../labels';
import { FRUSTRATION_DEFINITIONS } from '../../../utils/frustration_definitions';
import {
  SIGNAL_TYPE_LABELS,
  errorClicksQuery,
  frustratedSessionsQuery,
  sessionsBySignalsQuery,
  signalsByBrowserQuery,
  signalsByDeviceQuery,
  signalsByVersionQuery,
  signalsOverTimeQuery,
  signalsPerPageViewQuery,
  signalsPerSessionQuery,
  topActionsQuery,
  type FrustrationEvent,
  type FrustrationQueryParams,
  type SignalType,
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
  /** What the panel measures: the dashboard shows it as an info icon tooltip by the title. */
  description?: string;
  /** The position in the section, below its text. */
  grid: FrustrationPanelGrid;
  config: FrustrationLensConfig;
}

export interface FrustrationSectionConfig {
  id: string;
  title: string;
  collapsed: boolean;
  /** Markdown across the top of the section. */
  text?: string;
  panels: FrustrationPanelConfig[];
}

/** One color per signal type, as hex strings from the theme. */
export type FrustrationColors = Record<SignalType, string>;

const GRID_COLUMNS = 48;
const GRID_TEXT_HEIGHT = 3;
const GRID_ROW_HEIGHT = 7;
const GRID_CHART_HEIGHT = 14;
const GRID_TABLE_HEIGHT = 16;

const SERIES_COLUMNS = ['rage', 'dead', 'error'] as const;

const SIGNALS_LABEL = i18n.translate('xpack.digitalExperience.frustrationDashboard.signalsLabel', {
  defaultMessage: 'Signals',
});

// The titles already say "per session" or "per page view". The API has no option to hide the
// label and drops an empty one, so with `lens.apiFormat` on the column name shows.
const NO_LABEL = '';

const PER_PAGE_VIEW_LABEL = i18n.translate(
  'xpack.digitalExperience.frustrationDashboard.perPageViewLabel',
  { defaultMessage: 'Signals per page view' }
);

const EXCEPTIONS_TITLE = i18n.translate(
  'xpack.digitalExperience.frustrationDashboard.exceptions.title',
  { defaultMessage: 'Error clicks by exception' }
);

const OVERVIEW_TEXT = i18n.translate('xpack.digitalExperience.frustrationDashboard.overview.text', {
  defaultMessage:
    'Frustration signals are the moments users are frustrated, annoyed or blocked in the application: rage, dead and error clicks, which EDOT Browser detects. They point to the elements and pages to fix first.',
});

const TYPE_METRIC_GRIDS = [
  { x: 20, w: 10 },
  { x: 30, w: 9 },
  { x: 39, w: 9 },
] as const;

const TYPE_SECTIONS: ReadonlyArray<{
  type: SignalType;
  event: FrustrationEvent;
  title: string;
  perSessionTitle: string;
  perPageViewTitle: string;
  sessionsTitle: string;
  sessionsLabel: string;
  perSessionDescription: string;
  perPageViewDescription: string;
  sessionsDescription: string;
  topActionsTitle: string;
}> = [
  {
    type: 'rage',
    event: EVENT_RAGE_CLICK,
    title: i18n.translate('xpack.digitalExperience.frustrationDashboard.rageClicks.title', {
      defaultMessage: 'Rage clicks',
    }),
    perSessionTitle: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.rageClicks.perSession',
      { defaultMessage: 'Rage clicks per session' }
    ),
    perPageViewTitle: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.rageClicks.perPageView',
      { defaultMessage: 'Avg rage clicks per page view' }
    ),
    sessionsTitle: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.rageClicks.sessions',
      { defaultMessage: 'Sessions with rage clicks' }
    ),
    sessionsLabel: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.rageClicks.sessionsLabel',
      { defaultMessage: 'With rage clicks' }
    ),
    perSessionDescription: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.rageClicks.perSessionDescription',
      { defaultMessage: 'Rage clicks divided by the sessions of the application.' }
    ),
    perPageViewDescription: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.rageClicks.perPageViewDescription',
      {
        defaultMessage:
          'Rage clicks divided by the page views of the application. Above 1 when a page view has several.',
      }
    ),
    sessionsDescription: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.rageClicks.sessionsDescription',
      { defaultMessage: 'The share of the sessions with at least one rage click.' }
    ),
    topActionsTitle: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.rageClicks.topActions',
      { defaultMessage: 'Top actions with rage clicks' }
    ),
  },
  {
    type: 'dead',
    event: EVENT_DEAD_CLICK,
    title: i18n.translate('xpack.digitalExperience.frustrationDashboard.deadClicks.title', {
      defaultMessage: 'Dead clicks',
    }),
    perSessionTitle: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.deadClicks.perSession',
      { defaultMessage: 'Dead clicks per session' }
    ),
    perPageViewTitle: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.deadClicks.perPageView',
      { defaultMessage: 'Avg dead clicks per page view' }
    ),
    sessionsTitle: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.deadClicks.sessions',
      { defaultMessage: 'Sessions with dead clicks' }
    ),
    sessionsLabel: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.deadClicks.sessionsLabel',
      { defaultMessage: 'With dead clicks' }
    ),
    perSessionDescription: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.deadClicks.perSessionDescription',
      { defaultMessage: 'Dead clicks divided by the sessions of the application.' }
    ),
    perPageViewDescription: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.deadClicks.perPageViewDescription',
      {
        defaultMessage:
          'Dead clicks divided by the page views of the application. Above 1 when a page view has several.',
      }
    ),
    sessionsDescription: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.deadClicks.sessionsDescription',
      { defaultMessage: 'The share of the sessions with at least one dead click.' }
    ),
    topActionsTitle: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.deadClicks.topActions',
      { defaultMessage: 'Top actions with dead clicks' }
    ),
  },
  {
    type: 'error',
    event: EVENT_ERROR_CLICK,
    title: i18n.translate('xpack.digitalExperience.frustrationDashboard.errorClicks.title', {
      defaultMessage: 'Error clicks',
    }),
    perSessionTitle: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.errorClicks.perSession',
      { defaultMessage: 'Error clicks per session' }
    ),
    perPageViewTitle: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.errorClicks.perPageView',
      { defaultMessage: 'Avg error clicks per page view' }
    ),
    sessionsTitle: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.errorClicks.sessions',
      { defaultMessage: 'Sessions with error clicks' }
    ),
    sessionsLabel: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.errorClicks.sessionsLabel',
      { defaultMessage: 'With error clicks' }
    ),
    perSessionDescription: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.errorClicks.perSessionDescription',
      { defaultMessage: 'Error clicks divided by the sessions of the application.' }
    ),
    perPageViewDescription: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.errorClicks.perPageViewDescription',
      {
        defaultMessage:
          'Error clicks divided by the page views of the application. Above 1 when a page view has several.',
      }
    ),
    sessionsDescription: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.errorClicks.sessionsDescription',
      { defaultMessage: 'The share of the sessions with at least one error click.' }
    ),
    topActionsTitle: i18n.translate(
      'xpack.digitalExperience.frustrationDashboard.errorClicks.topActions',
      { defaultMessage: 'Top actions with error clicks' }
    ),
  },
];

const layerSettings = { sampling: 1, ignore_global_filters: false } as const;

const ratioFormat = { type: 'number', decimals: 2, compact: false } as const;

const SESSIONS_SHARE_METRIC = {
  type: 'primary',
  column: 'share',
  label: i18n.translate('xpack.digitalExperience.frustrationDashboard.sessions.share', {
    defaultMessage: 'Share of sessions',
  }),
  format: { type: 'percent', decimals: 1, compact: false },
} as const;

const metricPanel = (
  id: string,
  { title, description }: { title: string; description: string },
  esql: string,
  grid: FrustrationPanelGrid,
  primary: Extract<MetricConfigESQL['metrics'][number], { type: 'primary' }>,
  secondary: { column: string; label: string }
): FrustrationPanelConfig => ({
  id,
  title,
  description,
  grid,
  config: {
    type: 'metric',
    title,
    ...layerSettings,
    data_source: { type: 'esql', query: esql },
    styling: { secondary: { label: { visible: true } } },
    metrics: [primary, { type: 'secondary', ...secondary }],
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
          label: SIGNAL_TYPE_LABELS[column],
          ...(colors ? { color: { type: 'static', color: colors[column] } } : {}),
        })),
      },
    ],
  },
});

const DISTRIBUTION_TITLE = i18n.translate(
  'xpack.digitalExperience.frustrationDashboard.distribution.title',
  { defaultMessage: 'Sessions by signals per session' }
);

const distributionPanel = (
  esql: string,
  grid: Pick<FrustrationPanelGrid, 'x' | 'y' | 'w'>
): FrustrationPanelConfig => ({
  id: 'frustration-sessions-by-signals',
  title: DISTRIBUTION_TITLE,
  grid: { ...grid, h: GRID_CHART_HEIGHT },
  config: {
    type: 'xy',
    title: DISTRIBUTION_TITLE,
    legend: { visibility: 'hidden' },
    axis: { x: { title: { visible: false } }, y: { title: { visible: false } } },
    layers: [
      {
        type: 'bar',
        ...layerSettings,
        data_source: { type: 'esql', query: esql },
        x: { column: 'bucket' },
        y: [{ column: 'sessions', label: SESSIONS_LABEL }],
      },
    ],
  },
});

const textRow = (column: string, label: string) => ({ column, label });

/**
 * The elements with the most signals, with a bar for their signals and their signals per view of
 * the page. The Overview's table names the type of each row; a type's own table is of that type.
 */
const topActionsPanel = (
  id: string,
  title: string,
  esql: string,
  grid: Pick<FrustrationPanelGrid, 'x' | 'y' | 'w'>,
  {
    signalsLabel = SIGNALS_LABEL,
    showType,
    color,
  }: { signalsLabel?: string; showType: boolean; color?: string }
): FrustrationPanelConfig => {
  const page = textRow(
    'page',
    i18n.translate('xpack.digitalExperience.frustrationDashboard.topActions.page', {
      defaultMessage: 'Page',
    })
  );
  const element = textRow(
    'element',
    i18n.translate('xpack.digitalExperience.frustrationDashboard.topActions.element', {
      defaultMessage: 'Element',
    })
  );
  const type = {
    ...textRow(
      'type',
      i18n.translate('xpack.digitalExperience.frustrationDashboard.topActions.type', {
        defaultMessage: 'Type',
      })
    ),
    width: 90,
  };

  return {
    id,
    title,
    grid: { ...grid, h: GRID_TABLE_HEIGHT },
    config: {
      type: 'data_table',
      title,
      ...layerSettings,
      data_source: { type: 'esql', query: esql },
      rows: showType ? [type, element, page] : [page, element],
      metrics: [
        {
          column: 'signals',
          label: signalsLabel,
          apply_color_to: 'progress_bar',
          fill_mode: 'single',
          color: color ? { type: 'static', color } : { type: 'auto' },
          value_range: { type: 'auto' },
          alignment: 'right',
          width: 180,
        },
        { column: 'sessions', label: SESSIONS_LABEL, width: 90 },
        { column: 'per_view', label: PER_PAGE_VIEW_LABEL, format: ratioFormat, width: 150 },
      ],
    },
  };
};

const exceptionsPanel = (esql: string, y: number): FrustrationPanelConfig => ({
  id: 'frustration-error-click-exceptions',
  title: EXCEPTIONS_TITLE,
  grid: { x: 0, y, w: GRID_COLUMNS, h: GRID_CHART_HEIGHT },
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

const overviewSection = (
  params: FrustrationQueryParams,
  colors?: FrustrationColors
): FrustrationSectionConfig => ({
  id: 'frustration-overview',
  title: i18n.translate('xpack.digitalExperience.frustrationDashboard.overview.title', {
    defaultMessage: 'Overview',
  }),
  collapsed: false,
  text: OVERVIEW_TEXT,
  panels: [
    metricPanel(
      'frustration-signals-per-session',
      {
        title: i18n.translate(
          'xpack.digitalExperience.frustrationDashboard.signalsPerSession.title',
          {
            defaultMessage: 'Signals per session',
          }
        ),
        description: i18n.translate(
          'xpack.digitalExperience.frustrationDashboard.signalsPerSession.description',
          {
            defaultMessage:
              'Rage, dead and error clicks divided by the sessions of the application, frustrated or not.',
          }
        ),
      },
      signalsPerSessionQuery(params),
      { x: 0, y: 0, w: 10, h: GRID_ROW_HEIGHT },
      { type: 'primary', column: 'per_session', label: NO_LABEL, format: ratioFormat },
      { column: 'signals', label: SIGNALS_LABEL }
    ),
    metricPanel(
      'frustration-sessions',
      {
        title: i18n.translate('xpack.digitalExperience.frustrationDashboard.sessions.title', {
          defaultMessage: 'Frustrated sessions',
        }),
        description: i18n.translate(
          'xpack.digitalExperience.frustrationDashboard.sessions.description',
          {
            defaultMessage:
              'The share of the sessions with at least one rage, dead or error click.',
          }
        ),
      },
      frustratedSessionsQuery(params),
      { x: 10, y: 0, w: 10, h: GRID_ROW_HEIGHT },
      SESSIONS_SHARE_METRIC,
      {
        column: 'frustrated',
        label: i18n.translate('xpack.digitalExperience.frustrationDashboard.sessions.frustrated', {
          defaultMessage: 'Frustrated',
        }),
      }
    ),
    ...TYPE_SECTIONS.map(({ type, event, title, perSessionTitle, perSessionDescription }, index) =>
      metricPanel(
        `frustration-${type}-clicks-per-session`,
        { title: perSessionTitle, description: perSessionDescription },
        signalsPerSessionQuery(params, [event]),
        { ...TYPE_METRIC_GRIDS[index], y: 0, h: GRID_ROW_HEIGHT },
        { type: 'primary', column: 'per_session', label: NO_LABEL, format: ratioFormat },
        { column: 'signals', label: title }
      )
    ),
    stackedBarsPanel(
      'frustration-over-time',
      i18n.translate('xpack.digitalExperience.frustrationDashboard.overTime.title', {
        defaultMessage: 'Signals over time',
      }),
      signalsOverTimeQuery(params),
      { x: 0, y: GRID_ROW_HEIGHT, w: 32 },
      { xColumn: 'time', isTime: true, colors }
    ),
    distributionPanel(sessionsBySignalsQuery(params), { x: 32, y: GRID_ROW_HEIGHT, w: 16 }),
    topActionsPanel(
      'frustration-top-actions',
      i18n.translate('xpack.digitalExperience.frustrationDashboard.topActions.title', {
        defaultMessage: 'Top actions with frustration signals',
      }),
      topActionsQuery(params),
      { x: 0, y: GRID_ROW_HEIGHT + GRID_CHART_HEIGHT, w: GRID_COLUMNS },
      { showType: true }
    ),
  ],
});

const typeSection = (
  params: FrustrationQueryParams,
  {
    type,
    event,
    title,
    perPageViewTitle,
    sessionsTitle,
    sessionsLabel,
    perPageViewDescription,
    sessionsDescription,
    topActionsTitle,
  }: (typeof TYPE_SECTIONS)[number],
  colors?: FrustrationColors
): FrustrationSectionConfig => ({
  id: `frustration-${type}`,
  title,
  collapsed: false,
  text: FRUSTRATION_DEFINITIONS[type],
  panels: [
    metricPanel(
      `frustration-${type}-clicks-per-page-view`,
      { title: perPageViewTitle, description: perPageViewDescription },
      signalsPerPageViewQuery(params, event),
      { x: 0, y: 0, w: 12, h: GRID_TABLE_HEIGHT / 2 },
      { type: 'primary', column: 'per_view', label: NO_LABEL, format: ratioFormat },
      { column: 'signals', label: title }
    ),
    metricPanel(
      `frustration-${type}-sessions`,
      { title: sessionsTitle, description: sessionsDescription },
      frustratedSessionsQuery(params, [event]),
      { x: 0, y: GRID_TABLE_HEIGHT / 2, w: 12, h: GRID_TABLE_HEIGHT / 2 },
      SESSIONS_SHARE_METRIC,
      { column: 'frustrated', label: sessionsLabel }
    ),
    topActionsPanel(
      `frustration-${type}-top-actions`,
      topActionsTitle,
      topActionsQuery(params, [event]),
      { x: 12, y: 0, w: 36 },
      { signalsLabel: title, showType: false, color: colors?.[type] }
    ),
    ...(type === 'error' ? [exceptionsPanel(errorClicksQuery(params), GRID_TABLE_HEIGHT)] : []),
  ],
});

const breakdownsSection = (
  params: FrustrationQueryParams,
  colors?: FrustrationColors
): FrustrationSectionConfig => ({
  id: 'frustration-breakdowns',
  title: i18n.translate('xpack.digitalExperience.frustrationDashboard.breakdowns.title', {
    defaultMessage: 'Breakdowns',
  }),
  collapsed: true,
  panels: [
    stackedBarsPanel(
      'frustration-by-version',
      i18n.translate('xpack.digitalExperience.frustrationDashboard.byVersion.title', {
        defaultMessage: 'Signals per session by app version',
      }),
      signalsByVersionQuery(params),
      { x: 0, y: 0, w: 24 },
      { xColumn: 'version', isHorizontal: true, colors }
    ),
    stackedBarsPanel(
      'frustration-by-browser',
      i18n.translate('xpack.digitalExperience.frustrationDashboard.byBrowser.title', {
        defaultMessage: 'Signals per session by browser',
      }),
      signalsByBrowserQuery(params),
      { x: 24, y: 0, w: 12 },
      { xColumn: 'browser', isHorizontal: true, showLegend: false, colors }
    ),
    stackedBarsPanel(
      'frustration-by-device',
      i18n.translate('xpack.digitalExperience.frustrationDashboard.byDevice.title', {
        defaultMessage: 'Signals per session by device',
      }),
      signalsByDeviceQuery(params),
      { x: 36, y: 0, w: 12 },
      { xColumn: 'device', isHorizontal: true, showLegend: false, colors }
    ),
  ],
});

/** The sections of the dashboard and their Lens API configs, in layout order. */
export const frustrationSectionConfigs = (
  params: FrustrationQueryParams,
  colors?: FrustrationColors
): FrustrationSectionConfig[] => [
  overviewSection(params, colors),
  ...TYPE_SECTIONS.map((typeConfig) => typeSection(params, typeConfig, colors)),
  breakdownsSection(params, colors),
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
 * no option for it on ES|QL columns, so with `lens.apiFormat` on the dashboard loses it.
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

const textPanel = (id: string, content: string): DashboardPanel => ({
  type: MARKDOWN_EMBEDDABLE_TYPE,
  id,
  grid: { x: 0, y: 0, w: GRID_COLUMNS, h: GRID_TEXT_HEIGHT },
  config: { content, settings: { open_links_in_new_tab: true }, hide_title: true },
});

/**
 * The dashboard sections of the frustration page: a by-value markdown panel with the section's
 * text, then its Lens panels, with the attributes built from the configs.
 */
export const buildFrustrationPanels = (
  params: FrustrationQueryParams,
  colors?: FrustrationColors
): DashboardSection[] => {
  const builder = new LensConfigBuilder();

  return frustrationSectionConfigs(params, colors).map(
    ({ id, title, collapsed, text, panels }, index): DashboardSection => {
      const top = text ? GRID_TEXT_HEIGHT : 0;
      return {
        id,
        title,
        collapsed,
        grid: { y: index },
        panels: [
          ...(text ? [textPanel(`${id}-text`, text)] : []),
          ...panels.map(
            ({ id: panelId, title: panelTitle, description, grid, config }): DashboardPanel => ({
              type: 'lens',
              grid: { ...grid, y: grid.y + top },
              id: panelId,
              config: {
                title: panelTitle,
                ...(description ? { description } : {}),
                attributes: keepPartialTimeBuckets(builder.fromAPIFormat(config)),
              },
            })
          ),
        ],
      };
    }
  );
};
