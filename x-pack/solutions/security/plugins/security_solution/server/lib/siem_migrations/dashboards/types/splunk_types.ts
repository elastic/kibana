/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents a single panel extracted from a Splunk dashboard
 * Direct equivalent to the Python dictionary structure returned by parseSplunkXml
 */
export interface SplunkPanel {
  /**
   * Panel title extracted from <title> element or generated default
   */
  title: string;

  /**
   * SPL query extracted from <query> or <searchString> elements
   * null if no query is found in the panel
   */
  splunk_query: string | null;

  /**
   * Visualization type determined from XML elements and options
   * Matches the same types returned by the Python implementation
   */
  viz_type: string;
}

/**
 * Represents the complete parsed dashboard structure
 * Direct equivalent to the Python tuple return (rows, dashboard_title)
 */
export interface ParsedSplunkDashboard {
  /**
   * Dashboard title extracted from <label> element
   */
  title: string;

  /**
   * Array of rows, each containing an array of panels
   * Matches Python structure: [[row1_panels], [row2_panels], ...]
   */
  panels: SplunkPanel[][];
}

/**
 * Configuration options for the SplunkXmlParser
 */
export interface SplunkXmlParserOptions {
  /**
   * Logger instance for error and debug logging
   */
  logger: import('@kbn/core/server').Logger;
}

/**
 * Raw XML parsing result structure from xml2js
 * Used internally for type safety during parsing
 */
export interface ParsedXmlNode {
  [key: string]: any;
}

/**
 * Supported Splunk dashboard types for parsing
 */
export type SplunkDashboardType = 'form' | 'dashboard';

/**
 * Supported visualization types that can be detected from Splunk XML
 * Matches the types from the Python implementation's viz_type mapping
 */
export type SplunkVisualizationType =
  | 'table'
  | 'metric'
  | 'bar horizontal'
  | 'bar vertical'
  | 'bar horizontal stacked'
  | 'bar vertical stacked'
  | 'area'
  | 'area stacked'
  | 'line'
  | 'pie'
  | 'scatter'
  | 'heatmap'
  | 'gauge'
  | 'treemap'
  | 'markdown';

/**
 * XML element types that can contain queries in Splunk dashboards
 */
export interface SplunkSearchElement {
  query?: string | { _: string };
  searchString?: string | { _: string };
}

/**
 * XML element types that define visualization options
 */
export interface SplunkVisualizationElement {
  type?: string;
  name?: string;
  _?: string; // xml2js text content
}

/**
 * Structure of a panel element from parsed XML
 */
export interface SplunkPanelElement {
  title?: string;
  search?: SplunkSearchElement | SplunkSearchElement[];
  query?: string | { _: string };
  single?: any; // Single value visualization
  viz?: SplunkVisualizationElement;
  chart?: SplunkVisualizationElement & {
    searchString?: string | { _: string };
  };
  table?: any;
  option?: SplunkVisualizationElement | SplunkVisualizationElement[];
  html?: any;
}

/**
 * Structure of a row element from parsed XML
 */
export interface SplunkRowElement {
  panel?: SplunkPanelElement | SplunkPanelElement[];
}

/**
 * Root dashboard/form element structure from parsed XML
 */
export interface SplunkDashboardElement {
  label?: string;
  row?: SplunkRowElement | SplunkRowElement[];
  panel?: SplunkPanelElement | SplunkPanelElement[];
}
