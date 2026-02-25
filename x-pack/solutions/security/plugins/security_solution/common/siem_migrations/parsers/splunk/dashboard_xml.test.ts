/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SplunkXmlDashboardParser } from './dashboard_xml';
import type { VizType } from '../types';

describe('SplunkXmlDashboardParser', () => {
  const createBasicXml = (
    content: string,
    rootNode: 'dashboard' | 'form' = 'dashboard',
    version: '1.1' | 2 = '1.1'
  ) => {
    const innerContent = `
      <label>Test Dashboard</label>
      <row>
        ${content}
      </row>

`;
    if (rootNode === 'form') {
      return `
          <form version=\"1.1\">
              ${innerContent}
          </form>
        `;
    } else if (rootNode === 'dashboard') {
      if (version === 2) {
        return `
      <?xml version=\"1.0\" encoding=\"UTF-8\"?>
      <dashboard version=2>
        ${innerContent}
      </dashboard>
    `;
      } else {
        return `
    <?xml version=\"1.0\" encoding=\"UTF-8\"?>
    <dashboard script="./some_script.js" version="1.1">
      ${innerContent}
    </dashboard>
`;
      }
    }

    return `
    <?xml version=\"1.0\" encoding=\"UTF-8\"?>
    <${rootNode} version="${version}">
      ${innerContent}
    </${rootNode}>
`;
  };

  const createPanelXml = (
    title: string,
    query: string,
    chartType?: string,
    stackMode?: string,
    overlayMode?: string,
    hasMetric?: boolean
  ) => {
    const chartElement = chartType ? `<chart type="${chartType}"></chart>` : '';
    const vizElement = chartType ? `<viz type="${chartType}"></viz>` : '';
    const chartOption = chartType ? `<option name="charting.chart">${chartType}</option>` : '';
    const stackOption = stackMode
      ? `<option name="charting.chart.stackMode">${stackMode}</option>`
      : '';
    const overlayOption = overlayMode
      ? `<option name="dataOverlayMode">${overlayMode}</option>`
      : '';
    const metricElement = hasMetric ? '<single>some metric content</single>' : '';

    return `
      <panel>
        <title>${title}</title>
        <search>
          <query>${query}</query>
        </search>
        ${chartElement}
        ${vizElement}
        ${chartOption}
        ${stackOption}
        ${overlayOption}
        ${metricElement}
      </panel>
    `;
  };

  describe('extractPanels', () => {
    it('should extract basic panel information', async () => {
      const xml = createBasicXml(createPanelXml('Test Panel', 'index=main | stats count by host'));
      const parser = new SplunkXmlDashboardParser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(1);
      expect(panels[0]).toMatchObject({
        title: 'Test Panel',
        query: 'index=main | stats count by host',
        viz_type: 'table', // default
        position: { x: 0, y: 0, w: 48, h: 16 },
      });
      expect(panels[0].id).toBeDefined();
    });

    it('should handle multiple panels in a row', async () => {
      const xml = createBasicXml(
        createPanelXml('Panel 1', 'index=main | stats count') +
          createPanelXml('Panel 2', 'index=app | stats sum(bytes)')
      );
      const parser = new SplunkXmlDashboardParser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(2);
      expect(panels[0].title).toBe('Panel 1');
      expect(panels[1].title).toBe('Panel 2');

      // Check position calculation
      expect(panels[0].position).toEqual({ x: 0, y: 0, w: 24, h: 16 });
      expect(panels[1].position).toEqual({ x: 24, y: 0, w: 24, h: 16 });
    });

    it('should generate fallback titles for panels without titles', async () => {
      const xml = createBasicXml(`
        <panel>
          <search>
            <query>index=main | stats count</query>
          </search>
        </panel>
      `);
      const parser = new SplunkXmlDashboardParser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(1);
      expect(panels[0].title).toBe('Untitled Panel 0');
    });

    it('should skip panels without queries', async () => {
      const xml = createBasicXml(`
        <panel>
          <title>Panel without query</title>
        </panel>
      `);
      const parser = new SplunkXmlDashboardParser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(0);
    });

    describe('chart type mapping', () => {
      const testChartType = async (
        chartType: string,
        expectedVizType: VizType,
        stackMode?: string,
        overlayMode?: string,
        hasMetric?: boolean
      ) => {
        const xml = createBasicXml(
          createPanelXml('Test', 'index=main', chartType, stackMode, overlayMode, hasMetric)
        );
        const parser = new SplunkXmlDashboardParser(xml);
        const panels = await parser.extractPanels();
        return panels[0]?.viz_type;
      };

      it('should map bar chart types correctly', async () => {
        expect(await testChartType('bar', 'bar_horizontal')).toBe('bar_horizontal');
        expect(await testChartType('column', 'bar_vertical')).toBe('bar_vertical');
      });

      it('should map stacked chart types correctly', async () => {
        expect(await testChartType('bar', 'bar_horizontal_stacked', 'stacked')).toBe(
          'bar_horizontal_stacked'
        );
        expect(await testChartType('column', 'bar_vertical_stacked', 'stacked')).toBe(
          'bar_vertical_stacked'
        );
        expect(await testChartType('area', 'area_stacked', 'stacked')).toBe('area_stacked');
      });

      it('should map special chart types correctly', async () => {
        expect(await testChartType('pie', 'pie')).toBe('pie');
        expect(await testChartType('line', 'line')).toBe('line');
        expect(await testChartType('area', 'area')).toBe('area');
        expect(await testChartType('donut', 'donut')).toBe('donut');
        expect(await testChartType('radialGauge', 'gauge')).toBe('gauge');
        expect(await testChartType('treemap', 'treemap')).toBe('treemap');
      });

      it('should map heatmap overlay mode correctly', async () => {
        expect(await testChartType('table', 'heatmap', undefined, 'heatmap')).toBe('heatmap');
      });

      it('should map metric type correctly', async () => {
        expect(await testChartType('table', 'metric', undefined, undefined, true)).toBe('metric');
      });

      it('should default to table for unknown types', async () => {
        expect(await testChartType('unknown', 'table')).toBe('table');
      });
    });

    it('should handle multiple rows', async () => {
      const xml = `
        <dashboard>
          <label>Multi-row Dashboard</label>
          <row>
            ${createPanelXml('Row 1 Panel 1', 'index=main')}
          </row>
          <row>
            ${createPanelXml('Row 2 Panel 1', 'index=app')}
            ${createPanelXml('Row 2 Panel 2', 'index=web')}
          </row>
        </dashboard>
      `;
      const parser = new SplunkXmlDashboardParser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(3);

      // Check row positioning
      expect(panels[0].position.y).toBe(0); // Row 1
      expect(panels[1].position.y).toBe(16); // Row 2
      expect(panels[2].position.y).toBe(16); // Row 2

      // Check column positioning in row 2
      expect(panels[1].position.x).toBe(0);
      expect(panels[2].position.x).toBe(24);
    });

    it('should handle deeply nested XML structures', async () => {
      const xml = `
        <dashboard>
          <label>Nested Dashboard</label>
          <form>
            <fieldset>
              <row>
                ${createPanelXml('Nested Panel', 'index=main | stats count')}
              </row>
            </fieldset>
          </form>
        </dashboard>
      `;
      const parser = new SplunkXmlDashboardParser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(1);
      expect(panels[0].title).toBe('Nested Panel');
    });
  });

  describe('extractQueries', () => {
    it('should extract queries from panels', async () => {
      const xml = createBasicXml(
        createPanelXml('Panel 1', 'index=main | stats count by host') +
          createPanelXml('Panel 2', 'index=app | stats sum(bytes)')
      );
      const parser = new SplunkXmlDashboardParser(xml);
      const queries = await parser.extractQueries();

      expect(queries).toHaveLength(2);
      expect(queries).toContain('index=main | stats count by host');
      expect(queries).toContain('index=app | stats sum(bytes)');
    });

    it('should deduplicate identical queries', async () => {
      const xml = createBasicXml(
        createPanelXml('Panel 1', 'index=main | stats count') +
          createPanelXml('Panel 2', 'index=main | stats count')
      );
      const parser = new SplunkXmlDashboardParser(xml);
      const queries = await parser.extractQueries();

      expect(queries).toHaveLength(1);
      expect(queries[0]).toBe('index=main | stats count');
    });

    it('should handle panels without queries', async () => {
      const xml = `
        <dashboard>
          <row>
            <panel>
              <title>Panel without query</title>
            </panel>
            ${createPanelXml('Panel with query', 'index=main')}
          </row>
        </dashboard>
      `;
      const parser = new SplunkXmlDashboardParser(xml);
      const queries = await parser.extractQueries();

      expect(queries).toHaveLength(1);
      expect(queries[0]).toBe('index=main');
    });

    it('should extract queries from deeply nested panels', async () => {
      const xml = `
        <dashboard>
          <form>
            <fieldset>
              <row>
                <panel>
                  <search>
                    <query>index=nested | stats count</query>
                  </search>
                </panel>
              </row>
            </fieldset>
          </form>
        </dashboard>
      `;
      const parser = new SplunkXmlDashboardParser(xml);
      const queries = await parser.extractQueries();

      expect(queries).toHaveLength(1);
      expect(queries[0]).toBe('index=nested | stats count');
    });
  });

  describe('edge cases', () => {
    it('should handle empty XML', async () => {
      const parser = new SplunkXmlDashboardParser('<dashboard></dashboard>');
      const panels = await parser.extractPanels();
      const queries = await parser.extractQueries();

      expect(panels).toHaveLength(0);
      expect(queries).toHaveLength(0);
    });

    it('should handle XML without dashboard element', async () => {
      const parser = new SplunkXmlDashboardParser('<root></root>');
      const panels = await parser.extractPanels();
      const queries = await parser.extractQueries();

      expect(panels).toHaveLength(0);
      expect(queries).toHaveLength(0);
    });

    it('should handle XML with arbitrary empty element', async () => {
      const parser = new SplunkXmlDashboardParser('<root/>');
      const panels = await parser.extractPanels();
      const queries = await parser.extractQueries();

      expect(panels).toHaveLength(0);
      expect(queries).toHaveLength(0);
    });

    it('should handle malformed XML gracefully', async () => {
      const parser = new SplunkXmlDashboardParser('not valid xml');

      await expect(parser.extractPanels()).rejects.toThrow();
      await expect(parser.extractQueries()).rejects.toThrow();
    });

    it('should trim whitespace from queries and titles', async () => {
      const xml = createBasicXml(`
        <panel>
          <title>  Whitespace Title  </title>
          <search>
            <query>  index=main | stats count  </query>
          </search>
        </panel>
      `);
      const parser = new SplunkXmlDashboardParser(xml);
      const panels = await parser.extractPanels();

      expect(panels[0].title).toBe('Whitespace Title');
      expect(panels[0].query).toBe('index=main | stats count');
    });

    it('should handle empty titles and queries', async () => {
      const xml = createBasicXml(`
        <panel>
          <title></title>
          <search>
            <query>index=main</query>
          </search>
        </panel>
      `);
      const parser = new SplunkXmlDashboardParser(xml);
      const panels = await parser.extractPanels();

      expect(panels[0].title).toBe('Untitled Panel 0');
    });
  });

  describe('chart type detection priority', () => {
    it('should prioritize chart option over chart element', async () => {
      const xml = createBasicXml(`
        <panel>
          <title>Priority Test</title>
          <search>
            <query>index=main</query>
          </search>
          <chart type="line"></chart>
          <option name="charting.chart">pie</option>
        </panel>
      `);
      const parser = new SplunkXmlDashboardParser(xml);
      const panels = await parser.extractPanels();

      expect(panels[0].viz_type).toBe('pie');
    });

    it('should prioritize chart element over viz element', async () => {
      const xml = createBasicXml(`
        <panel>
          <title>Priority Test</title>
          <search>
            <query>index=main</query>
          </search>
          <viz type="line"></viz>
          <chart type="bar"></chart>
        </panel>
      `);
      const parser = new SplunkXmlDashboardParser(xml);
      const panels = await parser.extractPanels();

      expect(panels[0].viz_type).toBe('bar_horizontal');
    });
  });

  describe('isSupportedSplunkXml', () => {
    const panelXml = createPanelXml('Test Panel', 'index=main | stats count by host');
    it('should return true for form rootNode', () => {
      const xml = createBasicXml(panelXml, 'form');
      expect(SplunkXmlDashboardParser.isSupportedSplunkXml(xml)).toMatchObject({
        isSupported: true,
      });
    });

    it('should return true for dashboard rootNode', () => {
      const xml = createBasicXml(panelXml, 'dashboard');
      expect(SplunkXmlDashboardParser.isSupportedSplunkXml(xml)).toMatchObject({
        isSupported: true,
      });
    });

    it('should return false for unsupported rootNode', () => {
      const xml = createBasicXml(
        panelXml,
        /* @ts-expect-error */ // Testing unsupported rootNode
        'unsupportedNode'
      );
      expect(SplunkXmlDashboardParser.isSupportedSplunkXml(xml)).toMatchObject({
        isSupported: false,
      });
    });
  });

  describe('version', () => {
    it('should return correct version', async () => {
      const xml = createBasicXml(
        createPanelXml('Panel 1', 'index=main | stats count by host') +
          createPanelXml('Panel 2', 'index=app | stats sum(bytes)')
      );
      const parser = new SplunkXmlDashboardParser(xml);

      const version = await parser.getVersion();

      expect(version).toBe('1.1');
    });

    it('should return correct version for form rootNode', async () => {
      const xml = createBasicXml(
        createPanelXml('Panel 1', 'index=main | stats count by host') +
          createPanelXml('Panel 2', 'index=app | stats sum(bytes)'),
        'form'
      );
      const parser = new SplunkXmlDashboardParser(xml);
      const version = await parser.getVersion();
      expect(version).toBe('1.1');
    });
  });
});
