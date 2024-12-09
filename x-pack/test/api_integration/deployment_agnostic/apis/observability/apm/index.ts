/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function apmApiIntegrationTests({
  loadTestFile,
}: DeploymentAgnosticFtrProviderContext) {
  describe('APM', function () {
    loadTestFile(require.resolve('./agent_explorer'));
    loadTestFile(require.resolve('./alerts'));
    loadTestFile(require.resolve('./cold_start'));
    loadTestFile(require.resolve('./correlations'));
    loadTestFile(require.resolve('./custom_dashboards'));
    loadTestFile(require.resolve('./data_view'));
    loadTestFile(require.resolve('./dependencies'));
    loadTestFile(require.resolve('./diagnostics'));
    loadTestFile(require.resolve('./entities'));
    loadTestFile(require.resolve('./environment'));
    loadTestFile(require.resolve('./error_rate'));
    loadTestFile(require.resolve('./errors'));
    loadTestFile(require.resolve('./historical_data'));
    loadTestFile(require.resolve('./infrastructure'));
    loadTestFile(require.resolve('./inspect'));
    loadTestFile(require.resolve('./latency'));
    loadTestFile(require.resolve('./metrics'));
    loadTestFile(require.resolve('./mobile'));
    loadTestFile(require.resolve('./observability_overview'));
    loadTestFile(require.resolve('./service_groups'));
    loadTestFile(require.resolve('./service_maps'));
    loadTestFile(require.resolve('./service_nodes'));
    loadTestFile(require.resolve('./service_overview'));
    loadTestFile(require.resolve('./services'));
    loadTestFile(require.resolve('./settings'));
    loadTestFile(require.resolve('./span_links'));
    loadTestFile(require.resolve('./suggestions'));
    loadTestFile(require.resolve('./throughput'));
    loadTestFile(require.resolve('./time_range_metadata'));
    loadTestFile(require.resolve('./traces'));
    loadTestFile(require.resolve('./transactions'));
  });
}
