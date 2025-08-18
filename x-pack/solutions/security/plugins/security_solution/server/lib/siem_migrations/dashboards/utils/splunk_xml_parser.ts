/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseString } from 'xml2js';
import type { Logger } from '@kbn/core/server';

// TypeScript interfaces for parsed XML structures
interface ParsedXmlElement {
  [key: string]: string | ParsedXmlElement | ParsedXmlElement[] | undefined;
  _?: string; // xml2js text content
  $?: { [attr: string]: string }; // xml2js attributes
}

interface ParsedXmlOption extends ParsedXmlElement {
  name?: string;
  _?: string; // The actual option value
}

interface ParsedXmlSearch extends ParsedXmlElement {
  query?: string | ParsedXmlElement;
}

interface ParsedXmlPanel extends ParsedXmlElement {
  title?: string;
  search?: ParsedXmlSearch | ParsedXmlSearch[];
  query?: string | ParsedXmlElement;
  single?: ParsedXmlElement;
  viz?: ParsedXmlElement & { type?: string };
  chart?: ParsedXmlElement & {
    type?: string;
    searchString?: string | ParsedXmlElement;
  };
  table?: ParsedXmlElement;
  option?: ParsedXmlOption | ParsedXmlOption[];
  html?: ParsedXmlElement;
}

interface ParsedXmlRow extends ParsedXmlElement {
  panel?: ParsedXmlPanel | ParsedXmlPanel[];
}

interface ParsedXmlDashboard extends ParsedXmlElement {
  label?: string;
  row?: ParsedXmlRow | ParsedXmlRow[];
  panel?: ParsedXmlPanel | ParsedXmlPanel[];
}

interface ParsedXmlRoot {
  dashboard?: ParsedXmlDashboard;
  form?: ParsedXmlDashboard;
}

export interface SplunkPanel {
  title: string;
  splunk_query: string | null;
  viz_type: string;
}

export interface ParsedSplunkDashboard {
  title: string;
  panels: SplunkPanel[][];
}

export interface SplunkXmlParserOptions {
  logger: Logger;
}

/**
 * Service for parsing Splunk Classic Dashboard/Form v1.1 (Traditional XML) files
 * Direct TypeScript equivalent of the Python parseSplunkXml method from the splunk-to-elastic-migration project
 */
export class SplunkXmlParser {
  private readonly logger: Logger;

  constructor(options: SplunkXmlParserOptions) {
    this.logger = options.logger;
  }

  /**
   * Parses a traditional Splunk XML dashboard string and returns structured data
   * Direct equivalent of the Python ET.fromstring() and parseSplunkXml logic
   */
  public parseSplunkXml(xmlContent: string): ParsedSplunkDashboard {
    try {
      const parsed = this.parseXmlString(xmlContent);
      if (!parsed) {
        throw new Error('Unkown error while parsing');
      }
      return this.extractDashboardData(parsed);
    } catch (error) {
      this.logger.error('Error parsing Splunk XML dashboard', error);
      throw new Error(`Failed to parse Splunk XML dashboard: ${(error as Error).message}`);
    }
  }

  /**
   * Parses a Splunk XML dashboard and extracts all non-empty Splunk queries.
   * @param xmlContent The raw XML string of the dashboard.
   * @returns A string array of all found Splunk queries.
   */
  public extractQueries(xmlContent: string): string[] {
    const dashboard = this.parseSplunkXml(xmlContent);
    const queries: string[] = [];

    for (const row of dashboard.panels) {
      for (const panel of row) {
        if (panel.splunk_query) {
          queries.push(panel.splunk_query);
        }
      }
    }

    return queries;
  }

  /**
   * Parses XML string using xml2js (synchronous)
   * Equivalent to Python's ET.fromstring()
   */
  private parseXmlString(xmlContent: string): ParsedXmlRoot | null {
    let result: ParsedXmlRoot;
    let parseError: Error | null = null;

    parseString(
      xmlContent,
      {
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true,
      },
      (err, parsed) => {
        if (err) {
          parseError = err;
        } else {
          result = parsed as ParsedXmlRoot;
        }
      }
    );

    if (parseError) {
      throw parseError;
    }

    return result;
  }

