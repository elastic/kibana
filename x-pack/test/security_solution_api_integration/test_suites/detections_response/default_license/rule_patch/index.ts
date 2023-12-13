/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Rule Patch API', function () {
    loadTestFile(require.resolve('./patch_rules_bulk'));
    loadTestFile(require.resolve('./patch_rules'));
    loadTestFile(require.resolve('./patch_rules_ess'));
  });
}
