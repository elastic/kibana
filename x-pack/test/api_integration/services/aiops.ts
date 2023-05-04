/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../functional/ftr_provider_context';

import { ExplainLogRateSpikesDataGeneratorProvider } from '../../functional/services/aiops/explain_log_rate_spikes_data_generator';

export function AiopsProvider(context: FtrProviderContext) {
  const explainLogRateSpikesDataGenerator = ExplainLogRateSpikesDataGeneratorProvider(context);

  return {
    explainLogRateSpikesDataGenerator,
  };
}
