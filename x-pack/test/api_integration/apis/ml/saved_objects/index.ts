/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('saved objects', function () {
    loadTestFile(require.resolve('./jobs_spaces'));
    loadTestFile(require.resolve('./assign_job_to_space'));
    loadTestFile(require.resolve('./can_delete_job'));
    loadTestFile(require.resolve('./initialize'));
    loadTestFile(require.resolve('./status'));
    loadTestFile(require.resolve('./remove_job_from_space'));
    loadTestFile(require.resolve('./sync'));
  });
}
