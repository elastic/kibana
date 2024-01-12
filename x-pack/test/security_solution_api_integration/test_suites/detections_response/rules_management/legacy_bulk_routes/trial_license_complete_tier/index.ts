/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Rules Management - Legacy rule bulk routes APIs', function () {
    loadTestFile(require.resolve('./create_rules_bulk'));
    loadTestFile(require.resolve('./delete_rules_bulk_legacy'));
    loadTestFile(require.resolve('./delete_rules_bulk'));
    loadTestFile(require.resolve('./patch_rules_bulk'));
    loadTestFile(require.resolve('./update_rules_bulk'));
  });
}
