/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

import { LogRateAnalysisPageProvider } from './log_rate_analysis_page';
import { LogRateAnalysisResultsTableProvider } from './log_rate_analysis_results_table';
import { LogRateAnalysisResultsGroupsTableProvider } from './log_rate_analysis_results_groups_table';
import { LogRateAnalysisDataGeneratorProvider } from './log_rate_analysis_data_generator';
import { LogPatternAnalysisPageProvider } from './log_pattern_analysis_page';
import { ChangePointDetectionPageProvider } from './change_point_detection_page';
import { MlTableServiceProvider } from '../ml/common_table_service';

export function AiopsProvider(context: FtrProviderContext) {
  const logRateAnalysisPage = LogRateAnalysisPageProvider(context);
  const logRateAnalysisResultsTable = LogRateAnalysisResultsTableProvider(context);
  const logRateAnalysisResultsGroupsTable = LogRateAnalysisResultsGroupsTableProvider(context);
  const logRateAnalysisDataGenerator = LogRateAnalysisDataGeneratorProvider(context);
  const logPatternAnalysisPage = LogPatternAnalysisPageProvider(context);

  const tableService = MlTableServiceProvider(context);

  const changePointDetectionPage = ChangePointDetectionPageProvider(context, tableService);

  return {
    changePointDetectionPage,
    logRateAnalysisPage,
    logRateAnalysisResultsTable,
    logRateAnalysisResultsGroupsTable,
    logRateAnalysisDataGenerator,
    logPatternAnalysisPage,
  };
}
