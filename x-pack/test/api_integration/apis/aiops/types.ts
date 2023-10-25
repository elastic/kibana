/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiopsApiLogRateAnalysis } from '@kbn/aiops-plugin/common/api';
import type { SignificantItem, SignificantItemGroup } from '@kbn/ml-agg-utils';

import type { LogRateAnalysisDataGenerator } from '../../../functional/services/aiops/log_rate_analysis_data_generator';

export interface TestData {
  testName: string;
  esArchive?: string;
  dataGenerator?: LogRateAnalysisDataGenerator;
  requestBody: AiopsApiLogRateAnalysis['body'];
  expected: {
    chunksLength: number;
    chunksLengthGroupOnly: number;
    actionsLength: number;
    actionsLengthGroupOnly: number;
    noIndexChunksLength: number;
    noIndexActionsLength: number;
    significantItemFilter: 'add_significant_items';
    groupFilter: 'add_significant_items_group';
    groupHistogramFilter: 'add_significant_items_group_histogram';
    histogramFilter: 'add_significant_items_histogram';
    errorFilter: 'add_error';
    significantItems: SignificantItem[];
    groups: SignificantItemGroup[];
    histogramLength: number;
  };
}
