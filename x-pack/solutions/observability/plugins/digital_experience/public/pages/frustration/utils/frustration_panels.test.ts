/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVIRONMENT_ALL_VALUE } from '@kbn/apm-types';
import { LensConfigBuilder, lensApiConfigSchemaESQL } from '@kbn/lens-embeddable-utils';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
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
import {
  buildFrustrationPanels,
  frustrationPanelConfigs,
  type FrustrationColors,
  type FrustrationLensConfig,
} from './frustration_panels';

const params: FrustrationQueryParams = {
  serviceName: 'media-portal-web',
  environment: ENVIRONMENT_ALL_VALUE,
};

const colors: FrustrationColors = { rage: '#bd271e', dead: '#f5a700', error: '#6092c0' };

const GRID_COLUMNS = 48;

const configsById = () =>
  Object.fromEntries(frustrationPanelConfigs(params, colors).map((panel) => [panel.id, panel]));

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

describe('frustrationPanelConfigs', () => {
  it('lists the panels in layout order with stable ids and titles', () => {
    expect(
      frustrationPanelConfigs(params).map(({ id, title, config }) => [id, title, config.type])
    ).toEqual([
      ['frustration-signals', 'Frustration signals', 'metric'],
      ['frustration-sessions', 'Frustrated sessions', 'metric'],
      ['frustration-rage-clicks', 'Rage clicks', 'metric'],
      ['frustration-dead-clicks', 'Dead clicks', 'metric'],
      ['frustration-error-clicks', 'Error clicks', 'metric'],
      ['frustration-over-time', 'Signals over time', 'xy'],
      ['frustration-by-version', 'Signals by app version', 'xy'],
      ['frustration-by-browser', 'Signals by browser', 'xy'],
      ['frustration-by-device', 'Signals by device', 'xy'],
      ['frustration-error-click-exceptions', 'Error clicks by exception', 'data_table'],
    ]);
  });

  it('uses the title as the Lens title', () => {
    frustrationPanelConfigs(params).forEach(({ title, config }) => {
      expect(config.title).toBe(title);
    });
  });

  it('is valid as-code ES|QL configs', () => {
    frustrationPanelConfigs(params, colors).forEach(({ config }) => {
      expect(() => lensApiConfigSchemaESQL.parse(config)).not.toThrow();
    });
  });

  it.each([
    ['frustration-signals', signalsQuery(params)],
    ['frustration-sessions', frustratedSessionsQuery(params)],
    ['frustration-rage-clicks', signalsOfTypeQuery(params, EVENT_RAGE_CLICK)],
    ['frustration-dead-clicks', signalsOfTypeQuery(params, EVENT_DEAD_CLICK)],
    ['frustration-error-clicks', signalsOfTypeQuery(params, EVENT_ERROR_CLICK)],
    ['frustration-over-time', signalsOverTimeQuery(params)],
    ['frustration-by-version', signalsByVersionQuery(params)],
    ['frustration-by-browser', signalsByBrowserQuery(params)],
    ['frustration-by-device', signalsByDeviceQuery(params)],
    ['frustration-error-click-exceptions', errorClicksQuery(params)],
  ])('%s runs the matching ES|QL query', (id, esql) => {
    expect(esqlOf(configsById()[id].config)).toBe(esql);
  });

  it('shows the frustrated sessions share as a whole percent, with the count as the secondary metric', () => {
    expect(configsById()['frustration-sessions'].config).toMatchObject({
      metrics: [
        {
          type: 'primary',
          column: 'share',
          label: 'Share of sessions',
          format: { type: 'percent', decimals: 0 },
        },
        { type: 'secondary', column: 'frustrated', label: 'Frustrated' },
      ],
    });
  });

  it('leaves the count metrics without a label, as the panel title names them', () => {
    [
      'frustration-signals',
      'frustration-rage-clicks',
      'frustration-dead-clicks',
      'frustration-error-clicks',
    ].forEach((id) => {
      expect(configsById()[id].config).toMatchObject({
        metrics: [{ type: 'primary', column: 'signals', label: '' }],
      });
    });
  });

  it('stacks rage, dead and error clicks in every chart, with their labels and colors', () => {
    const charts = Object.values(configsById()).filter(({ config }) => config.type === 'xy');
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
      frustrationPanelConfigs(params).map((panel) => [panel.id, panel])
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
      'frustration-by-version': ['version', 'bar_horizontal_stacked', undefined],
      'frustration-by-browser': ['browser', 'bar_horizontal_stacked', undefined],
      'frustration-by-device': ['device', 'bar_horizontal_stacked', undefined],
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

  it('lays the panels out in rows of the 48 column grid without overlap', () => {
    const rows = new Map<number, Array<{ x: number; w: number; h: number }>>();
    frustrationPanelConfigs(params).forEach(({ grid }) => {
      rows.set(grid.y, [...(rows.get(grid.y) ?? []), grid]);
    });

    expect([...rows.keys()]).toEqual([0, 7, 21, 35]);
    expect([...rows.values()].map((row) => row.map(({ h }) => h))).toEqual([
      [7, 7, 7, 7, 7],
      [14],
      [14, 14, 14],
      [14],
    ]);

    rows.forEach((row) => {
      const sorted = [...row].sort((a, b) => a.x - b.x);
      sorted.forEach(({ x, w }, index) => {
        expect(x + w).toBeLessThanOrEqual(index + 1 < sorted.length ? sorted[index + 1].x : 49);
      });
      expect(sorted.reduce((sum, { w }) => sum + w, 0)).toBe(GRID_COLUMNS);
      expect(sorted[0].x).toBe(0);
    });
  });

  it('sizes the breakdown charts 24, 12 and 12 columns wide', () => {
    const { 'frustration-by-version': version, ...rest } = configsById();

    expect(version.grid).toMatchObject({ x: 0, w: 24 });
    expect(rest['frustration-by-browser'].grid).toMatchObject({ x: 24, w: 12 });
    expect(rest['frustration-by-device'].grid).toMatchObject({ x: 36, w: 12 });
  });
});

describe('buildFrustrationPanels', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const attributesOf = (id: string): LensAttributes => {
    const panel = buildFrustrationPanels(params, colors).find((candidate) => candidate.id === id);
    const config: unknown = panel?.config;
    return (config as { attributes: LensAttributes }).attributes;
  };

  const textBasedLayers = (attributes: LensAttributes) =>
    Object.values(attributes.state.datasourceStates.textBased?.layers ?? {});

  const textBasedColumns = (attributes: LensAttributes) =>
    textBasedLayers(attributes).flatMap(({ columns }) => columns);

  it('converts each config once into a lens panel of the dashboard', () => {
    const fromAPIFormat = jest.spyOn(LensConfigBuilder.prototype, 'fromAPIFormat');

    const panels = buildFrustrationPanels(params, colors);

    const expected = frustrationPanelConfigs(params, colors);
    expect(fromAPIFormat.mock.calls.map(([config]) => config)).toEqual(
      expected.map(({ config }) => config)
    );
    expect(panels).toHaveLength(expected.length);
    panels.forEach((panel, index) => {
      const { id, title, grid } = expected[index];
      expect(panel).toMatchObject({
        type: 'lens',
        grid,
        id,
        config: { title, attributes: { title } },
      });
      expect(panel).not.toHaveProperty('uid');
      expect(panel.config).not.toHaveProperty('id');
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

  it('formats the frustrated share as a whole percent', () => {
    const attributes = attributesOf('frustration-sessions');

    expect(attributes.visualizationType).toBe('lnsMetric');
    expect(
      textBasedColumns(attributes).find(({ fieldName }) => fieldName === 'share')
    ).toMatchObject({
      label: 'Share of sessions',
      customLabel: true,
      params: { format: { id: 'percent', params: { decimals: 0 } } },
    });
  });

  it('displays the exceptions table columns in order', () => {
    const attributes = attributesOf('frustration-error-click-exceptions');
    const fieldNameOf = (columnId: string) =>
      textBasedColumns(attributes).find((column) => column.columnId === columnId)?.fieldName;

    expect(attributes.visualizationType).toBe('lnsDatatable');
    const { columns } = attributes.state.visualization as { columns: Array<{ columnId: string }> };
    expect(columns.map(({ columnId }) => fieldNameOf(columnId))).toEqual([
      'type',
      'message',
      'signals',
      'sessions',
    ]);
  });
});
