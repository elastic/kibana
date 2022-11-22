/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Client } from '@elastic/elasticsearch';

import { ToolingLog } from '@kbn/tooling-log';

export interface TestData {
  suiteTitle: string;
  esArchive?: string;
  bulkBody?: estypes.BulkRequest<GeneratedDoc, GeneratedDoc>['body'];
  postProcessIndex?: (es: Client, td: TestData, log: ToolingLog) => Promise<void>;
  isSavedSearch?: boolean;
  sourceIndexOrSavedSearch: string;
  rowsPerPage?: 10 | 25 | 50;
  brushBaselineTargetTimestamp?: number;
  brushDeviationTargetTimestamp: number;
  brushIntervalFactor: number;
  chartClickCoordinates: [number, number];
  expected: {
    totalDocCountFormatted: string;
    analysisGroupsTable: Array<{ group: string; docCount: string }>;
    analysisTable: Array<{
      fieldName: string;
      fieldValue: string;
      logRate: string;
      pValue: string;
      impact: string;
    }>;
  };
}

export interface GeneratedDoc {
  user: string;
  response_code: string;
  url: string;
  version: string;
  '@timestamp': number;
}
