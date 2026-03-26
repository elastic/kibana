/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { PanelSection, ParsedPanel, VizType } from '../types';
import type { BaseXmlElement } from '../xml/xml';
import { XmlParser } from '../xml/xml';
import type { SplunkDashboardParser } from './types';

const DEFAULT_PANEL_WIDTH = 20;
const DEFAULT_PANEL_HEIGHT = 16;

interface DashboardStructure {
  item: string;
  type: 'block';
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

interface DashboardViz {
  dataSources: {
    primary?: string;
  };
  // not supported yet
  eventHandlers?: {};
  options?: {
    markdown?: string;
  };
  title: string;
  type: string;
}

interface DashboardDataSourceCommon {
  name: string;
  options: {
    queryParameters?: Record<string, string>;
    refresh: string;
  };
}

type DashboardDataSource = DashboardDataSourceCommon &
  (
    | {
        type: 'ds.search';
        options: DashboardDataSourceCommon['options'] & {
          query: string;
        };
      }
    | {
        type: 'ds.chain';
        options: DashboardDataSourceCommon['options'] & {
          extend: string;
          query: string;
        };
      }
  );

type DashboardLayout =
  | {
      structure?: DashboardStructure[];
    }
  | {
      tabs: {
        items: Array<{
          layoutId: string;
          label: string;
        }>;
      };
      layoutDefinitions: Record<string, DashboardLayout>;
    };

interface DashboardDefinition {
  visualizations: Record<string, DashboardViz>;
  dataSources: Record<string, DashboardDataSource>;
  // not supported yet
  defaults: {};
  // not supported yet
  inputs: {};
  layout: DashboardLayout;
  description: '';
  title: '';
}

export class SplunkXmlDashboardV2Parser extends XmlParser implements SplunkDashboardParser {
  public async extractPanels(): Promise<ParsedPanel[]> {
    const root = await this.parse();

    const metaEl = (this.findDeep(root, 'meta') ?? '{}') as
      | string
      | Array<string>
      | BaseXmlElement[];

    const meta = JSON.parse(
      this.getStrValue(Array.isArray(metaEl) ? metaEl[0] : metaEl)
    ) as unknown as {
      isTabbedDashboard?: boolean;
    };

    const definitionStr = this.findDeep(root, 'definition') as string | Array<string>;

    const definition = JSON.parse(this.getStrValue(definitionStr)) as DashboardDefinition;

    const panels = this.extractPanelsFromDefinition(definition);

    if (meta && meta?.isTabbedDashboard) {
      const allTabbedDefinitions = this.findAllDeep(root, 'tabbeddefinition');
      for (const tabbedDefEl of allTabbedDefinitions) {
        const tabbedDef = tabbedDefEl._;
        if (tabbedDef) {
          const title = tabbedDefEl.$?.title || tabbedDefEl.$?.value || 'Untitled Section';
          const section: PanelSection = {
            id: uuidV4(),
            title,
          };
          const tabbedDefinition = JSON.parse(tabbedDef) as DashboardDefinition;
          const tabbedPanels = this.extractPanelsFromDefinition(tabbedDefinition);
          panels.push(...tabbedPanels.map((panel) => ({ ...panel, section })));
        }
      }
    }

    return panels;
  }

  public async extractQueries(): Promise<string[]> {
    const panels = await this.extractPanels();
    const queries = panels.map((panel) => panel.query).filter((query) => query && query.length > 0);
    return queries;
  }

  private extractPanelsFromDefinition(definition: DashboardDefinition): ParsedPanel[] {
    const visualizations = this.extractVizSummaryFromLayout(definition.layout);
    const parsedPanels: ParsedPanel[] = [];
    visualizations.forEach((viz, idx) => {
      const vizDetails = this.processViz(viz.id, definition);

      if (vizDetails) {
        const parsedPanel: ParsedPanel = {
          id: viz.id,
          title: vizDetails?.title,
          query: vizDetails?.query,
          viz_type: vizDetails?.viz_type,
          position: this.calculatePanelPosition(idx, visualizations.length),
        };

        parsedPanels.push(parsedPanel);
      }
    });
    return parsedPanels;
  }

