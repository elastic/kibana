/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('management', function () {
    this.tags(['ciGroup2']);

    loadTestFile(require.resolve('./create_index_pattern_wizard'));
    loadTestFile(require.resolve('./feature_controls'));
  });
}
