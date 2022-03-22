/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import job from '../../../../plugins/ml/server/models/data_recognizer/modules/apm_transaction/ml/apm_tx_metrics.json';
import datafeed from '../../../../plugins/ml/server/models/data_recognizer/modules/apm_transaction/ml/datafeed_apm_tx_metrics.json';
import { MlApi } from '../../../functional/services/ml/api';

export function createAndRunApmMlJob({ ml, environment }: { ml: MlApi; environment: string }) {
  return ml.createAndRunAnomalyDetectionLookbackJob(
    // @ts-expect-error not entire job config
    {
      ...job,
      job_id: `apm-tx-metrics-${environment}`,
      allow_lazy_open: false,
      custom_settings: {
        job_tags: {
          apm_ml_version: '3',
          environment,
        },
      },
    },
    {
      ...datafeed,
      job_id: `apm-tx-metrics-${environment}`,
      indices: ['apm-*'],
      datafeed_id: `apm-tx-metrics-${environment}-datafeed`,
      query: {
        bool: {
          filter: [...datafeed.query.bool.filter, { term: { 'service.environment': environment } }],
        },
      },
    }
  );
}
