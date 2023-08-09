/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../functional/ftr_provider_context';

import { LogRateAnalysisDataGeneratorProvider } from '../../functional/services/aiops/log_rate_analysis_data_generator';

export function AiopsProvider(context: FtrProviderContext) {
  const logRateAnalysisDataGenerator = LogRateAnalysisDataGeneratorProvider(context);

  return {
    logRateAnalysisDataGenerator,
  };
}
