/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

import { ExplainLogRateSpikesPageProvider } from './explain_log_rate_spikes_page';
import { ExplainLogRateSpikesAnalysisTableProvider } from './explain_log_rate_spikes_analysis_table';
import { ExplainLogRateSpikesAnalysisGroupsTableProvider } from './explain_log_rate_spikes_analysis_groups_table';
import { ExplainLogRateSpikesDataGeneratorProvider } from './explain_log_rate_spikes_data_generator';
import { LogPatternAnalysisPageProvider } from './log_pattern_analysis_page';
import { ChangePointDetectionPageProvider } from './change_point_detection_page';
import { MlTableServiceProvider } from '../ml/common_table_service';

export function AiopsProvider(context: FtrProviderContext) {
  const explainLogRateSpikesPage = ExplainLogRateSpikesPageProvider(context);
  const explainLogRateSpikesAnalysisTable = ExplainLogRateSpikesAnalysisTableProvider(context);
  const explainLogRateSpikesAnalysisGroupsTable =
    ExplainLogRateSpikesAnalysisGroupsTableProvider(context);
  const explainLogRateSpikesDataGenerator = ExplainLogRateSpikesDataGeneratorProvider(context);
  const logPatternAnalysisPageProvider = LogPatternAnalysisPageProvider(context);

  const tableService = MlTableServiceProvider(context);

  const changePointDetectionPage = ChangePointDetectionPageProvider(context, tableService);

  return {
    changePointDetectionPage,
    explainLogRateSpikesPage,
    explainLogRateSpikesAnalysisTable,
    explainLogRateSpikesAnalysisGroupsTable,
    explainLogRateSpikesDataGenerator,
    logPatternAnalysisPageProvider,
  };
}
