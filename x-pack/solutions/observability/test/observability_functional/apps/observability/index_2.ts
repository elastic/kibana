/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('ObservabilityApp (part 2)', function () {
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
