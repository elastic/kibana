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
  },
};
