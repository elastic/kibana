/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-utils';

import type { TestData } from '../../types';

export const farequoteDataViewTestDataWithQuery: TestData = {
  suiteTitle: 'farequote with spike',
  analysisType: LOG_RATE_ANALYSIS_TYPE.SPIKE,
  dataGenerator: 'farequote_with_spike',
  isSavedSearch: false,
  sourceIndexOrSavedSearch: 'ft_farequote',
  brushDeviationTargetTimestamp: 1455033600000,
  brushIntervalFactor: 1,
  chartClickCoordinates: [0, 0],
  fieldSelectorSearch: 'airline',
  fieldSelectorApplyAvailable: false,
  query: 'NOT airline:("SWR" OR "ACA" OR "AWE" OR "BAW" OR "JAL" OR "JBU" OR "JZA" OR "KLM")',
  expected: {
    totalDocCountFormatted: '48,799',
    analysisGroupsTable: [
      {
        docCount: '297',
        group: '* airline: AAL',
      },
      {
        docCount: '100',
        group: '* custom_field.keyword: deviation* airline: UAL',
      },
    ],
    analysisTable: [
      {
        fieldName: 'airline',
        fieldValue: 'AAL',
        logRate: 'Chart type:bar chart',
        pValue: '1.18e-8',
        impact: 'High',
      },
    ],
    fieldSelectorPopover: ['airline', 'custom_field.keyword'],
  },
};
