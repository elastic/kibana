/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext) => {
  describe('InfraOps App (part 2)', function () {
    describe('Metrics UI (part 2)', function () {
      // keep this test last as it can potentially break other tests
      loadTestFile(require.resolve('./metrics_source_configuration'));
    });

    describe('Logs UI', function () {
      loadTestFile(require.resolve('./logs/log_entry_categories_tab'));
      loadTestFile(require.resolve('./logs/log_entry_rate_tab'));
      loadTestFile(require.resolve('./logs/link_to'));
      loadTestFile(require.resolve('./logs/ml_job_id_formats/tests'));
    });
  });
};
