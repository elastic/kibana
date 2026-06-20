/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedPanel } from '../types';

export interface SentinelWorkbookItemContent {
  query?: string;
  queryType?: string | number;
  visualization?: string;
  size?: number;
  resourceType?: string;
}

export interface SentinelWorkbookItem {
  type: number;
  name?: string;
  title?: string;
  content?: SentinelWorkbookItemContent;
}

export interface SentinelWorkbook {
  id: string;
  title: string;
  description: string;
  /** The original JSON-encoded Workbook definition (preserved for downstream installation) */
  serializedData: string;
  panels: ParsedPanel[];
}
