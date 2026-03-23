/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('ObservabilityApp', function () {
    loadTestFile(require.resolve('./pages/alerts'));
    loadTestFile(require.resolve('./pages/alerts/add_to_case'));
    loadTestFile(require.resolve('./pages/alerts/alert_controls'));
    loadTestFile(require.resolve('./pages/alerts/alert_summary_widget'));
    loadTestFile(require.resolve('./pages/alerts/pagination'));
    loadTestFile(require.resolve('./pages/alerts/rule_stats'));
    loadTestFile(require.resolve('./pages/alerts/state_synchronization'));
    loadTestFile(require.resolve('./pages/alerts/table_configuration'));
    loadTestFile(require.resolve('./pages/alerts/custom_threshold'));
    loadTestFile(require.resolve('./pages/alerts/mute_unmute'));
    loadTestFile(require.resolve('./pages/cases/case_details'));
    loadTestFile(require.resolve('./pages/overview/alert_table'));
    loadTestFile(require.resolve('./exploratory_view'));
    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./pages/rules_page'));
    loadTestFile(require.resolve('./pages/alerts/metric_threshold'));
    loadTestFile(require.resolve('./sidenav/sidenav'));
  });
}
