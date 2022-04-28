/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('data frame analytics', function () {
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./create_job'));
    loadTestFile(require.resolve('./start'));
    loadTestFile(require.resolve('./stop'));
    loadTestFile(require.resolve('./start_spaces'));
    loadTestFile(require.resolve('./stop_spaces'));
    loadTestFile(require.resolve('./get_spaces'));
    loadTestFile(require.resolve('./update_spaces'));
    loadTestFile(require.resolve('./delete_spaces'));
    loadTestFile(require.resolve('./evaluate'));
    loadTestFile(require.resolve('./explain'));
    loadTestFile(require.resolve('./jobs_exist_spaces'));
    loadTestFile(require.resolve('./new_job_caps'));
  });
}
