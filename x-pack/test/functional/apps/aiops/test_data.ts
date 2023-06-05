/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestData } from './types';

export const kibanaLogsDataViewTestData: TestData = {
  suiteTitle: 'kibana sample data logs',
  dataGenerator: 'kibana_sample_data_logs',
  isSavedSearch: false,
  sourceIndexOrSavedSearch: 'kibana_sample_data_logs',
  brushIntervalFactor: 1,
  chartClickCoordinates: [235, 0],
  fieldSelectorSearch: 'referer',
  fieldSelectorApplyAvailable: true,
  action: {
    type: 'LogPatternAnalysis',
    tableRowId: '488337254',
    expected: {
      queryBar:
        'clientip:30.156.16.164 AND host.keyword:elastic-elastic-elastic.org AND ip:30.156.16.163 AND response.keyword:404 AND machine.os.keyword:win xp AND geo.dest:IN AND geo.srcdest:US\\:IN',
      totalDocCount: '100',
    },
  },
  expected: {
    totalDocCountFormatted: '14,074',
    analysisGroupsTable: [
      {
        group:
          '* clientip: 30.156.16.164* host.keyword: elastic-elastic-elastic.org* ip: 30.156.16.163* referer: http://www.elastic-elastic-elastic.com/success/timothy-l-kopra* response.keyword: 404Showing 5 out of 8 items. 8 items unique to this group.',
        docCount: '100',
      },
    ],
    filteredAnalysisGroupsTable: [
      {
        group:
          '* clientip: 30.156.16.164* host.keyword: elastic-elastic-elastic.org* ip: 30.156.16.163* response.keyword: 404* machine.os.keyword: win xpShowing 5 out of 7 items. 7 items unique to this group.',
        docCount: '100',
      },
    ],
    analysisTable: [
      {
        fieldName: 'clientip',
        fieldValue: '30.156.16.164',
        logRate: 'Chart type:bar chart',
        pValue: '3.10e-13',
        impact: 'High',
      },
      {
        fieldName: 'geo.dest',
        fieldValue: 'IN',
        logRate: 'Chart type:bar chart',
        pValue: '0.000716',
        impact: 'Medium',
      },
      {
        fieldName: 'geo.srcdest',
        fieldValue: 'US:IN',
        logRate: 'Chart type:bar chart',
        pValue: '0.000716',
        impact: 'Medium',
      },
      {
        fieldName: 'host.keyword',
        fieldValue: 'elastic-elastic-elastic.org',
        logRate: 'Chart type:bar chart',
        pValue: '7.14e-9',
        impact: 'High',
      },
      {
        fieldName: 'ip',
        fieldValue: '30.156.16.163',
        logRate: 'Chart type:bar chart',
        pValue: '3.28e-13',
        impact: 'High',
      },
      {
        fieldName: 'machine.os.keyword',
        fieldValue: 'win xp',
        logRate: 'Chart type:bar chart',
        pValue: '0.0000997',
        impact: 'Medium',
      },
      {
        fieldName: 'referer',
        fieldValue: 'http://www.elastic-elastic-elastic.com/success/timothy-l-kopra',
        logRate: 'Chart type:bar chart',
        pValue: '4.74e-13',
        impact: 'High',
      },
      {
        fieldName: 'response.keyword',
        fieldValue: '404',
        logRate: 'Chart type:bar chart',
        pValue: '0.00000604',
        impact: 'Medium',
      },
    ],
    fieldSelectorPopover: [
      'clientip',
      'geo.dest',
      'geo.srcdest',
      'host.keyword',
      'ip',
      'machine.os.keyword',
      'referer',
      'response.keyword',
    ],
  },
};

export const farequoteDataViewTestData: TestData = {
  suiteTitle: 'farequote with spike',
  dataGenerator: 'farequote_with_spike',
  isSavedSearch: false,
  sourceIndexOrSavedSearch: 'ft_farequote',
  brushDeviationTargetTimestamp: 1455033600000,
  brushIntervalFactor: 1,
  chartClickCoordinates: [0, 0],
  fieldSelectorSearch: 'airline',
  fieldSelectorApplyAvailable: false,
  expected: {
    totalDocCountFormatted: '86,374',
    sampleProbabilityFormatted: '0.5',
    fieldSelectorPopover: ['airline', 'custom_field.keyword'],
  },
};

export const farequoteDataViewTestDataWithQuery: TestData = {
  suiteTitle: 'farequote with spike',
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
  fieldSelectorSearch: 'user',
  fieldSelectorApplyAvailable: true,
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
    filteredAnalysisGroupsTable: [
      { group: '* url: home.phpresponse_code: 500', docCount: '792' },
      { group: '* url: login.phpresponse_code: 500', docCount: '790' },
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
    fieldSelectorPopover: ['response_code', 'url', 'user'],
  },
};

export const explainLogRateSpikesTestData: TestData[] = [
  kibanaLogsDataViewTestData,
  farequoteDataViewTestData,
  farequoteDataViewTestDataWithQuery,
  artificialLogDataViewTestData,
];
