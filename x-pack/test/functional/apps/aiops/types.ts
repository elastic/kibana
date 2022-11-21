/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export interface TestDataEsArchive {
  suiteTitle: string;
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

export interface TestDataGenerated extends TestDataEsArchive {
  bulkBody: estypes.BulkRequest<GeneratedDoc, GeneratedDoc>['body'];
}
