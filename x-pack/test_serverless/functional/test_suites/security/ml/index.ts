/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Security ML', function () {
    loadTestFile(require.resolve('./anomaly_detection_jobs_list'));
    loadTestFile(require.resolve('./data_frame_analytics_jobs_list'));
    loadTestFile(require.resolve('./trained_models_list'));
    loadTestFile(require.resolve('./search_bar_features'));
  });
}
