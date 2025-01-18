/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Infrastructure', () => {
    loadTestFile(require.resolve('./metadata'));
    loadTestFile(require.resolve('./node_details'));
    loadTestFile(require.resolve('./sources'));
    loadTestFile(require.resolve('./snapshot'));
    loadTestFile(require.resolve('./ip_to_hostname'));
    loadTestFile(require.resolve('./metrics_overview_top'));
    loadTestFile(require.resolve('./metrics_process_list'));
    loadTestFile(require.resolve('./metrics_process_list_chart'));
    loadTestFile(require.resolve('./infra'));
    loadTestFile(require.resolve('./inventory_threshold_alert'));
    loadTestFile(require.resolve('./services'));
    loadTestFile(require.resolve('./infra_custom_dashboards'));
    loadTestFile(require.resolve('./infra_asset_count'));
  });
}
