/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVIRONMENT_ALL_VALUE } from '@kbn/apm-types';
import type { DashboardPanel } from '@kbn/as-code-dashboard-schema';
import { LensConfigBuilder, lensApiConfigSchemaESQL } from '@kbn/lens-embeddable-utils';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import {
  EVENT_DEAD_CLICK,
  EVENT_ERROR_CLICK,
  EVENT_RAGE_CLICK,
} from '../../../../common/otel_data';
import { FRUSTRATION_DEFINITIONS } from '../../../utils/frustration_definitions';
import {
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
  type FrustrationQueryParams,
} from './frustration_esql';
import {
  buildFrustrationPanels,
  frustrationSectionConfigs,
  type FrustrationColors,
  type FrustrationLensConfig,
  type FrustrationPanelConfig,
} from './frustration_panels';

const params: FrustrationQueryParams = {
  serviceName: 'media-portal-web',
  environment: ENVIRONMENT_ALL_VALUE,
  sessionSource: 'events',
};

const colors: FrustrationColors = { rage: '#bd271e', dead: '#f5a700', error: '#6092c0' };

const GRID_COLUMNS = 48;

const allPanels = (withColors?: FrustrationColors): FrustrationPanelConfig[] =>
  frustrationSectionConfigs(params, withColors).flatMap(({ panels }) => panels);

const configsById = () => Object.fromEntries(allPanels(colors).map((panel) => [panel.id, panel]));

const dataLayerOf = (config: FrustrationLensConfig) => {
  if (config.type !== 'xy') {
    throw new Error('not an xy config');
  }
  const [layer] = config.layers;
  if (!('y' in layer)) {
    throw new Error('not a data layer');
  }
  return layer;
};

const esqlOf = (config: FrustrationLensConfig): string =>
  config.type === 'xy' ? dataLayerOf(config).data_source.query : config.data_source.query;

