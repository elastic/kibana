/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('detection engine api security and spaces enabled', function () {
    describe('', function () {
      this.tags('ciGroup11');

      loadTestFile(require.resolve('./add_actions'));
      loadTestFile(require.resolve('./add_prepackaged_rules'));
      loadTestFile(require.resolve('./create_rules'));
      loadTestFile(require.resolve('./create_rules_bulk'));
      loadTestFile(require.resolve('./create_threat_matching'));
      loadTestFile(require.resolve('./create_exceptions'));
      loadTestFile(require.resolve('./delete_rules'));
      loadTestFile(require.resolve('./delete_rules_bulk'));
      loadTestFile(require.resolve('./export_rules'));
      loadTestFile(require.resolve('./find_rules'));
      loadTestFile(require.resolve('./find_statuses'));
      loadTestFile(require.resolve('./generating_signals'));
      loadTestFile(require.resolve('./get_prepackaged_rules_status'));
      loadTestFile(require.resolve('./import_rules'));
      loadTestFile(require.resolve('./read_rules'));
      loadTestFile(require.resolve('./update_rules'));
      loadTestFile(require.resolve('./update_rules_bulk'));
      loadTestFile(require.resolve('./patch_rules_bulk'));
      loadTestFile(require.resolve('./patch_rules'));
      loadTestFile(require.resolve('./query_signals'));
      loadTestFile(require.resolve('./open_close_signals'));
      loadTestFile(require.resolve('./get_signals_migration_status'));
      loadTestFile(require.resolve('./create_signals_migrations'));
      loadTestFile(require.resolve('./finalize_signals_migrations'));
      loadTestFile(require.resolve('./delete_signals_migrations'));
    });

    // That split here enable us on using a different ciGroup to run the tests
    // listed on ./exception_operators_data_types/index
    describe('', function () {
      loadTestFile(require.resolve('./exception_operators_data_types/index'));
    });
  });
};
