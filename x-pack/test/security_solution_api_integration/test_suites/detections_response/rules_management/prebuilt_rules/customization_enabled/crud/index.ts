/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('CRUD', function () {
    loadTestFile(require.resolve('./bootstrap_prebuilt_rules'));
    loadTestFile(require.resolve('./get_prebuilt_rules_status'));
    loadTestFile(require.resolve('./install_mocked_prebuilt_rule_assets'));
    loadTestFile(require.resolve('./legacy/get_prebuilt_timelines_status'));
  });
};
