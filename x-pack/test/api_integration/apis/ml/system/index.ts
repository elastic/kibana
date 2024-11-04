/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('system', function () {
    loadTestFile(require.resolve('./capabilities'));
    loadTestFile(require.resolve('./space_capabilities'));
    loadTestFile(require.resolve('./index_exists'));
    loadTestFile(require.resolve('./info'));
    loadTestFile(require.resolve('./node_count'));
    loadTestFile(require.resolve('./has_privileges'));
  });
}
