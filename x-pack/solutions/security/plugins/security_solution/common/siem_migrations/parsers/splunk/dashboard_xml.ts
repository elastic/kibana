/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import xml2js from 'xml2js';
import type { ParsedPanel, PanelPosition, VizType } from '../types';

interface XmlElement {
  $?: { [key: string]: string }; // XML attributes
  _?: string; // Text content
}
/**
 * Represents a parsed XML object from a Splunk dashboard
 */
interface SplunkXmlElement extends XmlElement {
  [key: string]: SplunkXmlElement[] | SplunkXmlElement | string | undefined;
}

/**
 *
 * Per [Splunk XML Reference](https://help.splunk.com/en/splunk-enterprise/create-dashboards-and-reports/simple-xml-dashboards/10.0/simple-xml-reference/simple-xml-reference#using-the-simple-xml-reference-0),
 * below is the status of features supported in this parser:

  - Build dashboards or forms. Configure structure and layout.
    - [x] dashboard or form
    - [x] row
    - [x] panel

  - Add and configure visualizations
    - [x] vizualizations
    - [] event
    - [x] table
    - [x] chart
    - [] map
    - [x] single value (metric)
    - [] html

  - Work with searches to drive dashboard content
    - search
      - [x] Inline ( query element)
      - [] Report reference
      - [] Base search
      - [] Post-process search
  - [] Add interactivity
    - fieldset (form)
    - input (form)
    - drilldown
    - Predefined drilldown tokens
    - eval, link, set, unset
 *
 *
 **/
export class SplunkXmlDashboardParser {
  constructor(private readonly xml: string) {}

  private async parse(): Promise<SplunkXmlElement> {
    return xml2js.parseStringPromise(this.xml, {
      explicitArray: true,
    }) as Promise<SplunkXmlElement>;
  }

  public async extractPanels(): Promise<ParsedPanel[]> {
    const root = await this.parse();
    const panels: ParsedPanel[] = [];

    if (!root) return panels;

    const allRows = this.findAllDeep(root, 'row');

    allRows.forEach((row, rowIndex) => {
      const allPanels = this.findAllDeep(row, 'panel');
      const panelCount = allPanels.length;

      allPanels.forEach((panel, panelIndex) => {
        if (!panel) return;

        const queryElement = this.findDeep(panel, 'query') as string[] | undefined;
        if (!Array.isArray(queryElement) || !queryElement[0]) return;

        const query = queryElement[0].toString().trim();

        let title = '';
        const titleElement = this.findDeep(panel, 'title') as string[] | undefined;
        if (Array.isArray(titleElement) && titleElement.length > 0) {
          title = titleElement[0].toString().trim();
        }
        // If still no title, provide a fallback with panel index
        if (!title || title === '') {
          title = `Untitled Panel ${panelIndex}`;
        }

        // Get visualization type using deep search for all chart elements
        const vizType = this.getPanelChartType(panel);
        const height = 16; // Default height
        const position = this.calculatePositions(rowIndex, panelIndex, panelCount, height);

        panels.push({
          id: uuidV4(),
          title,
          query,
          viz_type: vizType,
          position,
        });
      });
    });

    return panels;
  }

  public async extractQueries(): Promise<string[]> {
    const root = await this.parse();
    const queries: string[] = [];

    const allPanels = this.findAllDeep(root, 'panel');

    allPanels.forEach((panel) => {
      const queryElement = this.findDeep(panel, 'query') as string[] | undefined;
      if (Array.isArray(queryElement) && queryElement[0]) {
        const query = queryElement[0].toString().trim();
        if (query && !queries.includes(query)) {
          queries.push(query);
        }
      }
    });

    return queries;
  }

  private getPanelChartType(panel: SplunkXmlElement): VizType {
    const metricXml = this.findDeep(panel, 'single');
    const vizXml = this.findDeep(panel, 'viz') as SplunkXmlElement[] | undefined;
    const chartXml = this.findDeep(panel, 'chart') as SplunkXmlElement[] | undefined;

    const chartOption = this.findDeep(panel, 'option', 'name', 'charting.chart') as
      | SplunkXmlElement
      | undefined;
    const stackMode = this.findDeep(panel, 'option', 'name', 'charting.chart.stackMode') as
      | SplunkXmlElement
      | undefined;
    const overlayMode = this.findDeep(panel, 'option', 'name', 'dataOverlayMode') as
      | SplunkXmlElement
      | undefined;

    let chartType = 'table';

    if (Array.isArray(vizXml) && vizXml[0]?.$ && vizXml[0].$.type) {
      chartType = vizXml[0].$.type;
    }

    if (Array.isArray(chartXml) && chartXml[0]?.$ && chartXml[0].$.type) {
      chartType = chartXml[0].$.type;
    }

    if (chartOption && chartOption._) {
      chartType = chartOption._;
    }

    return this.mapToVizType(chartType, stackMode, overlayMode, metricXml);
  }

