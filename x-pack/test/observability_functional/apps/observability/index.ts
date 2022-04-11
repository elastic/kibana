/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('ObservabilityApp', function () {
    this.tags('ciGroup6');
    loadTestFile(require.resolve('./alerts'));
    loadTestFile(require.resolve('./alerts/add_to_case'));
    loadTestFile(require.resolve('./alerts/alert_disclaimer'));
    loadTestFile(require.resolve('./alerts/alert_status'));
    loadTestFile(require.resolve('./alerts/pagination'));
    loadTestFile(require.resolve('./alerts/rule_stats'));
    loadTestFile(require.resolve('./alerts/state_synchronization'));
    loadTestFile(require.resolve('./alerts/table_storage'));
    loadTestFile(require.resolve('./exploratory_view'));
    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./alerts/rules_page'));
  });
}
