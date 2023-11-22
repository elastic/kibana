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

    loadTestFile(require.resolve('./create_rules_bulk'));
    loadTestFile(require.resolve('./delete_rules'));
    loadTestFile(require.resolve('./delete_rules_bulk'));
    loadTestFile(require.resolve('./export_rules'));
    loadTestFile(require.resolve('./find_rules'));
    loadTestFile(require.resolve('./get_rule_management_filters'));
  });
};