  private calculatePanelPosition(
    index: number,
    totalNumber: number,
    panelPerRow: number = 2
  ): ParsedPanel['position'] {
    const row = Math.floor(index / panelPerRow);
    const col = index % panelPerRow;
    const w = 20;
    const h = 16;
    return {
      x: col * w,
      y: row * h,
      w: DEFAULT_PANEL_WIDTH,
      h: DEFAULT_PANEL_HEIGHT,
    };
  }

  private extractVizSummaryFromLayout(layout: DashboardLayout): Array<{
    id: string;
    position: ParsedPanel['position'];
  }> {
    const viz: Array<{
      id: string;
      position: ParsedPanel['position'];
    }> = [];
    if ('structure' in layout && Array.isArray(layout.structure)) {
      for (const item of layout.structure) {
        if (item.type === 'block') {
          viz.push({ id: item.item, position: { ...item.position } });
        }
      }
    } else if ('tabs' in layout && Array.isArray(layout.tabs.items)) {
      for (const tab of layout.tabs.items) {
        const layoutId = tab.layoutId;
        if (layoutId && layout.layoutDefinitions && layoutId in layout.layoutDefinitions) {
          const tabLayout = layout.layoutDefinitions[layoutId];
          const visualizations = this.extractVizSummaryFromLayout(tabLayout);
          viz.push(...visualizations);
        }
      }
    }
    return viz;
  }

  private processViz(
    vizId: string,
    defintion: DashboardDefinition
  ): Omit<ParsedPanel, 'position'> | null {
    const vizObj = defintion.visualizations[vizId];
    if (!vizObj) {
      return null;
    }

    if (vizObj.type === 'splunk.markdown') {
      return {
        id: vizId,
        title: vizObj.title || 'Markdown Panel',
        query: vizObj.options?.markdown || '',
        viz_type: 'markdown',
      };
    }

    if (!vizObj.dataSources || !('primary' in vizObj.dataSources) || !vizObj.dataSources.primary) {
      return null;
    }

    const query = this.extractQueryFromDataSource(
      vizObj.dataSources.primary,
      defintion.dataSources
    );
    const vizType = this.mapToViztype(vizObj.type);
    return {
      id: vizId,
      title: vizObj.title || query.title || 'Untitled Panel',
      query: query.query,
      viz_type: vizType,
    };
  }

  private extractQueryFromDataSource(
    dataSourceId: string,
    dataSourceObj: Record<string, DashboardDataSource>
  ): {
    query: string;
    title: string;
  } {
    const dummyQuery = {
      query: '',
      title: '',
    };

    if (!(dataSourceId in dataSourceObj)) {
      return dummyQuery;
    }
    const dataSource = dataSourceObj[dataSourceId];
    switch (dataSource.type) {
      case 'ds.search':
        return {
          query: dataSource.options.query,
          title: dataSource.name,
        };
      case 'ds.chain':
        const { title, query } = this.extractQueryFromDataSource(
          dataSource.options.extend,
          dataSourceObj
        );
        return {
          query: [query, dataSource.options.query].join(' '),
          title,
        };

      default:
        return dummyQuery;
    }
  }

  private mapToViztype(chartType: string): VizType {
    switch (chartType) {
      case 'splunk.bar':
        return 'bar_vertical';
      case 'splunk.pie':
        return 'pie';
      case 'splunk.line':
        return 'line';
      case 'splunk.table':
        return 'table';
      case 'splunk.singlevalue':
        return 'metric';
      case 'splunk.area':
        return 'area';
      case 'splunk.markdown':
        return 'markdown';
      default:
        return 'table';
    }
  }
}
