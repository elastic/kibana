/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('detection engine api security and spaces enabled - Group 1', function () {
    // !!NOTE: For new routes that do any updates on a rule, please ensure that you are including the legacy
    // action migration code. We are monitoring legacy action telemetry to clean up once we see their
    // existence being near 0.

    loadTestFile(require.resolve('./aliases'));
    loadTestFile(require.resolve('./add_actions'));
    loadTestFile(require.resolve('./update_actions'));
    loadTestFile(require.resolve('./add_prepackaged_rules'));
    loadTestFile(require.resolve('./check_privileges'));
    loadTestFile(require.resolve('./create_index'));
    loadTestFile(require.resolve('./create_rules'));
    loadTestFile(require.resolve('./preview_rules'));
    loadTestFile(require.resolve('./create_rules_bulk'));
    loadTestFile(require.resolve('./create_new_terms'));
    loadTestFile(require.resolve('./create_rule_exceptions'));
    loadTestFile(require.resolve('./delete_rules'));
    loadTestFile(require.resolve('./delete_rules_bulk'));
    loadTestFile(require.resolve('./export_rules'));
    loadTestFile(require.resolve('./find_rules'));
    loadTestFile(require.resolve('./find_rule_exception_references'));
    loadTestFile(require.resolve('./get_prepackaged_rules_status'));
    loadTestFile(require.resolve('./get_rule_management_filters'));
  });
};
