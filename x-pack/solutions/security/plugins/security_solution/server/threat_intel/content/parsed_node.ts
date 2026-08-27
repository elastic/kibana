/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Minimal DOM node shape shared by both htmlparser2 extraction pipelines. A transitive
 * `@types/cheerio@0.22` shadows the types bundled with the installed Cheerio, so the type
 * assertion stays at each Cheerio boundary and the rest of the pipeline uses this contract.
 */
export interface ParsedNode {
  type: string;
  data?: string;
  name?: string;
  attribs?: Record<string, string>;
  parent?: ParsedNode | null;
  children?: ParsedNode[];
}
