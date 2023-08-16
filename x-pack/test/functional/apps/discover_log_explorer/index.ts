/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Discover Log-Explorer profile', function () {
    loadTestFile(require.resolve('./columns_selection'));
    loadTestFile(require.resolve('./customization'));
    loadTestFile(require.resolve('./dataset_selection_state'));
    loadTestFile(require.resolve('./dataset_selector'));
  });
}
