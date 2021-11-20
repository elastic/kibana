/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('anomaly detection', function () {
    this.tags(['skipFirefox']);

    loadTestFile(require.resolve('./single_metric_job'));
    loadTestFile(require.resolve('./single_metric_job_without_datafeed_start'));
    loadTestFile(require.resolve('./multi_metric_job'));
    loadTestFile(require.resolve('./population_job'));
    loadTestFile(require.resolve('./saved_search_job'));
    loadTestFile(require.resolve('./advanced_job'));
    loadTestFile(require.resolve('./single_metric_viewer'));
    loadTestFile(require.resolve('./anomaly_explorer'));
    loadTestFile(require.resolve('./categorization_job'));
    loadTestFile(require.resolve('./date_nanos_job'));
    loadTestFile(require.resolve('./annotations'));
    loadTestFile(require.resolve('./aggregated_scripted_job'));
    loadTestFile(require.resolve('./custom_urls'));
    loadTestFile(require.resolve('./forecasts'));
  });
}
