/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-utils';

import { kibanaLogsDataViewTestData } from './log_rate_analysis/test_data/kibana_logs_data_view_test_data';
import { farequoteDataViewTestData } from './log_rate_analysis/test_data/farequote_data_view_test_data';
import { farequoteDataViewTestDataWithQuery } from './log_rate_analysis/test_data/farequote_data_view_test_data_with_query';
import { getArtificialLogDataViewTestData } from './log_rate_analysis/test_data/artificial_log_data_view_test_data';

import type { TestData } from './types';

export const logRateAnalysisTestData: TestData[] = [
  kibanaLogsDataViewTestData,
  farequoteDataViewTestData,
  farequoteDataViewTestDataWithQuery,
  getArtificialLogDataViewTestData(LOG_RATE_ANALYSIS_TYPE.SPIKE, false, false),
  getArtificialLogDataViewTestData(LOG_RATE_ANALYSIS_TYPE.SPIKE, true, false),
  getArtificialLogDataViewTestData(LOG_RATE_ANALYSIS_TYPE.SPIKE, true, true),
  getArtificialLogDataViewTestData(LOG_RATE_ANALYSIS_TYPE.SPIKE, false, true),
  getArtificialLogDataViewTestData(LOG_RATE_ANALYSIS_TYPE.DIP, false, false),
  getArtificialLogDataViewTestData(LOG_RATE_ANALYSIS_TYPE.DIP, true, false),
];
