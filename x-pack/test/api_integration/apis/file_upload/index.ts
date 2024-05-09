/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('File upload', function () {
    loadTestFile(require.resolve('./has_import_permission'));
    loadTestFile(require.resolve('./index_exists'));
    loadTestFile(require.resolve('./preview_index_time_range'));
  });
}
