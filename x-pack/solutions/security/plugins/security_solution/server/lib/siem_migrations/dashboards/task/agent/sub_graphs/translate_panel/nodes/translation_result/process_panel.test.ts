/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { get } from 'lodash';
import type { ParsedPanel } from '../../../../../../../../../../common/siem_migrations/parsers/types';
import type { EsqlColumn } from '../../types';
import { processPanel } from './process_panel';

const readTemplate = (vizType: string): object => {
  const templatePath = path.join(__dirname, `./templates/${vizType}.viz.json`);
  return JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
};

const createParsedPanel = (overrides: Partial<ParsedPanel> = {}): ParsedPanel => ({
  id: 'panel-1',
  title: 'Test Panel',
  query: 'index=main | stats count by host, source',
  viz_type: 'bar_vertical_stacked',
  position: { x: 0, y: 0, w: 12, h: 6 },
  ...overrides,
});

const createColumns = (names: string[]): EsqlColumn[] =>
  names.map((name, index) => ({
    name,
    type: index === 0 ? 'long' : 'keyword',
  }));

describe('processPanel', () => {
  describe('configureStackedProperties - splitAccessors handling', () => {
    it('should not throw when line template has no splitAccessors and columns > 2', () => {
      const panel = readTemplate('line');
      const columns = createColumns(['count', 'host', 'timestamp']);
      const parsedPanel = createParsedPanel({ viz_type: 'line' });

      expect(() =>
        processPanel(
          panel,
          'FROM logs-* | STATS count=COUNT(*) BY host, @timestamp',
          columns,
          parsedPanel
        )
      ).not.toThrow();
    });

    it('should not throw when area_stacked template has no splitAccessors and columns > 2', () => {
      const panel = readTemplate('area_stacked');
      const columns = createColumns(['count', 'source', 'timestamp']);
      const parsedPanel = createParsedPanel({ viz_type: 'area_stacked' });

      expect(() =>
        processPanel(
          panel,
          'FROM logs-* | STATS count=COUNT(*) BY source, @timestamp',
          columns,
          parsedPanel
        )
      ).not.toThrow();
    });

    it('should not throw when bar_vertical_stacked template has no splitAccessors and columns === 2', () => {
      const panel = readTemplate('bar_vertical_stacked');
      const columns = createColumns(['count', 'host']);
      const parsedPanel = createParsedPanel({ viz_type: 'bar_vertical_stacked' });

      expect(() =>
        processPanel(panel, 'FROM logs-* | STATS count=COUNT(*) BY host', columns, parsedPanel)
      ).not.toThrow();
    });

    it('should not throw when bar_horizontal_stacked template has no splitAccessors and columns > 2', () => {
      const panel = readTemplate('bar_horizontal_stacked');
      const columns = createColumns(['count', 'source', 'timestamp']);
      const parsedPanel = createParsedPanel({ viz_type: 'bar_horizontal_stacked' });

      expect(() =>
        processPanel(
          panel,
          'FROM logs-* | STATS count=COUNT(*) BY source, @timestamp',
          columns,
          parsedPanel
        )
      ).not.toThrow();
    });

    it('should set splitAccessors for stacked chart with > 2 columns', () => {
      const panel = readTemplate('bar_vertical_stacked');
      const columns = createColumns(['count', 'source', 'timestamp']);
      const parsedPanel = createParsedPanel({ viz_type: 'bar_vertical_stacked' });

      const result = processPanel(
        panel,
        'FROM logs-* | STATS count=COUNT(*) BY source, @timestamp',
        columns,
        parsedPanel
      );

      expect(
        get(result, 'embeddableConfig.attributes.state.visualization.layers[0].splitAccessors[0]')
      ).toBe('source');
    });

    it('should set splitAccessors for stacked chart with exactly 2 columns', () => {
      const panel = readTemplate('area_stacked');
      const columns = createColumns(['count', 'host']);
      const parsedPanel = createParsedPanel({ viz_type: 'area_stacked' });

      const result = processPanel(
        panel,
        'FROM logs-* | STATS count=COUNT(*) BY host',
        columns,
        parsedPanel
      );

      expect(
        get(result, 'embeddableConfig.attributes.state.visualization.layers[0].splitAccessors[0]')
      ).toBe('host');
    });

    it('should set splitAccessors for line chart with > 2 columns', () => {
      const panel = readTemplate('line');
      const columns = createColumns(['count', 'host', 'timestamp']);
      const parsedPanel = createParsedPanel({ viz_type: 'line' });

      const result = processPanel(
        panel,
        'FROM logs-* | STATS count=COUNT(*) BY host, @timestamp',
        columns,
        parsedPanel
      );

      expect(
        get(result, 'embeddableConfig.attributes.state.visualization.layers[0].splitAccessors[0]')
      ).toBe('host');
    });
  });

  describe('basic panel processing', () => {
    it('should set title from parsedPanel', () => {
      const panel = readTemplate('table');
      const columns = createColumns(['count']);
      const parsedPanel = createParsedPanel({ viz_type: 'table', title: 'My Table' });

      const result = processPanel(
        panel,
        'FROM logs-* | STATS count=COUNT(*)',
        columns,
        parsedPanel
      );

      expect(get(result, 'title')).toBe('My Table');
    });

    it('should set gridData from parsedPanel position', () => {
      const panel = readTemplate('metric');
      const columns = createColumns(['count']);
      const parsedPanel = createParsedPanel({
        viz_type: 'metric',
        position: { x: 5, y: 10, w: 8, h: 4 },
      });

      const result = processPanel(
        panel,
        'FROM logs-* | STATS count=COUNT(*)',
        columns,
        parsedPanel
      );

      expect(get(result, 'gridData')).toEqual({
        x: 5,
        y: 10,
        w: 8,
        h: 4,
        i: 'panel-1',
        sectionId: undefined,
      });
    });

    it('should not mutate the original panel template', () => {
      const panel = readTemplate('line');
      const originalJSON = JSON.stringify(panel);
      const columns = createColumns(['count', 'host']);
      const parsedPanel = createParsedPanel({ viz_type: 'line' });

      processPanel(panel, 'FROM logs-* | STATS count=COUNT(*) BY host', columns, parsedPanel);

      expect(JSON.stringify(panel)).toBe(originalJSON);
    });
  });
});
