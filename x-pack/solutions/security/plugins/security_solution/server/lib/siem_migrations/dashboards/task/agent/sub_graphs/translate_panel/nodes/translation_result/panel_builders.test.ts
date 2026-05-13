/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isLensAPIFormat,
  LensConfigBuilder,
  lensApiConfigSchema,
} from '@kbn/lens-embeddable-utils';
import type { ParsedPanel } from '../../../../../../../../../../common/siem_migrations/parsers/types';
import type { EsqlColumn } from '../../types';
import {
  assignColumnRoles,
  buildDashboardPanelForVizType,
  buildGaugePanel,
  buildGrid,
  buildHeatmapPanel,
  buildMetricPanel,
  buildPiePanel,
  buildTablePanel,
  buildTreemapPanel,
  buildXYPanel,
  savedDashboardRowToDashboardPanel,
} from './panel_builders';
import type { XYVizType } from './panel_builders';

const createParsedPanel = (overrides: Partial<ParsedPanel> = {}): ParsedPanel => ({
  id: 'panel-1',
  title: 'Test Panel',
  query: 'index=main | stats count by host, timestamp',
  viz_type: 'bar_vertical',
  position: { x: 1, y: 2, w: 12, h: 6 },
  ...overrides,
});

const createColumns = (names: string[]): EsqlColumn[] =>
  names.map((name, index) => ({
    name,
    type: index === 0 ? 'long' : 'keyword',
  }));

const xyCases: Array<readonly [XYVizType, string]> = [
  ['bar_vertical', 'bar'],
  ['bar_vertical_stacked', 'bar_stacked'],
  ['bar_horizontal', 'bar_horizontal'],
  ['bar_horizontal_stacked', 'bar_horizontal_stacked'],
  ['area', 'area'],
  ['area_stacked', 'area_stacked'],
  ['line', 'line'],
];

