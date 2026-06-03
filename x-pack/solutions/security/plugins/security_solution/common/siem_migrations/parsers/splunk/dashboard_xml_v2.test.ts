/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SplunkXmlDashboardV2Parser } from './dashboard_xml_v2';
import type { VizType } from '../types';

describe('SplunkXmlDashboardV2Parser', () => {
  const createBasicV2Xml = (definition: object) => {
    return `
      <dashboard version="2">
        <label>Test Dashboard</label>
        <definition><![CDATA[${JSON.stringify(definition)}]]></definition>
      </dashboard>
    `;
  };

  const createTabbedV2Xml = (
    mainDefinition: object,
    tabbedDefinitions: Array<{ title: string; definition: object }>
  ) => {
    const tabbedDefsXml = tabbedDefinitions
      .map(
        (tab) =>
          `<tabbeddefinition title="${tab.title}"><![CDATA[${JSON.stringify(
            tab.definition
          )}]]></tabbeddefinition>`
      )
      .join('\n        ');

    return `
      <dashboard version="2">
        <label>Tabbed Dashboard</label>
        <definition><![CDATA[${JSON.stringify(mainDefinition)}]]></definition>
        ${tabbedDefsXml}
        <meta><![CDATA[{"isTabbedDashboard":true}]]></meta>
      </dashboard>
    `;
  };

  describe('extractPanels', () => {
    it('should extract basic panel with ds.search data source', async () => {
      const definition = {
        visualizations: {
          viz_1: {
            type: 'splunk.table',
            title: 'Test Table',
            dataSources: { primary: 'ds_1' },
          },
        },
        dataSources: {
          ds_1: {
            type: 'ds.search',
            name: 'Test Search',
            options: {
              query: 'index=main | stats count by host',
              refresh: '60s',
            },
          },
        },
        defaults: {},
        inputs: {},
        layout: {
          structure: [{ item: 'viz_1', type: 'block', position: { x: 0, y: 0, w: 720, h: 250 } }],
        },
        description: '',
        title: '',
      };

      const xml = createBasicV2Xml(definition);
      const parser = new SplunkXmlDashboardV2Parser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(1);
      expect(panels[0]).toMatchObject({
        id: 'viz_1',
        title: 'Test Table',
        query: 'index=main | stats count by host',
        viz_type: 'table',
        position: { x: 0, y: 0, w: 20, h: 16 },
      });
    });

    it('should extract panel with ds.chain data source', async () => {
      const definition = {
        visualizations: {
          viz_1: {
            type: 'splunk.singlevalue',
            title: 'Search Duration',
            dataSources: { primary: 'ds_chain' },
          },
        },
        dataSources: {
          ds_base: {
            type: 'ds.search',
            name: 'Base Search',
            options: {
              query: '| rest /services/search/jobs',
              refresh: '60s',
            },
          },
          ds_chain: {
            type: 'ds.chain',
            name: 'Chain Search',
            options: {
              extend: 'ds_base',
              query: '| fields runduration',
              refresh: '60s',
            },
          },
        },
        defaults: {},
        inputs: {},
        layout: {
          structure: [{ item: 'viz_1', type: 'block', position: { x: 0, y: 0, w: 288, h: 250 } }],
        },
        description: '',
        title: '',
      };

      const xml = createBasicV2Xml(definition);
      const parser = new SplunkXmlDashboardV2Parser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(1);
      expect(panels[0].query).toBe('| rest /services/search/jobs | fields runduration');
      expect(panels[0].title).toBe('Search Duration');
    });

    it('should handle multiple panels in a grid layout', async () => {
      const definition = {
        visualizations: {
          viz_1: {
            type: 'splunk.bar',
            title: 'Bar Chart',
            dataSources: { primary: 'ds_1' },
          },
          viz_2: {
            type: 'splunk.line',
            title: 'Line Chart',
            dataSources: { primary: 'ds_2' },
          },
        },
        dataSources: {
          ds_1: {
            type: 'ds.search',
            name: 'Search 1',
            options: { query: 'index=main | stats count', refresh: '60s' },
          },
          ds_2: {
            type: 'ds.search',
            name: 'Search 2',
            options: { query: 'index=app | timechart count', refresh: '60s' },
          },
        },
        defaults: {},
        inputs: {},
        layout: {
          structure: [
            { item: 'viz_1', type: 'block', position: { x: 0, y: 0, w: 720, h: 250 } },
            { item: 'viz_2', type: 'block', position: { x: 720, y: 0, w: 720, h: 250 } },
          ],
        },
        description: '',
        title: '',
      };

      const xml = createBasicV2Xml(definition);
      const parser = new SplunkXmlDashboardV2Parser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(2);
      expect(panels[0].title).toBe('Bar Chart');
      expect(panels[0].viz_type).toBe('bar_vertical');
      expect(panels[1].title).toBe('Line Chart');
      expect(panels[1].viz_type).toBe('line');
    });

    it('should handle tabbed layout with layoutDefinitions', async () => {
      const definition = {
        visualizations: {
          viz_tab1: {
            type: 'splunk.table',
            title: 'Tab 1 Table',
            dataSources: { primary: 'ds_1' },
          },
          viz_tab2: {
            type: 'splunk.pie',
            title: 'Tab 2 Pie',
            dataSources: { primary: 'ds_2' },
          },
        },
        dataSources: {
          ds_1: {
            type: 'ds.search',
            name: 'Tab 1 Search',
            options: { query: 'index=main | stats count', refresh: '60s' },
          },
          ds_2: {
            type: 'ds.search',
            name: 'Tab 2 Search',
            options: { query: 'index=app | stats count by type', refresh: '60s' },
          },
        },
        defaults: {},
        inputs: {},
        layout: {
          tabs: {
            items: [
              { layoutId: 'layout_1', label: 'Tab 1' },
              { layoutId: 'layout_2', label: 'Tab 2' },
            ],
          },
          layoutDefinitions: {
            layout_1: {
              structure: [
                { item: 'viz_tab1', type: 'block', position: { x: 0, y: 0, w: 1440, h: 250 } },
              ],
            },
            layout_2: {
              structure: [
                { item: 'viz_tab2', type: 'block', position: { x: 0, y: 0, w: 1440, h: 250 } },
              ],
            },
          },
        },
        description: '',
        title: '',
      };

      const xml = createBasicV2Xml(definition);
      const parser = new SplunkXmlDashboardV2Parser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(2);
      expect(panels[0].title).toBe('Tab 1 Table');
      expect(panels[0].viz_type).toBe('table');
      expect(panels[1].title).toBe('Tab 2 Pie');
      expect(panels[1].viz_type).toBe('pie');
    });

    it('should use fallback title when panel has no title', async () => {
      const definition = {
        visualizations: {
          viz_1: {
            type: 'splunk.table',
            dataSources: { primary: 'ds_1' },
          },
        },
        dataSources: {
          ds_1: {
            type: 'ds.search',
            name: 'Named Data Source',
            options: { query: 'index=main', refresh: '60s' },
          },
        },
        defaults: {},
        inputs: {},
        layout: {
          structure: [{ item: 'viz_1', type: 'block', position: { x: 0, y: 0, w: 720, h: 250 } }],
        },
        description: '',
        title: '',
      };

      const xml = createBasicV2Xml(definition);
      const parser = new SplunkXmlDashboardV2Parser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(1);
      expect(panels[0].title).toBe('Named Data Source');
    });

    it('should return Untitled Panel when no title available', async () => {
      const definition = {
        visualizations: {
          viz_1: {
            type: 'splunk.table',
            dataSources: { primary: 'ds_1' },
          },
        },
        dataSources: {
          ds_1: {
            type: 'ds.search',
            name: '',
            options: { query: 'index=main', refresh: '60s' },
          },
        },
        defaults: {},
        inputs: {},
        layout: {
          structure: [{ item: 'viz_1', type: 'block', position: { x: 0, y: 0, w: 720, h: 250 } }],
        },
        description: '',
        title: '',
      };

      const xml = createBasicV2Xml(definition);
      const parser = new SplunkXmlDashboardV2Parser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(1);
      expect(panels[0].title).toBe('Untitled Panel');
    });

    it('should skip visualizations not in layout', async () => {
      const definition = {
        visualizations: {
          viz_1: {
            type: 'splunk.table',
            title: 'In Layout',
            dataSources: { primary: 'ds_1' },
          },
          viz_2: {
            type: 'splunk.bar',
            title: 'Not In Layout',
            dataSources: { primary: 'ds_1' },
          },
        },
        dataSources: {
          ds_1: {
            type: 'ds.search',
            name: 'Search',
            options: { query: 'index=main', refresh: '60s' },
          },
        },
        defaults: {},
        inputs: {},
        layout: {
          structure: [{ item: 'viz_1', type: 'block', position: { x: 0, y: 0, w: 720, h: 250 } }],
        },
        description: '',
        title: '',
      };

      const xml = createBasicV2Xml(definition);
      const parser = new SplunkXmlDashboardV2Parser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(1);
      expect(panels[0].title).toBe('In Layout');
    });

    it('should handle missing data source gracefully', async () => {
      const definition = {
        visualizations: {
          viz_1: {
            type: 'splunk.table',
            title: 'Test',
            dataSources: { primary: 'ds_nonexistent' },
          },
        },
        dataSources: {},
        defaults: {},
        inputs: {},
        layout: {
          structure: [{ item: 'viz_1', type: 'block', position: { x: 0, y: 0, w: 720, h: 250 } }],
        },
        description: '',
        title: '',
      };

      const xml = createBasicV2Xml(definition);
      const parser = new SplunkXmlDashboardV2Parser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(1);
      expect(panels[0].query).toBe('');
    });

    it('should handle missing visualization for layout item gracefully', async () => {
      const definition = {
        visualizations: {},
        dataSources: {},
        defaults: {},
        inputs: {},
        layout: {
          structure: [
            { item: 'viz_nonexistent', type: 'block', position: { x: 0, y: 0, w: 720, h: 250 } },
          ],
        },
        description: '',
        title: '',
      };

      const xml = createBasicV2Xml(definition);
      const parser = new SplunkXmlDashboardV2Parser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(0);
    });
  });

  describe('visualization type mapping', () => {
    const testVizTypeMapping = async (
      splunkType: string,
      expectedVizType: VizType
    ): Promise<VizType> => {
      const definition = {
        visualizations: {
          viz_1: {
            type: splunkType,
            title: 'Test',
            dataSources: { primary: 'ds_1' },
          },
        },
        dataSources: {
          ds_1: {
            type: 'ds.search',
            name: 'Test',
            options: { query: 'index=main', refresh: '60s' },
          },
        },
        defaults: {},
        inputs: {},
        layout: {
          structure: [{ item: 'viz_1', type: 'block', position: { x: 0, y: 0, w: 720, h: 250 } }],
        },
        description: '',
        title: '',
      };

      const xml = createBasicV2Xml(definition);
      const parser = new SplunkXmlDashboardV2Parser(xml);
      const panels = await parser.extractPanels();
      return panels[0]?.viz_type;
    };

    it('should map splunk.bar to bar_vertical', async () => {
      expect(await testVizTypeMapping('splunk.bar', 'bar_vertical')).toBe('bar_vertical');
    });

    it('should map splunk.pie to pie', async () => {
      expect(await testVizTypeMapping('splunk.pie', 'pie')).toBe('pie');
    });

    it('should map splunk.line to line', async () => {
      expect(await testVizTypeMapping('splunk.line', 'line')).toBe('line');
    });

    it('should map splunk.table to table', async () => {
      expect(await testVizTypeMapping('splunk.table', 'table')).toBe('table');
    });

    it('should map splunk.singlevalue to metric', async () => {
      expect(await testVizTypeMapping('splunk.singlevalue', 'metric')).toBe('metric');
    });

    it('should map splunk.area to area', async () => {
      expect(await testVizTypeMapping('splunk.area', 'area')).toBe('area');
    });

    it('should default unknown types to table', async () => {
      expect(await testVizTypeMapping('splunk.unknown', 'table')).toBe('table');
      expect(await testVizTypeMapping('splunk.markdown', 'table')).toBe('markdown');
      expect(await testVizTypeMapping('splunk.rectangle', 'table')).toBe('table');
    });
  });

  describe('chained data sources', () => {
    it('should resolve deeply chained data sources', async () => {
      const definition = {
        visualizations: {
          viz_1: {
            type: 'splunk.table',
            title: 'Deep Chain',
            dataSources: { primary: 'ds_chain2' },
          },
        },
        dataSources: {
          ds_base: {
            type: 'ds.search',
            name: 'Base',
            options: { query: 'index=main', refresh: '60s' },
          },
          ds_chain1: {
            type: 'ds.chain',
            name: 'Chain 1',
            options: { extend: 'ds_base', query: '| stats count', refresh: '60s' },
          },
          ds_chain2: {
            type: 'ds.chain',
            name: 'Chain 2',
            options: { extend: 'ds_chain1', query: '| fields count', refresh: '60s' },
          },
        },
        defaults: {},
        inputs: {},
        layout: {
          structure: [{ item: 'viz_1', type: 'block', position: { x: 0, y: 0, w: 720, h: 250 } }],
        },
        description: '',
        title: '',
      };

      const xml = createBasicV2Xml(definition);
      const parser = new SplunkXmlDashboardV2Parser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(1);
      expect(panels[0].query).toBe('index=main | stats count | fields count');
    });
  });

  describe('tabbed dashboards', () => {
    it('should extract panels from tabbedDefinition with section info', async () => {
      const mainDefinition = {
        visualizations: {},
        dataSources: {},
        defaults: {},
        inputs: {},
        layout: { structure: [] },
        description: '',
        title: 'Main Dashboard',
      };

      const tabbedDefinition = {
        visualizations: {
          viz_tab: {
            type: 'splunk.table',
            title: 'Tabbed Table',
            dataSources: { primary: 'ds_tab' },
          },
        },
        dataSources: {
          ds_tab: {
            type: 'ds.search',
            name: 'Tab Search',
            options: { query: 'index=tabbed | stats count', refresh: '60s' },
          },
        },
        defaults: {},
        inputs: {},
        layout: {
          structure: [
            { item: 'viz_tab', type: 'block', position: { x: 0, y: 0, w: 1440, h: 250 } },
          ],
        },
        description: '',
        title: '',
      };

      const xml = createTabbedV2Xml(mainDefinition, [
        { title: 'Overview Tab', definition: tabbedDefinition },
      ]);
      const parser = new SplunkXmlDashboardV2Parser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(1);
      expect(panels[0].title).toBe('Tabbed Table');
      expect(panels[0].section).toEqual({ title: 'Overview Tab', id: expect.any(String) });
    });

    it('should handle multiple tabbed definitions', async () => {
      const mainDefinition = {
        visualizations: {},
        dataSources: {},
        defaults: {},
        inputs: {},
        layout: { structure: [] },
        description: '',
        title: '',
      };

      const tab1Definition = {
        visualizations: {
          viz_1: {
            type: 'splunk.bar',
            title: 'Tab 1 Panel',
            dataSources: { primary: 'ds_1' },
          },
        },
        dataSources: {
          ds_1: {
            type: 'ds.search',
            name: 'Search 1',
            options: { query: 'index=tab1', refresh: '60s' },
          },
        },
        defaults: {},
        inputs: {},
        layout: {
          structure: [{ item: 'viz_1', type: 'block', position: { x: 0, y: 0, w: 720, h: 250 } }],
        },
        description: '',
        title: '',
      };

      const tab2Definition = {
        visualizations: {
          viz_2: {
            type: 'splunk.pie',
            title: 'Tab 2 Panel',
            dataSources: { primary: 'ds_2' },
          },
        },
        dataSources: {
          ds_2: {
            type: 'ds.search',
            name: 'Search 2',
            options: { query: 'index=tab2', refresh: '60s' },
          },
        },
        defaults: {},
        inputs: {},
        layout: {
          structure: [{ item: 'viz_2', type: 'block', position: { x: 0, y: 0, w: 720, h: 250 } }],
        },
        description: '',
        title: '',
      };

      const xml = createTabbedV2Xml(mainDefinition, [
        { title: 'First Tab', definition: tab1Definition },
        { title: 'Second Tab', definition: tab2Definition },
      ]);
      const parser = new SplunkXmlDashboardV2Parser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(2);
      expect(panels[0]).toMatchObject({
        id: 'viz_1',
        title: 'Tab 1 Panel',
        viz_type: 'bar_vertical',
        query: 'index=tab1',
        position: { x: 0, y: 0, w: 20, h: 16 },
        section: {
          title: 'First Tab',
        },
      });
      expect(panels[1]).toMatchObject({
        id: 'viz_2',
        title: 'Tab 2 Panel',
        viz_type: 'pie',
        query: 'index=tab2',
        section: { title: 'Second Tab' },
        position: { x: 0, y: 0, w: 20, h: 16 },
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty layout structure', async () => {
      const definition = {
        visualizations: {
          viz_1: {
            type: 'splunk.table',
            title: 'Unused',
            dataSources: { primary: 'ds_1' },
          },
        },
        dataSources: {
          ds_1: {
            type: 'ds.search',
            name: 'Search',
            options: { query: 'index=main', refresh: '60s' },
          },
        },
        defaults: {},
        inputs: {},
        layout: { structure: [] },
        description: '',
        title: '',
      };

      const xml = createBasicV2Xml(definition);
      const parser = new SplunkXmlDashboardV2Parser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(0);
    });

    it('should handle empty visualizations', async () => {
      const definition = {
        visualizations: {},
        dataSources: {},
        defaults: {},
        inputs: {},
        layout: { structure: [] },
        description: '',
        title: '',
      };

      const xml = createBasicV2Xml(definition);
      const parser = new SplunkXmlDashboardV2Parser(xml);
      const panels = await parser.extractPanels();

      expect(panels).toHaveLength(0);
    });

    it('should handle malformed JSON in definition gracefully', async () => {
      const xml = `
        <dashboard version="2">
          <definition><![CDATA[{invalid json}]]></definition>
        </dashboard>
      `;
      const parser = new SplunkXmlDashboardV2Parser(xml);

      await expect(parser.extractPanels()).rejects.toThrow();
    });

    it('should handle missing definition element', async () => {
      const xml = `
        <dashboard version="2">
          <label>No Definition</label>
        </dashboard>
      `;
      const parser = new SplunkXmlDashboardV2Parser(xml);

      await expect(parser.extractPanels()).rejects.toThrow();
    });
  });
});