  /**
   * Extracts dashboard data from parsed XML
   * Direct translation of Python's parseSplunkXml method logic
   */
  private extractDashboardData(parsedXml: ParsedXmlRoot): ParsedSplunkDashboard {
    // Python equivalent: root = ET.fromstring(SplunkXmlDashboard)
    const root = parsedXml.dashboard || parsedXml.form;

    if ('view' in parsedXml) {
      throw new Error(
        'Unsupported Splunk XML format: view element found. Only traditional dashboards are supported.'
      );
    }

    if (!root) {
      throw new Error('Invalid Splunk dashboard XML: missing dashboard or form root element');
    }

    const rows: SplunkPanel[][] = [];

    // Python equivalent: root.find('.//label').text
    const dashboardTitle = this.getStringValue(root.label);

    // Python equivalent: root.findall('.//row')
    const rowElements = this.ensureArray(root.row);

    for (const row of rowElements) {
      const panels: SplunkPanel[] = [];

      // Python equivalent: row.findall('.//panel')
      const panelElements = this.ensureArray(row.panel);

      for (let idx = 0; idx < panelElements.length; idx++) {
        const panel = panelElements[idx];
        const vizType = this.determineVizType(panel);

        const splunkPanel: SplunkPanel = {
          // Python equivalent: panel.find('.//title').text if panel.find('.//title') is not None
          title: this.getStringValue(panel.title) || `Untitled Panel ${idx}`,
          // Python equivalent: panel.find('.//query').text if panel.find('.//query') is not None
          splunk_query: this.extractQuery(panel),
          viz_type: vizType,
        };

        panels.push(splunkPanel);
      }

      if (panels.length > 0) {
        rows.push(panels);
      }
    }

    // Handle dashboards without explicit rows (flat panel structure)
    if (rows.length === 0 && root.panel) {
      const panels: SplunkPanel[] = [];
      const panelElements = this.ensureArray(root.panel);

      for (let idx = 0; idx < panelElements.length; idx++) {
        const panel = panelElements[idx];
        const vizType = this.determineVizType(panel);

        const splunkPanel: SplunkPanel = {
          title: this.getStringValue(panel.title) || `Untitled Panel ${idx}`,
          splunk_query: this.extractQuery(panel),
          viz_type: vizType,
        };

        panels.push(splunkPanel);
      }

      if (panels.length > 0) {
        rows.push(panels);
      }
    }

    return {
      title: dashboardTitle,
      panels: rows,
    };
  }

  /**
   * Determines the visualization type from panel configuration
   * Direct translation of Python's visualization type detection logic
   */
  private determineVizType(panel: ParsedXmlPanel): string {
    // Python equivalent checks with exact same priority and logic
    const metricXml = panel.single;
    const vizXml = panel.viz;
    const chartXml = panel.chart;

    // Find option elements by searching recursively - Python: panel.find(".//option[@name='charting.chart']")
    const chartOption = this.findOptionByName(panel, 'charting.chart');
    const stackMode = this.findOptionByName(panel, 'charting.chart.stackMode');
    const overlayMode = this.findOptionByName(panel, 'dataOverlayMode');

    // Default table - Python equivalent: chart_type = "table"
    let chartType = 'table';

    // Python equivalent: if viz_xml is not None
    if (vizXml && vizXml.type) {
      chartType = this.getStringValue(vizXml.type);
    } else if (chartXml && chartXml.type) {
      chartType = this.getStringValue(chartXml.type);
    } else if (chartOption) {
      // Python: chart_option.text
      chartType = this.getTextContent(chartOption);
    }

    // Apply transformations - exact same logic as Python
    if (chartType === 'bar') {
      chartType = 'bar horizontal';
    }
    if (chartType === 'column') {
      chartType = 'bar vertical';
    }
    if (
      chartType === 'bar vertical' &&
      stackMode &&
      this.getTextContent(stackMode).includes('stacked')
    ) {
      chartType = 'bar vertical stacked';
    }
    if (
      chartType === 'bar horizontal' &&
      stackMode &&
      this.getTextContent(stackMode).includes('stacked')
    ) {
      chartType = 'bar horizontal stacked';
    }
    if (chartType === 'area' && stackMode && this.getTextContent(stackMode).includes('stacked')) {
      chartType = 'area stacked';
    }
    if (chartType === 'table' && overlayMode && this.getTextContent(overlayMode) === 'heatmap') {
      chartType = 'heatmap';
    }
    if (chartType === 'radialGauge') {
      chartType = 'gauge';
    }
    // Python equivalent: if chart_type == 'table' and metric_xml is not None and metric_xml.text
    if (chartType === 'table' && metricXml && this.getTextContent(metricXml)) {
      chartType = 'metric';
    }

    return chartType;
  }

  /**
   * Extracts query from panel search elements
   * Python equivalent: panel.find('.//query').text
   */
  private extractQuery(panel: ParsedXmlPanel): string | null {
    // Python: panel.find('.//query').text - searches recursively for query elements
    const queryElement = this.findElementRecursively(panel, 'query');
    if (queryElement) {
      return this.getTextContent(queryElement);
    }

    // Handle searchString in chart elements (specific to some formats)
    const searchStringElement = this.findElementRecursively(panel, 'searchString');
    if (searchStringElement) {
      return this.getTextContent(searchStringElement);
    }

    return null;
  }