describe('panel_builders', () => {
  describe('assignColumnRoles', () => {
    it('maps empty columns to undefined roles', () => {
      expect(assignColumnRoles([])).toEqual({
        metricCol: undefined,
        breakdownCol: undefined,
        xCol: undefined,
      });
    });

    it('maps single column to metric and x', () => {
      expect(assignColumnRoles([{ name: 'count', type: 'long' }])).toEqual({
        metricCol: 'count',
        xCol: 'count',
        breakdownCol: undefined,
      });
    });

    it('maps three columns to metric, breakdown, x', () => {
      expect(
        assignColumnRoles([
          { name: 'count', type: 'long' },
          { name: 'source', type: 'keyword' },
          { name: 'timestamp', type: 'keyword' },
        ])
      ).toEqual({
        metricCol: 'count',
        breakdownCol: 'source',
        xCol: 'timestamp',
      });
    });
  });

  describe('buildGrid', () => {
    it('maps parsed panel position to dashboard grid', () => {
      expect(buildGrid(createParsedPanel())).toEqual({ x: 1, y: 2, w: 12, h: 6 });
    });
  });

  describe('savedDashboardRowToDashboardPanel', () => {
    it('converts legacy lens row to DashboardPanel shape', () => {
      const legacy = {
        type: 'lens',
        gridData: { x: 1, y: 2, w: 12, h: 6, i: 'pid-1' },
        panelIndex: 'pid-1',
        title: 'T',
        embeddableConfig: {
          attributes: {
            type: 'lens',
            visualizationType: 'lnsXY',
            state: {},
          },
        },
      };
      const panel = savedDashboardRowToDashboardPanel(legacy);
      expect(panel.type).toBe('lens');
      expect(panel.id).toBe('pid-1');
      expect(panel.grid).toEqual({ x: 1, y: 2, w: 12, h: 6 });
      expect(panel.config).not.toHaveProperty(['attributes', 'type']);
    });
  });

  describe('buildDashboardPanelForVizType - XY', () => {
    const query = 'FROM logs-* | STATS count=COUNT(*) BY host, timestamp';

    it.each(xyCases)('maps %s to Lens XY series type %s', (vizType, seriesType) => {
      const isStacked = vizType.includes('stacked');
      const panel = buildDashboardPanelForVizType(
        vizType,
        query,
        createColumns(['count', 'timestamp']),
        createParsedPanel({ viz_type: vizType })
      );

      expect(panel.type).toBe('lens');
      expect(panel.id).toBe('panel-1');
      expect(panel.grid).toEqual({ x: 1, y: 2, w: 12, h: 6 });
      expect(panel.config).toMatchObject({
        type: 'xy',
        title: 'Test Panel',
        layers: [
          {
            type: seriesType,
            data_source: { type: 'esql', query },
            ignore_global_filters: false,
            sampling: 1,
            ...(isStacked
              ? { breakdown_by: { column: 'timestamp' } }
              : { x: { column: 'timestamp' } }),
            y: [{ column: 'count' }],
          },
        ],
      });
    });

    it('adds breakdown_by when three ES|QL columns are available', () => {
      const panel = buildDashboardPanelForVizType(
        'line',
        query,
        createColumns(['count', 'host', 'timestamp']),
        createParsedPanel({ viz_type: 'line' })
      );
      expect(panel.config).toHaveProperty(['layers', 0, 'breakdown_by'], { column: 'host' });
    });

    it('omits breakdown_by for two-column non-stacked XY panels', () => {
      const panel = buildDashboardPanelForVizType(
        'bar_vertical',
        query,
        createColumns(['count', 'timestamp']),
        createParsedPanel({ viz_type: 'bar_vertical' })
      );
      expect(panel.config).not.toHaveProperty(['layers', 0, 'breakdown_by']);
    });

    it('throws when XY panel dimensions cannot be inferred', () => {
      expect(() =>
        buildDashboardPanelForVizType(
          'area',
          query,
          [],
          createParsedPanel({ viz_type: 'area', title: 'Empty panel' })
        )
      ).toThrow('Cannot build XY Lens panel "Empty panel" without a metric column');
    });

    it('uses the second column as breakdown for two-column stacked XY panels', () => {
      const panel = buildXYPanel(
        'bar_vertical_stacked',
        query,
        createColumns(['count', 'host']),
        createParsedPanel({ viz_type: 'bar_vertical_stacked' })
      );

      expect(panel.config).toMatchObject({
        layers: [
          {
            y: [{ column: 'count' }],
            breakdown_by: { column: 'host' },
          },
        ],
      });
      expect(panel.config).not.toHaveProperty(['layers', 0, 'x']);
    });
  });

  describe('non-XY Lens builders', () => {
    const query = 'FROM logs-* | STATS count=COUNT(*) BY host, timestamp';

    it('builds metric panels', () => {
      const panel = buildMetricPanel(
        query,
        createColumns(['count', 'host', 'timestamp']),
        createParsedPanel({ viz_type: 'metric' })
      );

      expect(panel.config).toMatchObject({
        type: 'metric',
        title: 'Test Panel',
        data_source: { type: 'esql', query },
        metrics: [{ type: 'primary', column: 'count' }],
        breakdown_by: { column: 'host' },
      });
    });

    it('builds gauge panels', () => {
      const panel = buildGaugePanel(
        query,
        createColumns(['count']),
        createParsedPanel({ viz_type: 'gauge' })
      );

      expect(panel.config).toMatchObject({
        type: 'gauge',
        metric: { column: 'count' },
      });
    });

    it.each([
      ['pie', false, undefined],
      ['donut', true, { donut_hole: 'm' }],
    ] as const)('builds %s panels', (vizType, isDonut, styling) => {
      const panel = buildPiePanel(
        query,
        createColumns(['count', 'timestamp']),
        createParsedPanel({ viz_type: vizType }),
        isDonut
      );

      expect(panel.config).toMatchObject({
        type: 'pie',
        metrics: [{ column: 'count' }],
        group_by: [{ column: 'timestamp' }],
        ...(styling ? { styling } : {}),
      });
    });

    it('builds heatmap panels', () => {
      const panel = buildHeatmapPanel(
        query,
        createColumns(['count', 'host', 'timestamp']),
        createParsedPanel({ viz_type: 'heatmap' })
      );

      expect(panel.config).toMatchObject({
        type: 'heatmap',
        metric: { column: 'count' },
        x: { column: 'timestamp' },
        y: { column: 'host' },
      });
    });

    it('builds treemap panels', () => {
      const panel = buildTreemapPanel(
        query,
        createColumns(['count', 'host', 'timestamp']),
        createParsedPanel({ viz_type: 'treemap' })
      );

      expect(panel.config).toMatchObject({
        type: 'treemap',
        metrics: [{ column: 'count' }],
        group_by: [{ column: 'host' }, { column: 'timestamp' }],
      });
    });

    it('builds table panels', () => {
      const panel = buildTablePanel(
        query,
        createColumns(['count', 'host']),
        createParsedPanel({ viz_type: 'table' })
      );

      expect(panel.config).toMatchObject({
        type: 'data_table',
        metrics: [{ column: 'count' }, { column: 'host' }],
      });
    });

    it('builds configs accepted by the Lens API format converter', () => {
      const panel = buildHeatmapPanel(
        query,
        createColumns(['count', 'host', 'timestamp']),
        createParsedPanel({ viz_type: 'heatmap' })
      );

      expect(isLensAPIFormat(panel.config)).toBe(true);
      if (!isLensAPIFormat(panel.config)) {
        throw new Error('Expected generated panel config to be Lens API format');
      }

      expect(() => lensApiConfigSchema.validate(panel.config)).not.toThrow();
      expect(new LensConfigBuilder().fromAPIFormat(panel.config).visualizationType).toBe(
        'lnsHeatmap'
      );
    });
  });
});
