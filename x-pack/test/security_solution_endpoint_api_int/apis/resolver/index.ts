/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { loadTestFile } = providerContext;

  describe('Resolver tests', () => {
    loadTestFile(require.resolve('./entity_id'));
    loadTestFile(require.resolve('./children'));
    loadTestFile(require.resolve('./tree'));
    loadTestFile(require.resolve('./alerts'));
    loadTestFile(require.resolve('./events'));
  });
}
