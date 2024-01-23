/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Saved Objects Management', function () {
    this.tags('skipMKI');
    loadTestFile(require.resolve('./find'));
    loadTestFile(require.resolve('./scroll_count'));
    loadTestFile(require.resolve('./bulk_get'));
    loadTestFile(require.resolve('./export_transform'));
    loadTestFile(require.resolve('./import_warnings'));
    loadTestFile(require.resolve('./hidden_types'));
    loadTestFile(require.resolve('./visible_in_management'));
    loadTestFile(require.resolve('./hidden_from_http_apis'));
  });
}
