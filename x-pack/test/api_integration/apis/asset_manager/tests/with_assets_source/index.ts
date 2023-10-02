/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Asset Manager API Endpoints - with assets source', () => {
    loadTestFile(require.resolve('./basics'));
    loadTestFile(require.resolve('./sample_assets'));
    loadTestFile(require.resolve('./assets'));
    loadTestFile(require.resolve('./assets_diff'));
    loadTestFile(require.resolve('./assets_related'));
  });
}
