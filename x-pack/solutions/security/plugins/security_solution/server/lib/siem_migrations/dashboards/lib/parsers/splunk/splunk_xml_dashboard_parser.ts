/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import xml2js, { type ParserOptions } from 'xml2js';

export interface Search {
  query?: string[];
  earliest?: string[];
  latest?: string[];
}

export interface ChartPanel {
  search?: Search[];
  option?: Array<{
    $: { name: string };
    _: string;
  }>;
}

export interface SinglePanel {
  search?: Search[];
  option?: Array<{
    $: { name: string };
    _: string;
  }>;
}

export interface Panel {
  title?: string[];
  description?: string[];
  chart?: ChartPanel[];
  single?: SinglePanel[];
}

export interface Row {
  panel?: Panel[];
}

export interface Dashboard {
  $?: {
    version: string;
    theme: string;
  };
  label?: string[];
  row?: Row[];
}

export interface DashboardObject {
  dashboard?: Dashboard;
}

export class SplunkXmlDashboardParser {
  constructor(private readonly xml: string) {}

  async toObject(options?: ParserOptions): Promise<DashboardObject> {
    return xml2js.parseStringPromise(this.xml, options);
  }

  async getQueries(): Promise<string[]> {
    const obj = await this.toObject();
    const queries: string[] = [];

    // Extract queries from all panels in all rows
    obj?.dashboard?.row?.forEach((row: Row) => {
      row.panel?.forEach((panel: Panel) => {
        // Handle chart panel queries
        if (panel.chart?.[0]?.search?.[0]?.query?.[0]) {
          queries.push(panel.chart[0].search[0].query[0]);
        }
        // Handle single panel queries
        if (panel.single?.[0]?.search?.[0]?.query?.[0]) {
          queries.push(panel.single[0].search[0].query[0]);
        }
      });
    });

    return queries;
  }
}
