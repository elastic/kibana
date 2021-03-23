/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Reporting APIs', function () {
    this.tags('ciGroup2');
    loadTestFile(require.resolve('./csv_job_params'));
    loadTestFile(require.resolve('./csv_searchsource_immediate'));
    loadTestFile(require.resolve('./network_policy'));
    loadTestFile(require.resolve('./spaces'));
    loadTestFile(require.resolve('./usage'));
  });
}
