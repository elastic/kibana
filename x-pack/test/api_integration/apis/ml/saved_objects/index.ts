/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('saved objects', function () {
    loadTestFile(require.resolve('./jobs_spaces'));
    loadTestFile(require.resolve('./can_delete_job'));
    loadTestFile(require.resolve('./can_delete_trained_model'));
    loadTestFile(require.resolve('./initialize_jobs'));
    loadTestFile(require.resolve('./initialize_trained_models'));
    loadTestFile(require.resolve('./status'));
    loadTestFile(require.resolve('./sync_jobs'));
    loadTestFile(require.resolve('./sync_trained_models'));
    loadTestFile(require.resolve('./update_jobs_spaces'));
  });
}
