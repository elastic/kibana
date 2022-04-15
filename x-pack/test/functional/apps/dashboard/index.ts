/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('dashboard', function () {
    describe('', function () {
      this.tags('ciGroup31');
      loadTestFile(require.resolve('./feature_controls'));
      loadTestFile(require.resolve('./preserve_url'));
      loadTestFile(require.resolve('./reporting'));
      loadTestFile(require.resolve('./drilldowns'));
    });

    describe('', function () {
      this.tags('ciGroup19');
      loadTestFile(require.resolve('./sync_colors'));
      loadTestFile(require.resolve('./_async_dashboard'));
      loadTestFile(require.resolve('./dashboard_tagging'));
      loadTestFile(require.resolve('./dashboard_lens_by_value'));
      loadTestFile(require.resolve('./dashboard_maps_by_value'));
      loadTestFile(require.resolve('./panel_titles'));

      loadTestFile(require.resolve('./migration_smoke_tests/lens_migration_smoke_test'));
      loadTestFile(require.resolve('./migration_smoke_tests/controls_migration_smoke_test'));
      loadTestFile(require.resolve('./migration_smoke_tests/visualize_migration_smoke_test'));
      loadTestFile(require.resolve('./migration_smoke_tests/tsvb_migration_smoke_test'));
    });
  });
}
