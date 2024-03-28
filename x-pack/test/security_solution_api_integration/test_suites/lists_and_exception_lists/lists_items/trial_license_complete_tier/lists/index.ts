/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../ftr_provider_context';
export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Value Lists - Lists APIs', function () {
    loadTestFile(require.resolve('./create_lists'));
    loadTestFile(require.resolve('./create_lists_index'));
    loadTestFile(require.resolve('./create_lists_index_migrations'));
    loadTestFile(require.resolve('./patch_lists'));
    loadTestFile(require.resolve('./patch_lists_migrations'));
    loadTestFile(require.resolve('./read_lists'));
    loadTestFile(require.resolve('./update_lists'));
    loadTestFile(require.resolve('./update_lists_migrations'));
    loadTestFile(require.resolve('./delete_lists'));
    loadTestFile(require.resolve('./find_lists'));
    loadTestFile(require.resolve('./find_lists_by_size'));
  });
}
