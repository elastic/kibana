/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Detection Engine Basic and Essentials API', function () {
    loadTestFile(require.resolve('./rules/create_rules'));
    loadTestFile(require.resolve('./rules/create_ml_rules_privileges'));
    loadTestFile(require.resolve('./alerts/open_close_alerts'));
    loadTestFile(require.resolve('./alerts/query_alerts'));
    loadTestFile(require.resolve('./alerts/query_alerts_backword_compatibility'));
  });
}