  /**
   * Recursively finds an element by name (equivalent to Python's .find('.//elementName'))
   */
  private findElementRecursively(
    obj: ParsedXmlElement,
    elementName: string
  ): ParsedXmlElement | string | null {
    if (!obj || typeof obj !== 'object') {
      return null;
    }

    // Check if current object has the element
    if (elementName in obj && obj[elementName] !== undefined) {
      return obj[elementName];
    }

    // Search recursively in all properties
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && obj[key] && typeof obj[key] === 'object') {
        const found = this.findElementRecursively(obj[key] as ParsedXmlElement, elementName);
        if (found !== null) {
          return found;
        }
      }
    }

    return null;
  }

  /**
   * Finds option element by name attribute (equivalent to Python's panel.find(".//option[@name='optionName']"))
   */
  private findOptionByName(obj: ParsedXmlElement, optionName: string): ParsedXmlOption | null {
    if (!obj || typeof obj !== 'object') {
      return null;
    }

    // Check if current object is an option with matching name
    if ('name' in obj && obj.name === optionName) {
      return obj as ParsedXmlOption;
    }

    // Check if current object has option array
    if (obj.option) {
      const options = this.ensureArray(obj.option);
      for (const option of options) {
        if (
          option &&
          typeof option === 'object' &&
          'name' in option &&
          option.name === optionName
        ) {
          return option as ParsedXmlOption;
        }
      }
    }

    // Search recursively
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && obj[key] && typeof obj[key] === 'object') {
        const found = this.findOptionByName(obj[key] as ParsedXmlElement, optionName);
        if (found !== null) {
          return found;
        }
      }
    }

    return null;
  }

  /**
   * Gets text content from an element (equivalent to Python's element.text)
   */
  private getTextContent(element: ParsedXmlElement | string | undefined): string {
    if (!element) {
      return '';
    }
    if (typeof element === 'string') {
      return element;
    }
    if (element && typeof element === 'object') {
      // xml2js stores text content in _ property
      if (element._ !== undefined) {
        return String(element._);
      }
      // For simple text elements, the text might be the element itself
      if (typeof element === 'object' && Object.keys(element).length === 0) {
        return '';
      }
    }
    return element ? String(element) : '';
  }

  /**
   * Gets string value from various element types
   */
  private getStringValue(element: string | ParsedXmlElement | undefined): string {
    if (!element) {
      return '';
    }
    if (typeof element === 'string') {
      return element;
    }
    if (typeof element === 'object' && element._) {
      return String(element._);
    }
    return String(element);
  }

  /**
   * Ensures the value is an array
   * Helper for handling xml2js output where single items aren't arrays
   */
  private ensureArray<T>(value: T | T[] | undefined): T[] {
    if (value === undefined || value === null) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  }

  /**
    Finds the first occurrence of a `<` character, but only if it is NOT immediately followed by a `?` or a `!`. After that, skip over any optional whitespace, and then capture the following sequence of letters, numbers, underscores, and colons. That captured sequence is our root tag name.

    #### Examples:

  `"<form version='1.1'>"`**:
    1.  Finds `<`.
    2.  Checks the next character (`f`). It's not `?` or `!`. The check passes.
    3.  There is no whitespace, so `\s*` matches nothing.
    4.  Captures `form`. **Result: `form`**

  `"  <?xml ...> <!-- comment --> <dashboard>"`**:
    1.  The regex starts scanning and finds the first `<`.
    2.  It looks ahead and sees `?`. The negative lookahead `(?!\?|!)` fails. The engine discards this match.
    3.  It continues scanning and finds the next `<` in `<!--`.
    4.  It looks ahead and sees `!`. The negative lookahead fails again. The engine discards this match.
    5.  It continues scanning and finds the next `<` in `<dashboard>`.
    6.  It looks ahead and sees `d`. The check passes.
    7.  It captures `dashboard`. **Result: `dashboard`**
   */
  public static isSupportedSplunkXml(xmlContent: string): boolean {
    // Find the first element tag by skipping any XML declaration or comments
    const match = xmlContent.match(/<(?!\?|!)\s*([a-zA-Z0-9_:]+)/);
    const rootTag = match ? match[1] : null;

    if (rootTag !== 'form' && rootTag !== 'dashboard') {
      return false;
    }

    // Reject v2 dashboards, which are not traditional XML
    if (rootTag === 'dashboard' && xmlContent.includes('version="2"')) {
      return false;
    }

    // Ensure it's a dashboard with panels, not just a simple form
    return xmlContent.includes('<row') && xmlContent.includes('<panel');
  }
}
