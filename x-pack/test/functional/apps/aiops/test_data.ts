/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestData } from './types';

export const farequoteDataViewTestData: TestData = {
  suiteTitle: 'farequote with spike',
  dataGenerator: 'farequote_with_spike',
  isSavedSearch: false,
  sourceIndexOrSavedSearch: 'ft_farequote',
  brushDeviationTargetTimestamp: 1455033600000,
  brushIntervalFactor: 1,
  chartClickCoordinates: [0, 0],
  expected: {
    totalDocCountFormatted: '86,374',
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
        pValue: '4.66e-11',
        impact: 'High',
      },
    ],
  },
};

const REFERENCE_TS = 1669018354793;
const DAY_MS = 86400000;

const DEVIATION_TS = REFERENCE_TS - DAY_MS * 2;
const BASELINE_TS = DEVIATION_TS - DAY_MS * 1;

export const artificialLogDataViewTestData: TestData = {
  suiteTitle: 'artificial logs with spike',
  dataGenerator: 'artificial_logs_with_spike',
  isSavedSearch: false,
  sourceIndexOrSavedSearch: 'artificial_logs_with_spike',
  brushBaselineTargetTimestamp: BASELINE_TS + DAY_MS / 2,
  brushDeviationTargetTimestamp: DEVIATION_TS + DAY_MS / 2,
  brushIntervalFactor: 10,
  chartClickCoordinates: [-200, 30],
  expected: {
    totalDocCountFormatted: '8,400',
    analysisGroupsTable: [
      {
        group: 'response_code: 500url: home.php',
        docCount: '792',
      },
      {
        group: 'url: login.phpresponse_code: 500',
        docCount: '790',
      },
      {
        docCount: '636',
        group: 'user: Peterurl: home.php',
      },
      {
        docCount: '632',
        group: 'user: Peterurl: login.php',
      },
    ],
    analysisTable: [
      {
        fieldName: 'response_code',
        fieldValue: '500',
        logRate: 'Chart type:bar chart',
        pValue: '3.61e-12',
        impact: 'High',
      },
      {
        fieldName: 'url',
        fieldValue: 'home.php',
        impact: 'Low',
        logRate: 'Chart type:bar chart',
        pValue: '0.00974',
      },
    ],
  },
};

export const explainLogRateSpikesTestData: TestData[] = [
  farequoteDataViewTestData,
  artificialLogDataViewTestData,
];
