/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('serverless observability API', function () {
    loadTestFile(require.resolve('./fleet'));
    loadTestFile(require.resolve('./snapshot_telemetry'));
    loadTestFile(require.resolve('./apm_api_integration/feature_flags.ts'));
    loadTestFile(require.resolve('./threshold_rule/avg_pct_fired'));
    loadTestFile(require.resolve('./threshold_rule/avg_pct_no_data'));
    loadTestFile(require.resolve('./threshold_rule/documents_count_fired'));
    loadTestFile(require.resolve('./threshold_rule/custom_eq_avg_bytes_fired'));
    loadTestFile(require.resolve('./threshold_rule/group_by_fired'));
    loadTestFile(require.resolve('./cases/post_case'));
    loadTestFile(require.resolve('./cases/find_cases'));
    loadTestFile(require.resolve('./cases/get_case'));
  });
}