describe('frustrationSectionConfigs', () => {
  it('lists the sections in order, the breakdowns collapsed', () => {
    expect(
      frustrationSectionConfigs(params).map(({ id, title, collapsed }) => [id, title, collapsed])
    ).toEqual([
      ['frustration-overview', 'Overview', false],
      ['frustration-rage', 'Rage clicks', false],
      ['frustration-dead', 'Dead clicks', false],
      ['frustration-error', 'Error clicks', false],
      ['frustration-breakdowns', 'Breakdowns', true],
    ]);
  });

  it('defines each signal type in its section, as the Overview does', () => {
    const [overview, rage, dead, error, breakdowns] = frustrationSectionConfigs(params);
    expect(overview.text).toMatch(/^Frustration signals are/);
    expect([rage.text, dead.text, error.text]).toEqual([
      FRUSTRATION_DEFINITIONS.rage,
      FRUSTRATION_DEFINITIONS.dead,
      FRUSTRATION_DEFINITIONS.error,
    ]);
    expect(breakdowns.text).toBeUndefined();
  });

  it('lists the panels of each section in layout order with stable ids and titles', () => {
    expect(
      Object.fromEntries(
        frustrationSectionConfigs(params).map(({ id, panels }) => [
          id,
          panels.map(({ id: panelId, title, config }) => [panelId, title, config.type]),
        ])
      )
    ).toEqual({
      'frustration-overview': [
        ['frustration-signals-per-session', 'Signals per session', 'metric'],
        ['frustration-sessions', 'Frustrated sessions', 'metric'],
        ['frustration-rage-clicks-per-session', 'Rage clicks per session', 'metric'],
        ['frustration-dead-clicks-per-session', 'Dead clicks per session', 'metric'],
        ['frustration-error-clicks-per-session', 'Error clicks per session', 'metric'],
        ['frustration-over-time', 'Signals over time', 'xy'],
        ['frustration-sessions-by-signals', 'Sessions by signals per session', 'xy'],
        ['frustration-top-actions', 'Top actions with frustration signals', 'data_table'],
      ],
      'frustration-rage': [
        ['frustration-rage-clicks-per-page-view', 'Avg rage clicks per page view', 'metric'],
        ['frustration-rage-sessions', 'Sessions with rage clicks', 'metric'],
        ['frustration-rage-top-actions', 'Top actions with rage clicks', 'data_table'],
      ],
      'frustration-dead': [
        ['frustration-dead-clicks-per-page-view', 'Avg dead clicks per page view', 'metric'],
        ['frustration-dead-sessions', 'Sessions with dead clicks', 'metric'],
        ['frustration-dead-top-actions', 'Top actions with dead clicks', 'data_table'],
      ],
      'frustration-error': [
        ['frustration-error-clicks-per-page-view', 'Avg error clicks per page view', 'metric'],
        ['frustration-error-sessions', 'Sessions with error clicks', 'metric'],
        ['frustration-error-top-actions', 'Top actions with error clicks', 'data_table'],
        ['frustration-error-click-exceptions', 'Error clicks by exception', 'data_table'],
      ],
      'frustration-breakdowns': [
        ['frustration-by-version', 'Signals per session by app version', 'xy'],
        ['frustration-by-browser', 'Signals per session by browser', 'xy'],
        ['frustration-by-device', 'Signals per session by device', 'xy'],
      ],
    });
  });

  it('uses the title as the Lens title', () => {
    allPanels().forEach(({ title, config }) => {
      expect(config.title).toBe(title);
    });
  });

  it('is valid as-code ES|QL configs', () => {
    allPanels(colors).forEach(({ config }) => {
      expect(() => lensApiConfigSchemaESQL.parse(config)).not.toThrow();
    });
  });

  it.each([
    ['frustration-signals-per-session', signalsPerSessionQuery(params)],
    ['frustration-sessions', frustratedSessionsQuery(params)],
    ['frustration-rage-clicks-per-session', signalsPerSessionQuery(params, [EVENT_RAGE_CLICK])],
    ['frustration-dead-clicks-per-session', signalsPerSessionQuery(params, [EVENT_DEAD_CLICK])],
    ['frustration-error-clicks-per-session', signalsPerSessionQuery(params, [EVENT_ERROR_CLICK])],
    ['frustration-over-time', signalsOverTimeQuery(params)],
    ['frustration-sessions-by-signals', sessionsBySignalsQuery(params)],
    ['frustration-top-actions', topActionsQuery(params)],
    ['frustration-rage-clicks-per-page-view', signalsPerPageViewQuery(params, EVENT_RAGE_CLICK)],
    ['frustration-rage-sessions', frustratedSessionsQuery(params, [EVENT_RAGE_CLICK])],
    ['frustration-rage-top-actions', topActionsQuery(params, [EVENT_RAGE_CLICK])],
    ['frustration-dead-clicks-per-page-view', signalsPerPageViewQuery(params, EVENT_DEAD_CLICK)],
    ['frustration-dead-sessions', frustratedSessionsQuery(params, [EVENT_DEAD_CLICK])],
    ['frustration-dead-top-actions', topActionsQuery(params, [EVENT_DEAD_CLICK])],
    ['frustration-error-clicks-per-page-view', signalsPerPageViewQuery(params, EVENT_ERROR_CLICK)],
    ['frustration-error-sessions', frustratedSessionsQuery(params, [EVENT_ERROR_CLICK])],
    ['frustration-error-top-actions', topActionsQuery(params, [EVENT_ERROR_CLICK])],
    ['frustration-error-click-exceptions', errorClicksQuery(params)],
    ['frustration-by-version', signalsByVersionQuery(params)],
    ['frustration-by-browser', signalsByBrowserQuery(params)],
    ['frustration-by-device', signalsByDeviceQuery(params)],
  ])('%s runs the matching ES|QL query', (id, esql) => {
    expect(esqlOf(configsById()[id].config)).toBe(esql);
  });

  it('describes what every metric measures', () => {
    const metrics = allPanels(colors).filter(({ config }) => config.type === 'metric');

    expect(metrics).toHaveLength(11);
    metrics.forEach(({ description }) => expect(description).toEqual(expect.any(String)));
    expect(configsById()['frustration-sessions'].description).toBe(
      'The share of the sessions with at least one rage, dead or error click.'
    );
  });

  it('passes the session source to the queries', () => {
    const summaries: FrustrationQueryParams = { ...params, sessionSource: 'summaries' };
    const panelsById = Object.fromEntries(
      frustrationSectionConfigs(summaries)
        .flatMap(({ panels }) => panels)
        .map((panel) => [panel.id, panel])
    );

    expect(esqlOf(panelsById['frustration-sessions'].config)).toBe(
      frustratedSessionsQuery(summaries)
    );
    expect(esqlOf(panelsById['frustration-by-device'].config)).toBe(
      signalsByDeviceQuery(summaries)
    );
  });

  it.each([
    ['frustration-sessions', 'Frustrated'],
    ['frustration-rage-sessions', 'With rage clicks'],
    ['frustration-dead-sessions', 'With dead clicks'],
    ['frustration-error-sessions', 'With error clicks'],
  ])(
    '%s shows the sessions share as a percent with a decimal, with the count as secondary',
    (id, count) => {
      expect(configsById()[id].config).toMatchObject({
        metrics: [
          {
            type: 'primary',
            column: 'share',
            label: 'Share of sessions',
            format: { type: 'percent', decimals: 1 },
          },
          { type: 'secondary', column: 'frustrated', label: count },
        ],
      });
    }
  );

  it.each([
    ['frustration-signals-per-session', 'per_session', 'Signals'],
    ['frustration-rage-clicks-per-session', 'per_session', 'Rage clicks'],
    ['frustration-dead-clicks-per-session', 'per_session', 'Dead clicks'],
    ['frustration-error-clicks-per-session', 'per_session', 'Error clicks'],
    ['frustration-rage-clicks-per-page-view', 'per_view', 'Rage clicks'],
    ['frustration-dead-clicks-per-page-view', 'per_view', 'Dead clicks'],
    ['frustration-error-clicks-per-page-view', 'per_view', 'Error clicks'],
  ])(
    '%s shows the ratio with 2 decimals, without a label that repeats the title, and the count as secondary',
    (id, column, count) => {
      expect(configsById()[id].config).toMatchObject({
        styling: { secondary: { label: { visible: true } } },
        metrics: [
          { type: 'primary', column, label: '', format: { type: 'number', decimals: 2 } },
          { type: 'secondary', column: 'signals', label: count },
        ],
      });
    }
  );

  it('stacks rage, dead and error clicks in every stacked chart, with their labels and colors', () => {
    const charts = Object.values(configsById()).filter(
      ({ config }) => config.type === 'xy' && dataLayerOf(config).type !== 'bar'
    );
    expect(charts).toHaveLength(4);

    charts.forEach(({ config }) => {
      expect(dataLayerOf(config).type).toMatch(/^bar_(horizontal_)?stacked$/);
      expect(dataLayerOf(config).y).toEqual([
        { column: 'rage', label: 'Rage', color: { type: 'static', color: colors.rage } },
        { column: 'dead', label: 'Dead', color: { type: 'static', color: colors.dead } },
        { column: 'error', label: 'Error', color: { type: 'static', color: colors.error } },
      ]);
    });
  });

  it('leaves the series colors to Lens when none are given', () => {
    const { 'frustration-over-time': overTime } = Object.fromEntries(
      allPanels().map((panel) => [panel.id, panel])
    );

    expect(dataLayerOf(overTime.config).y.map((metric) => 'color' in metric)).toEqual([
      false,
      false,
      false,
    ]);
  });

  it('puts time on a temporal x axis and each dimension on its own', () => {
    const charts = Object.fromEntries(
      Object.entries(configsById())
        .filter(([, { config }]) => config.type === 'xy')
        .map(([id, { config }]) => [
          id,
          [
            dataLayerOf(config).x?.column,
            dataLayerOf(config).type,
            config.type === 'xy' && config.axis?.x?.scale,
          ],
        ])
    );

    expect(charts).toEqual({
      'frustration-over-time': ['time', 'bar_stacked', 'temporal'],
      'frustration-sessions-by-signals': ['bucket', 'bar', undefined],
      'frustration-by-version': ['version', 'bar_horizontal_stacked', undefined],
      'frustration-by-browser': ['browser', 'bar_horizontal_stacked', undefined],
      'frustration-by-device': ['device', 'bar_horizontal_stacked', undefined],
    });
  });

  it('charts the sessions per signal count as one series without a legend', () => {
    const { config } = configsById()['frustration-sessions-by-signals'];
    expect(dataLayerOf(config).y).toEqual([{ column: 'sessions', label: 'Sessions' }]);
    expect(config).toMatchObject({ legend: { visibility: 'hidden' } });
  });

  it('lists the type, element and page of the top actions, with a bar for their signals', () => {
    expect(configsById()['frustration-top-actions'].config).toMatchObject({
      type: 'data_table',
      rows: [
        { column: 'type', label: 'Type', width: 90 },
        { column: 'element', label: 'Element' },
        { column: 'page', label: 'Page' },
      ],
      metrics: [
        {
          column: 'signals',
          label: 'Signals',
          apply_color_to: 'progress_bar',
          color: { type: 'auto' },
          width: 180,
        },
        { column: 'sessions', label: 'Sessions', width: 90 },
        {
          column: 'per_view',
          label: 'Signals per page view',
          format: { type: 'number', decimals: 2 },
          width: 150,
        },
      ],
    });
  });

  it.each([
    ['rage', 'Rage clicks'],
    ['dead', 'Dead clicks'],
    ['error', 'Error clicks'],
  ] as const)('lists the page and element of the top %s actions, in its color', (type, label) => {
    expect(configsById()[`frustration-${type}-top-actions`].config).toMatchObject({
      rows: [
        { column: 'page', label: 'Page' },
        { column: 'element', label: 'Element' },
      ],
      metrics: [
        { column: 'signals', label, color: { type: 'static', color: colors[type] } },
        { column: 'sessions', label: 'Sessions' },
        {
          column: 'per_view',
          label: 'Signals per page view',
          format: { type: 'number', decimals: 2 },
        },
      ],
    });
  });

  it('lists the exception, message, signals and sessions in the table', () => {
    expect(configsById()['frustration-error-click-exceptions'].config).toMatchObject({
      type: 'data_table',
      rows: [
        { column: 'type', label: 'Exception' },
        { column: 'message', label: 'Message' },
      ],
      metrics: [
        { column: 'signals', label: 'Signals' },
        { column: 'sessions', label: 'Sessions' },
      ],
    });
  });

  it('fills the 48 columns of each row of each section without overlap', () => {
    frustrationSectionConfigs(params).forEach(({ panels }) => {
      const cells = new Set<string>();
      panels.forEach(({ grid: { x, y, w, h } }) => {
        expect(x + w).toBeLessThanOrEqual(GRID_COLUMNS);
        for (let row = y; row < y + h; row++) {
          for (let column = x; column < x + w; column++) {
            expect(cells.has(`${row}:${column}`)).toBe(false);
            cells.add(`${row}:${column}`);
          }
        }
      });
      const height = Math.max(...panels.map(({ grid: { y, h } }) => y + h));
      expect(cells.size).toBe(height * GRID_COLUMNS);
    });
  });
});

