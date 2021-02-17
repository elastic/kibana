/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('data frame analytics', function () {
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./get_spaces'));
    loadTestFile(require.resolve('./update_spaces'));
    loadTestFile(require.resolve('./delete_spaces'));
  });
}
