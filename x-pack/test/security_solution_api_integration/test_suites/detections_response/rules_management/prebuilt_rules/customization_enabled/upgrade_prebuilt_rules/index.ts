/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Upgrade prebuilt rules', function () {
    loadTestFile(require.resolve('./review_prebuilt_rules_upgrade'));
    loadTestFile(require.resolve('./bulk_upgrade_all_prebuilt_rules'));
    loadTestFile(require.resolve('./bulk_upgrade_selected_prebuilt_rules'));
    loadTestFile(require.resolve('./upgrade_single_prebuilt_rule'));
  });
};
