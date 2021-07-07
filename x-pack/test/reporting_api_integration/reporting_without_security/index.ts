/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Reporting API Integration Tests with Security disabled', function () {
    this.tags('ciGroup13');
    loadTestFile(require.resolve('./job_apis_csv'));
    loadTestFile(require.resolve('./job_apis_csv_deprecated'));
    loadTestFile(require.resolve('./ilm_migration_apis'));
  });
}
