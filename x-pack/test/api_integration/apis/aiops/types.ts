/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AiopsLogRateAnalysisSchema,
  AiopsLogRateAnalysisApiVersion as ApiVersion,
} from '@kbn/aiops-plugin/common/api/log_rate_analysis/schema';
import type { SignificantItem, SignificantItemGroup } from '@kbn/ml-agg-utils';

import type { LogRateAnalysisDataGenerator } from '../../../functional/services/aiops/log_rate_analysis_data_generator';

export interface TestData<T extends ApiVersion> {
  testName: string;
  esArchive?: string;
  dataGenerator?: LogRateAnalysisDataGenerator;
  requestBody: AiopsLogRateAnalysisSchema<T>;
  expected: {
    chunksLength: number;
    chunksLengthGroupOnly: number;
    actionsLength: number;
    actionsLengthGroupOnly: number;
    noIndexChunksLength: number;
    noIndexActionsLength: number;
    significantItems: SignificantItem[];
    groups: SignificantItemGroup[];
    histogramLength: number;
  };
}
