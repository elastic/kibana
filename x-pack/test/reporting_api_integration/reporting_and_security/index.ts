/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Reporting APIs', function () {
    this.tags('ciGroup2');
    loadTestFile(require.resolve('./csv_job_params'));
    loadTestFile(require.resolve('./csv_saved_search'));
    loadTestFile(require.resolve('./usage'));
    loadTestFile(require.resolve('./network_policy'));
  });
}
