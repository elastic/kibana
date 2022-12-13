/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import job from '@kbn/ml-plugin/server/models/data_recognizer/modules/apm_transaction/ml/apm_tx_metrics.json';
import datafeed from '@kbn/ml-plugin/server/models/data_recognizer/modules/apm_transaction/ml/datafeed_apm_tx_metrics.json';
import { MlApi } from '../../../functional/services/ml/api';

export async function createAndRunApmMlJobs({
  es,
  ml,
  environments,
}: {
  es: Client;
  ml: MlApi;
  environments: string[];
}) {
  // Creating multiple ml jobs in parallel is causing this tests to be flaky
  // https://github.com/elastic/elasticsearch/issues/36271
  for (const environment of environments) {
    await createAndRunApmMlJob({ es, environment, ml });
  }
}

async function createAndRunApmMlJob({
  es,
  ml,
  environment,
}: {
  es: Client;
  ml: MlApi;
  environment: string;
}) {
  const jobId = `apm-tx-metrics-${environment}`;
  await ml.createAndRunAnomalyDetectionLookbackJob(
    // @ts-expect-error not entire job config
    {
      ...job,
      job_id: jobId,
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
      indices_options: { allow_no_indices: true },
      job_id: jobId,
      indices: ['metrics-apm*', 'apm-*'],
      datafeed_id: `apm-tx-metrics-${environment}-datafeed`,
      query: {
        bool: {
          filter: [...datafeed.query.bool.filter, { term: { 'service.environment': environment } }],
        },
      },
    }
  );

  await es.cluster.health({ index: '.ml-*', wait_for_status: 'yellow' });
}
