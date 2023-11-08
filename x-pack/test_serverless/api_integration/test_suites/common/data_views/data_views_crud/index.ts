/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('index_pattern_crud', () => {
    loadTestFile(require.resolve('./create_data_view'));
    loadTestFile(require.resolve('./get_data_view'));
    loadTestFile(require.resolve('./delete_data_view'));
    loadTestFile(require.resolve('./update_data_view'));
    loadTestFile(require.resolve('./get_data_views'));
  });
}
