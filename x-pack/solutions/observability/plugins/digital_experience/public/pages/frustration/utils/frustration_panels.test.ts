/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVIRONMENT_ALL_VALUE } from '@kbn/apm-types';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
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
} from './frustration_panels';

const params: FrustrationQueryParams = {
  serviceName: 'media-portal-web',
  environment: ENVIRONMENT_ALL_VALUE,
};

const colors: FrustrationColors = { rage: '#bd271e', dead: '#f5a700', error: '#6092c0' };

const GRID_COLUMNS = 48;

const dataViewsStub = {
  get: jest.fn(),
  create: jest.fn(async (spec: { id: string; title: string; timeFieldName: string }) => ({
    ...spec,
    toSpec: () => spec,
  })),
} as unknown as DataViewsPublicPluginStart;

const configsById = () =>
  Object.fromEntries(frustrationPanelConfigs(params).map((panel) => [panel.id, panel]));

describe('frustrationPanelConfigs', () => {
  it('lists the panels in layout order with stable ids and titles', () => {
    expect(
      frustrationPanelConfigs(params).map(({ id, title, config }) => [id, title, config.chartType])
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
      ['frustration-error-click-exceptions', 'Error clicks by exception', 'table'],
    ]);
  });

  it('uses the title as the Lens title', () => {
    frustrationPanelConfigs(params).forEach(({ title, config }) => {
      expect(config.title).toBe(title);
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
    expect(configsById()[id].config.dataset).toEqual({ esql });
  });

  it('shows the frustrated sessions share, with the count as the secondary metric', () => {
    const { config, appearance } = configsById()['frustration-sessions'];

    expect(config).toMatchObject({ value: 'share', querySecondaryMetric: 'frustrated' });
    expect(appearance?.columns).toEqual({
      share: { percent: true, label: 'Share of sessions' },
      frustrated: { label: 'Frustrated' },
    });
  });

  it('labels the count of the other metrics', () => {
    expect(configsById()['frustration-rage-clicks'].appearance?.columns).toEqual({
      signals: { label: 'Signals' },
    });
  });

  it('stacks rage, dead and error clicks in every chart, with their labels and colors', () => {
    const panels = frustrationPanelConfigs(params, colors).filter(
      ({ config }) => config.chartType === 'xy'
    );
    expect(panels).toHaveLength(4);

    panels.forEach(({ config, appearance }) => {
      expect(config).toMatchObject({
        layers: [
          {
            type: 'series',
            seriesType: 'bar',
            yAxis: [
              { value: 'rage', seriesColor: colors.rage },
              { value: 'dead', seriesColor: colors.dead },
              { value: 'error', seriesColor: colors.error },
            ],
          },
        ],
      });
      expect(appearance?.columns).toMatchObject({
        rage: { label: 'Rage' },
        dead: { label: 'Dead' },
        error: { label: 'Error' },
      });
      expect(appearance?.stacked).toBeDefined();
    });
  });

  it('leaves the series colors to Lens when none are given', () => {
    const { config } = configsById()['frustration-over-time'];

    expect(config).toMatchObject({
      layers: [{ yAxis: [{ seriesColor: undefined }, {}, {}] }],
    });
  });

  it('puts time on the x axis and each dimension on its own', () => {
    const xAxes = Object.fromEntries(
      Object.entries(configsById())
        .filter(([, { config }]) => config.chartType === 'xy')
        .map(([id, { config }]) => [
          id,
          config.chartType === 'xy' && config.layers[0].type === 'series'
            ? config.layers[0].xAxis
            : undefined,
        ])
    );

    expect(xAxes).toEqual({
      'frustration-over-time': { type: 'dateHistogram', field: 'time' },
      'frustration-by-version': 'version',
      'frustration-by-browser': 'browser',
      'frustration-by-device': 'device',
    });
  });

  it('lists the exception, message, signals and sessions in the table', () => {
    const { config } = configsById()['frustration-error-click-exceptions'];

    expect(config).toMatchObject({
      chartType: 'table',
      value: 'type',
      breakdown: ['message', 'signals', 'sessions'],
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

  it('builds each config once into a lens panel of the dashboard', async () => {
    const panels = await buildFrustrationPanels(dataViewsStub, params, colors);

    const expected = frustrationPanelConfigs(params, colors);
    expect(panels).toHaveLength(expected.length);
    panels.forEach((panel, index) => {
      const { id, title, grid } = expected[index];
      expect(panel).toMatchObject({
        type: 'lens',
        grid,
        uid: id,
        config: { id, title, attributes: { title } },
      });
    });
  });

  it('builds every config once, with its ES|QL query', async () => {
    const build = jest.spyOn(LensConfigBuilder.prototype, 'build');

    await buildFrustrationPanels(dataViewsStub, params);

    const expected = frustrationPanelConfigs(params);
    expect(build).toHaveBeenCalledTimes(expected.length);
    expected.forEach(({ config }, index) => {
      expect(build.mock.calls[index]).toEqual([config, { query: { esql: config.dataset.esql } }]);
    });
  });

  it('rejects when a config cannot be built', async () => {
    const failure = new Error('no data view');
    jest.spyOn(LensConfigBuilder.prototype, 'build').mockRejectedValueOnce(failure);

    await expect(buildFrustrationPanels(dataViewsStub, params)).rejects.toThrow(failure);
  });
});

describe('built attributes', () => {
  const attributesOf = async (id: string): Promise<LensAttributes> => {
    const panels = await buildFrustrationPanels(dataViewsStub, params, colors);
    const panel = panels.find((candidate) => 'uid' in candidate && candidate.uid === id);
    const config: unknown = panel && 'config' in panel ? panel.config : undefined;
    return (config as { attributes: LensAttributes }).attributes;
  };

  const textBasedColumns = (attributes: LensAttributes) =>
    Object.values(attributes.state.datasourceStates.textBased?.layers ?? {}).flatMap(
      ({ columns }) => columns
    );

  it('reads the dashboard time range through @timestamp', async () => {
    const attributes = await attributesOf('frustration-over-time');

    expect(dataViewsStub.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'logs-*.otel-*', timeFieldName: '@timestamp' })
    );
    expect(attributes.state.datasourceStates.textBased?.layers).toBeDefined();
    expect(Object.values(attributes.state.datasourceStates.textBased?.layers ?? {})).toEqual([
      expect.objectContaining({ query: { esql: signalsOverTimeQuery(params) } }),
    ]);
  });

  it('stacks the bars and labels the series', async () => {
    const attributes = await attributesOf('frustration-over-time');

    expect(attributes.visualizationType).toBe('lnsXY');
    expect(attributes.state.visualization).toMatchObject({
      preferredSeriesType: 'bar_stacked',
      layers: [{ seriesType: 'bar_stacked' }],
    });
    expect(
      textBasedColumns(attributes)
        .filter(({ fieldName }) => ['rage', 'dead', 'error'].includes(fieldName))
        .map(({ fieldName, label, customLabel }) => [fieldName, label, customLabel])
    ).toEqual([
      ['rage', 'Rage', true],
      ['dead', 'Dead', true],
      ['error', 'Error', true],
    ]);
  });

  it('draws the breakdown bars horizontally', async () => {
    const attributes = await attributesOf('frustration-by-version');

    expect(attributes.state.visualization).toMatchObject({
      layers: [{ seriesType: 'bar_horizontal_stacked' }],
    });
  });

  it('formats the frustrated share as a whole percent', async () => {
    const attributes = await attributesOf('frustration-sessions');

    expect(attributes.visualizationType).toBe('lnsMetric');
    expect(textBasedColumns(attributes).find(({ fieldName }) => fieldName === 'share')).toEqual(
      expect.objectContaining({
        label: 'Share of sessions',
        customLabel: true,
        params: { format: { id: 'percent', params: { decimals: 0 } } },
      })
    );
  });

  it('builds the exceptions table', async () => {
    const attributes = await attributesOf('frustration-error-click-exceptions');

    expect(attributes.visualizationType).toBe('lnsDatatable');
    expect(textBasedColumns(attributes).map(({ fieldName }) => fieldName)).toEqual([
      'message',
      'signals',
      'sessions',
      'type',
    ]);
  });
});
