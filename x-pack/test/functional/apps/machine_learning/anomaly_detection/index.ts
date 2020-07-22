/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('anomaly detection', function () {
    this.tags(['skipFirefox']);

    loadTestFile(require.resolve('./single_metric_job'));
    loadTestFile(require.resolve('./multi_metric_job'));
    loadTestFile(require.resolve('./population_job'));
    loadTestFile(require.resolve('./saved_search_job'));
    loadTestFile(require.resolve('./advanced_job'));
    loadTestFile(require.resolve('./single_metric_viewer'));
    loadTestFile(require.resolve('./anomaly_explorer'));
    loadTestFile(require.resolve('./categorization_job'));
    loadTestFile(require.resolve('./date_nanos_job'));
  });
}
