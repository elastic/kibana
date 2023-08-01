/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('AIOps', function () {
    this.tags(['aiops']);

    loadTestFile(require.resolve('./log_rate_analysis_full_analysis'));
    loadTestFile(require.resolve('./log_rate_analysis_groups_only'));
    loadTestFile(require.resolve('./log_rate_analysis_no_index'));
  });
}
