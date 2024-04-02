/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-utils';

import type { TestData } from '../../types';

export const farequoteDataViewTestData: TestData = {
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
  expected: {
    totalDocCountFormatted: '86,374',
    sampleProbabilityFormatted: '0.5',
    fieldSelectorPopover: ['airline', 'custom_field.keyword'],
    globalState: {
      refreshInterval: { pause: true, value: 60000 },
      time: { from: '2016-02-07T00:00:00.000Z', to: '2016-02-11T23:59:54.000Z' },
    },
    appState: {
      logRateAnalysis: {
        filters: [],
        searchQuery: { match_all: {} },
        searchQueryLanguage: 'kuery',
        searchString: '',
        wp: {
          bMax: 1454940000000,
          bMin: 1454817600000,
          dMax: 1455040800000,
          dMin: 1455033600000,
        },
      },
    },
    prompt: 'empty',
  },
};
