/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

interface TestDataTableActionLogPatternAnalysis {
  type: 'LogPatternAnalysis';
  tableRowId: string;
  expected: {
    queryBar: string;
    totalDocCount: string;
  };
}

interface TestDataExpectedWithSampleProbability {
  totalDocCountFormatted: string;
  sampleProbabilityFormatted: string;
  fieldSelectorPopover: string[];
}

export function isTestDataExpectedWithSampleProbability(
  arg: unknown
): arg is TestDataExpectedWithSampleProbability {
  return isPopulatedObject(arg, ['sampleProbabilityFormatted']);
}

interface TestDataExpectedWithoutSampleProbability {
  totalDocCountFormatted: string;
  analysisGroupsTable: Array<{ group: string; docCount: string }>;
  filteredAnalysisGroupsTable?: Array<{ group: string; docCount: string }>;
  analysisTable: Array<{
    fieldName: string;
    fieldValue: string;
    logRate: string;
    pValue: string;
    impact: string;
  }>;
  fieldSelectorPopover: string[];
}

export interface TestData {
  suiteTitle: string;
  dataGenerator: string;
  isSavedSearch?: boolean;
  sourceIndexOrSavedSearch: string;
  rowsPerPage?: 10 | 25 | 50;
  brushBaselineTargetTimestamp?: number;
  brushDeviationTargetTimestamp?: number;
  brushIntervalFactor: number;
  chartClickCoordinates: [number, number];
  fieldSelectorSearch: string;
  fieldSelectorApplyAvailable: boolean;
  query?: string;
  action?: TestDataTableActionLogPatternAnalysis;
  expected: TestDataExpectedWithSampleProbability | TestDataExpectedWithoutSampleProbability;
}
