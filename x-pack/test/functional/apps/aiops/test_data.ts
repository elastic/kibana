/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestData } from './types';

export const farequoteDataViewTestData: TestData = {
  suiteTitle: 'farequote index pattern',
  isSavedSearch: false,
  sourceIndexOrSavedSearch: 'ft_farequote',
  brushTargetTimestamp: 1455033600000,
  expected: {
    totalDocCountFormatted: '86,375',
    analysisGroupsTable: [
      { docCount: '297', group: 'airline: AAL' },
      {
        docCount: '101',
        group: 'airline: UALcustom_field.keyword: deviation',
      },
    ],
    analysisTable: [
      {
        fieldName: 'airline',
        fieldValue: 'AAL',
        logRate: 'Chart type:bar chart',
        pValue: '5.00e-11',
        impact: 'High',
      },
    ],
  },
};
