/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ loadTestFile }: FtrProviderContext) {
  describe('transform', function() {
    this.tags(['ciGroup9', 'transform']);

    loadTestFile(require.resolve('./creation_index_pattern'));
    loadTestFile(require.resolve('./creation_saved_search'));
  });
}
