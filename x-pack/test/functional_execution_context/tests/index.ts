/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { clearLogFile } from '../test_utils';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Execution context', function () {
    before(async () => {
      // Cleaning the log file used for the tests to avoid false positives caused by previous runs.
      // If any of the tests rely on logs generating during bootstrap, we might need to change this.
      await clearLogFile();
    });

    loadTestFile(require.resolve('./browser'));
    loadTestFile(require.resolve('./server'));
    loadTestFile(require.resolve('./log_correlation'));
  });
}