  private mapToVizType(
    chartType: string,
    stackMode: SplunkXmlElement | undefined,
    overlayMode: SplunkXmlElement | undefined,
    metricXml: unknown
  ): VizType {
    const isStacked = stackMode?._ && stackMode._.includes('stacked');

    if (chartType === 'bar') {
      return isStacked ? 'bar_horizontal_stacked' : 'bar_horizontal';
    }

    if (chartType === 'column') {
      return isStacked ? 'bar_vertical_stacked' : 'bar_vertical';
    }

    if (chartType === 'area') {
      return isStacked ? 'area_stacked' : 'area';
    }

    if (chartType === 'table' && overlayMode?._ === 'heatmap') {
      return 'heatmap';
    }

    if (chartType === 'radialGauge') {
      return 'gauge';
    }

    if (chartType === 'table' && metricXml) {
      return 'metric';
    }

    const typeMap: Record<string, VizType> = {
      table: 'table',
      heatmap: 'heatmap',
      gauge: 'gauge',
      metric: 'metric',
      pie: 'pie',
      donut: 'donut',
      line: 'line',
      treemap: 'treemap',
      markdown: 'markdown',
    };

    return typeMap[chartType] || 'table';
  }

  /** Unified deep search method (equivalent to XML's .// XPath expressions) */
  private findDeep(
    source: SplunkXmlElement,
    elementName: string,
    attrName?: string,
    attrValue?: string
  ): SplunkXmlElement[] | SplunkXmlElement | string | undefined {
    if (typeof source !== 'object' || source === null) {
      return undefined;
    }
    // Check if the element exists at this level
    if (elementName in source) {
      const element = source[elementName];

      // If no attribute filtering is needed, return the element
      if (!attrName || !attrValue) {
        return element;
      }

      // If attribute filtering is needed, check if it's an array of elements
      if (Array.isArray(element)) {
        for (const item of element as SplunkXmlElement[]) {
          if (item.$ && item.$[attrName] === attrValue) {
            return item;
          }
        }
      }
    }

    for (const key of Object.keys(source)) {
      const value = source[key];

      if (Array.isArray(value)) {
        for (const item of value) {
          const result = this.findDeep(item, elementName, attrName, attrValue);
          if (result !== undefined) {
            return result;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        const result = this.findDeep(value, elementName, attrName, attrValue);
        if (result !== undefined) {
          return result;
        }
      }
    }

    return undefined;
  }

  private findAllDeep(source: SplunkXmlElement, elementName: string): SplunkXmlElement[] {
    const results: SplunkXmlElement[] = [];

    if (typeof source !== 'object' || source === null) {
      return results;
    }

    if (elementName in source) {
      const element = source[elementName];

      if (Array.isArray(element)) {
        results.push(...element);
      } else if (element) {
        results.push(element as SplunkXmlElement);
      }
    }

    // Search recursively in all properties (but skip children of found elements)
    for (const key of Object.keys(source)) {
      if (key === elementName) {
        // Skip the element we already processed above
      } else {
        const value = source[key];

        if (Array.isArray(value)) {
          for (const item of value) {
            const childResults = this.findAllDeep(item, elementName);
            results.push(...childResults);
          }
        } else if (typeof value === 'object' && value !== null) {
          const childResults = this.findAllDeep(value, elementName);
          results.push(...childResults);
        }
      }
    }

    return results;
  }

  /** Calculate panel positions */
  private calculatePositions(
    rowIndex: number,
    panelIndex: number,
    totalPanelsInRow: number,
    height = 16
  ): PanelPosition {
    const panelWidth = Math.floor(48 / totalPanelsInRow);

    return {
      x: panelIndex * panelWidth,
      y: rowIndex * height,
      w: panelWidth,
      h: height,
    };
  }

  /**
    Finds the first occurrence of a `<` character, but only if it is NOT immediately followed by a `?` or a `!`. After that, skip over any optional whitespace, and then capture the following sequence of letters, numbers, underscores, and colons. That captured sequence is our root tag name.

    Per [Splunk Doc](https://help.splunk.com/en/splunk-enterprise/create-dashboards-and-reports/simple-xml-dashboards/10.0/simple-xml-reference/simple-xml-reference#id_645cf346_45ec_49af_8a69_5f826a15109a__Simple_XML_Reference)

    #### Examples:

    - `"<form version='1.1'>"`
    - <?xml ...> <!-- comment --> <dashboard>"`
   */
  public static isSupportedSplunkXml(xmlContent: string): {
    isSupported: boolean;
    reason?: string;
  } {
    // Find the first element tag by skipping any XML declaration or comments
    const match = xmlContent.match(/<(?!\?|!)\s*([a-zA-Z0-9_:]+)/);
    const rootTag = match ? match[1] : null;

    if (rootTag !== 'form' && rootTag !== 'dashboard') {
      return {
        isSupported: false,
        reason: `Unsupported root tag: ${rootTag}`,
      };
    }

    // Check if rootTag has an attribute `version=1.1`
    const versionMatch = xmlContent.match(/<\s*([a-zA-Z0-9_:]+)\s*.*version=['"]?1\.1['"]?/);
    if (!versionMatch) {
      return {
        isSupported: false,
        reason: `Unsupported version. Only version 1.1 is supported.`,
      };
    }

    // Ensure it's a dashboard with rows
    const hasRows = xmlContent.includes('<row');
    return hasRows
      ? { isSupported: true }
      : {
          isSupported: false,
          reason: 'No <row> elements found in the provided Dashboard XML.',
        };
  }
}
