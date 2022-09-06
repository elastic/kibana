/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

import { ExplainLogRateSpikesProvider } from './explain_log_rate_spikes';
import { ExplainLogRateSpikesAnalysisTableProvider } from './explain_log_rate_spikes_analysis_table';

export function AiopsProvider(context: FtrProviderContext) {
  const explainLogRateSpikes = ExplainLogRateSpikesProvider(context);
  const explainLogRateSpikesAnalysisTable = ExplainLogRateSpikesAnalysisTableProvider(context);

  return {
    explainLogRateSpikes,
    explainLogRateSpikesAnalysisTable,
  };
}
