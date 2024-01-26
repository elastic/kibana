/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('serverless observability UI', function () {
    loadTestFile(require.resolve('./landing_page'));
    loadTestFile(require.resolve('./navigation'));
    loadTestFile(require.resolve('./observability_log_explorer'));
    loadTestFile(require.resolve('./rules/rules_list'));
    loadTestFile(require.resolve('./cases'));
    loadTestFile(require.resolve('./advanced_settings'));
    loadTestFile(require.resolve('./ml'));
  });
}
