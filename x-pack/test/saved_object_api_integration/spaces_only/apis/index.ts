/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('saved objects spaces only enabled', function () {
    this.tags('ciGroup5');

    loadTestFile(require.resolve('./bulk_create'));
    loadTestFile(require.resolve('./bulk_get'));
    loadTestFile(require.resolve('./bulk_update'));
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./export'));
    loadTestFile(require.resolve('./find'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./import'));
    loadTestFile(require.resolve('./resolve_import_errors'));
    loadTestFile(require.resolve('./resolve'));
    loadTestFile(require.resolve('./update'));
  });
}
