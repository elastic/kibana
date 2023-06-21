/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, loadTestFile }: FtrProviderContext) {
  describe('Usage', () => {
    loadTestFile(require.resolve('./archived_data'));
    loadTestFile(require.resolve('./initial'));
    loadTestFile(require.resolve('./metrics'));
    loadTestFile(require.resolve('./new_jobs'));
    loadTestFile(require.resolve('./error_codes'));
    loadTestFile(require.resolve('./api_counters'));
  });
}
