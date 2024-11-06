/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Custom Threshold Rule', function () {
    loadTestFile(require.resolve('./avg_pct_fired'));
    loadTestFile(require.resolve('./avg_pct_no_data'));
    loadTestFile(require.resolve('./documents_count_fired'));
    loadTestFile(require.resolve('./custom_eq_avg_bytes_fired'));
    loadTestFile(require.resolve('./group_by_fired'));
    loadTestFile(require.resolve('./p99_pct_fired'));
  });
}
