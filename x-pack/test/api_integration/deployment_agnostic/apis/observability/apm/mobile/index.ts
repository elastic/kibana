/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Mobile', () => {
    loadTestFile(require.resolve('./crashes/crash_group_list.spec.ts'));
    loadTestFile(require.resolve('./crashes/distribution.spec.ts'));
    loadTestFile(require.resolve('./errors/group_id_samples.spec.ts'));
    loadTestFile(require.resolve('./mobile_detailed_statistics_by_field.spec.ts'));
    loadTestFile(require.resolve('./mobile_filters.spec.ts'));
    loadTestFile(require.resolve('./mobile_http_requests_timeseries.spec.ts'));
    loadTestFile(require.resolve('./mobile_location_stats.spec.ts'));
    loadTestFile(require.resolve('./mobile_main_statistics_by_field.spec.ts'));
    loadTestFile(require.resolve('./mobile_most_used_chart.spec.ts'));
    loadTestFile(require.resolve('./mobile_sessions_timeseries.spec.ts'));
    loadTestFile(require.resolve('./mobile_stats.spec.ts'));
    loadTestFile(require.resolve('./mobile_terms_by_field.spec.ts'));
  });
}
