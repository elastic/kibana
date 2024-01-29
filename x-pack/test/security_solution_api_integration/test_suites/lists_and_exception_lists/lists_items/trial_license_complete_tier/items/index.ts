/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../ftr_provider_context';
export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Value Lists - Items APIs', function () {
    loadTestFile(require.resolve('./create_list_items'));
    loadTestFile(require.resolve('./patch_list_items'));
    loadTestFile(require.resolve('./patch_list_items_migrations'));
    loadTestFile(require.resolve('./read_list_items'));
    loadTestFile(require.resolve('./update_list_items'));
    loadTestFile(require.resolve('./update_list_items_migrations'));
    loadTestFile(require.resolve('./delete_list_items'));
    loadTestFile(require.resolve('./find_list_items'));
    loadTestFile(require.resolve('./import_list_items'));
    loadTestFile(require.resolve('./import_list_items_migrations'));
    loadTestFile(require.resolve('./export_list_items'));
  });
}
