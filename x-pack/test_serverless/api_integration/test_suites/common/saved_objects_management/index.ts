/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('saved objects management apis', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('./find'));
    loadTestFile(require.resolve('./bulk_get'));
    loadTestFile(require.resolve('./bulk_delete'));
    loadTestFile(require.resolve('./scroll_count'));
    loadTestFile(require.resolve('./relationships'));
  });
}