describe('buildFrustrationPanels', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const lensPanels = (): DashboardPanel[] =>
    buildFrustrationPanels(params, colors).flatMap(({ panels }) =>
      panels.filter(({ type }) => type === 'lens')
    );

  const attributesOf = (id: string): LensAttributes => {
    const config: unknown = lensPanels().find((candidate) => candidate.id === id)?.config;
    return (config as { attributes: LensAttributes }).attributes;
  };

  const textBasedLayers = (attributes: LensAttributes) =>
    Object.values(attributes.state.datasourceStates.textBased?.layers ?? {});

  const textBasedColumns = (attributes: LensAttributes) =>
    textBasedLayers(attributes).flatMap(({ columns }) => columns);

  it('gives a panel its description, which the dashboard shows as a tooltip by the title', () => {
    const configOf = (id: string): unknown =>
      lensPanels().find((candidate) => candidate.id === id)?.config;

    expect(configOf('frustration-rage-sessions')).toMatchObject({
      title: 'Sessions with rage clicks',
      description: 'The share of the sessions with at least one rage click.',
    });
    expect(configOf('frustration-over-time')).not.toHaveProperty('description');
  });

  it('builds one dashboard section per config, in order', () => {
    expect(
      buildFrustrationPanels(params, colors).map(({ id, title, collapsed, grid }) => ({
        id,
        title,
        collapsed,
        grid,
      }))
    ).toEqual(
      frustrationSectionConfigs(params, colors).map(({ id, title, collapsed }, index) => ({
        id,
        title,
        collapsed,
        grid: { y: index },
      }))
    );
  });

  it('opens a section with its text as a by-value markdown panel across the grid', () => {
    const [overview, rage, , , breakdowns] = buildFrustrationPanels(params, colors);

    expect(rage.panels[0]).toEqual({
      type: 'markdown',
      id: 'frustration-rage-text',
      grid: { x: 0, y: 0, w: 48, h: 3 },
      config: {
        content: FRUSTRATION_DEFINITIONS.rage,
        settings: { open_links_in_new_tab: true },
        hide_title: true,
      },
    });
    expect(overview.panels[0]).toMatchObject({ type: 'markdown', id: 'frustration-overview-text' });
    expect(breakdowns.panels.map(({ type }) => type)).toEqual(['lens', 'lens', 'lens']);
  });

  it('converts each config once into a lens panel below the text of its section', () => {
    const fromAPIFormat = jest.spyOn(LensConfigBuilder.prototype, 'fromAPIFormat');

    const sections = buildFrustrationPanels(params, colors);

    const expected = frustrationSectionConfigs(params, colors);
    expect(fromAPIFormat.mock.calls.map(([config]) => config)).toEqual(
      expected.flatMap(({ panels }) => panels.map(({ config }) => config))
    );
    sections.forEach((section, sectionIndex) => {
      const { text, panels } = expected[sectionIndex];
      const top = text ? 3 : 0;
      const built = section.panels.filter(({ type }) => type === 'lens');
      expect(built).toHaveLength(panels.length);
      built.forEach((panel, index) => {
        const { id, title, grid } = panels[index];
        expect(panel).toMatchObject({
          type: 'lens',
          grid: { ...grid, y: grid.y + top },
          id,
          config: { title, attributes: { title } },
        });
        expect(panel).not.toHaveProperty('uid');
        expect(panel.config).not.toHaveProperty('id');
      });
    });
  });

  it('throws when a config cannot be converted', () => {
    const failure = new Error('unsupported config');
    jest.spyOn(LensConfigBuilder.prototype, 'fromAPIFormat').mockImplementationOnce(() => {
      throw failure;
    });

    expect(() => buildFrustrationPanels(params)).toThrow(failure);
  });

  it('reads the dashboard time range through the @timestamp of the ES|QL layer', () => {
    const attributes = attributesOf('frustration-over-time');

    expect(textBasedLayers(attributes)).toEqual([
      expect.objectContaining({
        timeField: '@timestamp',
        query: { esql: signalsOverTimeQuery(params) },
      }),
    ]);
  });

  it('keeps the partial time bucket that Lens would drop, only on the time column', () => {
    expect(
      textBasedColumns(attributesOf('frustration-over-time')).map(
        ({ fieldName, meta, params: columnParams }) => [fieldName, meta?.type, columnParams]
      )
    ).toEqual([
      ['time', 'date', { dropPartials: false }],
      ['rage', 'number', undefined],
      ['dead', 'number', undefined],
      ['error', 'number', undefined],
    ]);
    expect(
      textBasedColumns(attributesOf('frustration-by-version')).some(
        ({ params: columnParams }) => columnParams?.dropPartials !== undefined
      )
    ).toBe(false);
  });

  it('stacks the bars, horizontally for the breakdowns, and labels the series', () => {
    const overTime = attributesOf('frustration-over-time');
    const byVersion = attributesOf('frustration-by-version');

    expect(overTime.visualizationType).toBe('lnsXY');
    expect(overTime.state.visualization).toMatchObject({
      layers: [{ seriesType: 'bar_stacked' }],
    });
    expect(byVersion.state.visualization).toMatchObject({
      layers: [{ seriesType: 'bar_horizontal_stacked' }],
    });
    expect(
      textBasedColumns(overTime)
        .filter(({ fieldName }) => ['rage', 'dead', 'error'].includes(fieldName))
        .map(({ fieldName, label, customLabel }) => [fieldName, label, customLabel])
    ).toEqual([
      ['rage', 'Rage', true],
      ['dead', 'Dead', true],
      ['error', 'Error', true],
    ]);
  });

  it('formats the frustrated share as a percent with a decimal and the ratios with 2 decimals', () => {
    const formatOf = (id: string, column: string) =>
      textBasedColumns(attributesOf(id)).find(({ fieldName }) => fieldName === column)?.params
        ?.format;

    expect(attributesOf('frustration-sessions').visualizationType).toBe('lnsMetric');
    expect(formatOf('frustration-sessions', 'share')).toMatchObject({
      id: 'percent',
      params: { decimals: 1 },
    });
    expect(formatOf('frustration-signals-per-session', 'per_session')).toMatchObject({
      id: 'number',
      params: { decimals: 2 },
    });
    expect(formatOf('frustration-top-actions', 'per_view')).toMatchObject({
      id: 'number',
      params: { decimals: 2 },
    });
  });

  it.each([
    ['frustration-top-actions', ['type', 'element', 'page', 'signals', 'sessions', 'per_view']],
    ['frustration-rage-top-actions', ['page', 'element', 'signals', 'sessions', 'per_view']],
    ['frustration-error-click-exceptions', ['type', 'message', 'signals', 'sessions']],
  ])('displays the %s table columns in order', (id, expectedColumns) => {
    const attributes = attributesOf(id);
    const fieldNameOf = (columnId: string) =>
      textBasedColumns(attributes).find((column) => column.columnId === columnId)?.fieldName;

    expect(attributes.visualizationType).toBe('lnsDatatable');
    const { columns } = attributes.state.visualization as { columns: Array<{ columnId: string }> };
    expect(columns.map(({ columnId }) => fieldNameOf(columnId))).toEqual(expectedColumns);
  });
});
