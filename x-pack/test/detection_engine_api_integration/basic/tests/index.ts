/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('detection engine api basic license', function () {
    this.tags('ciGroup1');

    loadTestFile(require.resolve('./add_prepackaged_rules'));
    loadTestFile(require.resolve('./create_rules'));
    loadTestFile(require.resolve('./create_rules_bulk'));
    loadTestFile(require.resolve('./delete_rules'));
    loadTestFile(require.resolve('./delete_rules_bulk'));
    loadTestFile(require.resolve('./export_rules'));
    loadTestFile(require.resolve('./find_rules'));
    loadTestFile(require.resolve('./get_prepackaged_rules_status'));
    loadTestFile(require.resolve('./import_rules'));
    loadTestFile(require.resolve('./read_rules'));
    loadTestFile(require.resolve('./update_rules'));
    loadTestFile(require.resolve('./update_rules_bulk'));
    loadTestFile(require.resolve('./patch_rules_bulk'));
    loadTestFile(require.resolve('./patch_rules'));
    loadTestFile(require.resolve('./query_signals'));
    loadTestFile(require.resolve('./open_close_signals'));
    loadTestFile(require.resolve('./import_timelines'));
    loadTestFile(require.resolve('./update_rac_alerts'));
  });
};
