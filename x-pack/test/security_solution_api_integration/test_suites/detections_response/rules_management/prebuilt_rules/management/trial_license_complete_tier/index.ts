/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Rules Management - Prebuilt Rules - Prebuilt Rules Management', function () {
    loadTestFile(require.resolve('./get_prebuilt_rules_status'));
    loadTestFile(require.resolve('./get_prebuilt_timelines_status'));
    loadTestFile(require.resolve('./install_prebuilt_rules'));
    loadTestFile(require.resolve('./install_prebuilt_rules_with_historical_versions'));
    loadTestFile(require.resolve('./upgrade_prebuilt_rules'));
    loadTestFile(require.resolve('./upgrade_prebuilt_rules_with_historical_versions'));
    loadTestFile(require.resolve('./fleet_integration'));
    loadTestFile(require.resolve('./upgrade_review_prebuilt_rules'));
  });
};
